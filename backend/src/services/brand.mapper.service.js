    import getDB from "../db";

const stopwords = require('stopwords').english;
const chalk = require('chalk');
const _ = require('lodash');
const natural = require("natural");
const inquirer = require('inquirer');
const ObjectID = require('mongodb').ObjectID;
const Db = require('mongodb').Db;
const Table = require('cli-table');
const levenshtein = require('fast-levenshtein');
const config = require('../config/server')
const cols = config.collections

export const BrandMapperModes = {
    CLI: 0,
    PROGRAMMATIC: 1
}

export default class BrandMapperService {

    db: Db = undefined
    mode: string = BrandMapperModes.PROGRAMMATIC

    constructor(db) {
        if (db === undefined) {
            throw new Error('Must provide a db connection')
        }

        this.originalCount = 0;
        this.mappedCount = 0;
        this.db = db

        // this.db.createIndex('')
    }

    /**
     *
     * @returns {Promise<*>}
     */
    mapBrands() {
        return this.db.collection(cols.REST_API).aggregate([
            {
                '$project': {
                    '_id': '$Manufacturers.Name'
                }
            },
            {
                '$unwind': '$_id'
            },
            {
                '$group': {_id: '$_id'}
            },
            {
                '$sort': {_id: 1}
            }
        ])
            .toArray()
            .then(docs => {
                docs.forEach(this.generateBrandOptions);
                docs = _.sortBy(docs, 'mod');
                this.originalCount = docs.length;
                return docs;
            })
            .then(this.groupByMod.bind(this))
            .then(this.log.bind(this))
            .then(this.pushToDb.bind(this))
            .then(this.printSummary.bind(this))
    };

    async truncate() {
        await this.db.collection(cols.REST_API).updateMany({}, {
            $unset: {'Manufacturers.assignedId': ''}
        })

        await this.db.collection('brands').deleteMany()
    }

    async findAndFix() {

        inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
        let answer = await inquirer.prompt([{
            type: 'autocomplete',
            name: 'head',
            message: 'What head would you like to edit',
            source: async (answersSoFar, input) => {
                let r = await this.db.collection('brands').find({head: new RegExp(input, 'ig')}).toArray();
                return r.map(b => b.head);
            }
        }]);

        let brand = await this.db.collection('brands').findOne({head: answer['head']});
        await this.cleanBrand(brand)
    }

    async cleanBrands() {
        let question = [
            {
                type: 'confirm',
                name: 'force',
                message: 'Search for brands that are already validated?',
                default: false,
            },
            {
                type: 'input',
                name: 'query',
                message: 'Where would you like to start? [Enter first letters]'
            }
        ];

        let prompt = inquirer.createPromptModule();

        let answer = await prompt(question);

        let query = {
            $and: [
                {
                    head: {$regex: new RegExp(`^${answer.query}`)},
                },
                {
                    verified: {$eq: false}
                }
            ]
        };

        if (answer['force']) {
            query = {
                head: {$regex: new RegExp(`^${answer.query}`)}
            };
        }

        let searchResults = await this.db.collection('brands')
            .find(query)
            .sort({'head': 1})
            .toArray();


        let excludeIds = [];
        const requeryAfterChanges = async () => {
            searchResults = await this.db.collection('brands')
                .find(query)
                .sort({'head': 1})
                .toArray();

            searchResults = searchResults.filter(result => {
                return excludeIds.indexOf(result.head) === -1;
            })
        };

        console.log(`${chalk.green(`Found ${searchResults.length} brands`)}`);

        while (searchResults.length > 0) {
            let brand = searchResults[0];
            await this.cleanBrand(brand);
            excludeIds.push(brand.head);
            await requeryAfterChanges();
        }
    }

    async cleanBrand(brand) {
        let prompt = inquirer.createPromptModule();
        let prefix = "\t";
        console.log(`${prefix}Cleaning ` + chalk.yellow(`${brand.head}`));
        prefix += '\t';

        let question = {
            similarBrands: {
                type: 'checkbox',
                message: 'Are any of the following equivalent brands',
                name: 'equivalent',
                choices: async () => {
                    return (await this.getSimilarBrands(brand))
                        .map(b => ({
                            name: b.matches.original,
                            checked: false
                        }))
                }
            },
            addManual: {
                message: 'Enter matching brand',
                name: 'match',
                validate: async (head) => {
                    if (await this.checkIfHeadExists(head)) {
                        return 'Provided head already exists';
                    } else {
                        return true;
                    }
                }
            }
        };

        const fixCurrentMapping = async () => {

            if (brand.matches.length === 1) {
                console.log(prefix + chalk.red('Only one match for brand found'));
                return;
            }

            let question = {
                type: 'checkbox',
                message: 'Are all the following equivalent brands?',
                name: 'selected',
                choices: brand.matches.map(b => ({
                    name: b.original,
                    checked: true
                }))
            };

            //Check for current correct
            let answer = await prompt(question);
            let selected = answer.selected;
            await this.verifyCurrentBrand(brand, selected);
        };

        const findSimilarBrands = async () => {
            //Check for continue and similar brands
            prompt = inquirer.createPromptModule();
            let answer = await prompt(question.similarBrands);
            await this.saveEquivalentBrands(brand, answer['equivalent'])
        };

        const addManualMatch = async () => {
            prompt = inquirer.createPromptModule();
            let answer = await prompt(question.addManual);
            await this.saveEquivalentBrands(brand, [answer['match']])
        };

        let choices;

        const promptAction = async () => {
            choices = {
                skip: 'Skip',
                fixMapping: `Fix current mapping (${brand.matches.length})`,
                findSimilar: 'Find similar brands',
                manual: 'Add new brand name',
                list: 'List matches'
            };

            if (brand.matches.length === 1) {
                choices.fixMapping = {
                    name: `Fix current mapping (${brand.matches.length})`,
                    disabled: 'Only one mapping'
                }
            }

            return await inquirer.prompt([
                {
                    type: 'list',
                    name: 'type',
                    message: 'What do you want to do',
                    choices: Object.values(choices)
                }
            ]);
        };

        let keepGoing = true;

        while (keepGoing) {
            let action = await promptAction();
            switch (action.type) {
                case choices.skip:
                    keepGoing = false;
                    break;
                case choices.fixMapping:
                    await fixCurrentMapping();
                    break;
                case choices.findSimilar:
                    await findSimilarBrands();
                    break;
                case choices.manual:
                    await addManualMatch();
                    break;
                case choices.list:
                    this.listMatches(brand);
                    break;
            }
        }
    }

    async verifyCurrentBrand(brand, selected) {
        if (selected.length !== brand.matches.length) {
            let extracted = _.filter(brand.matches, (m => {
                return selected.indexOf(m.original) === -1
            }));

            brand.matches = selected.map(s => {
                return this.generateBrandOptions({_id: s})
            });

            brand.verified = true;

            await this.updateBrand(brand);

            for (let e in extracted) {
                await this.saveExtractedBrand(extracted[e])
            }
        }
    }

    async saveEquivalentBrands(brand, equivalents) {

        if (equivalents.length === 0)
            return;

        equivalents = equivalents.map(e => {
            return e.trim();
        });

        //Pull all equivalents
        await this.db.collection('brands').updateMany({}, {
            $pull: {
                matches: {original: {$in: equivalents}}
            }
        });

        //Remove empty heads
        await this.db.collection('brands').remove({
            matches: {$size: 0}
        });

        //Attach equivalents to brand
        equivalents = equivalents.map(e => {
            return this.generateBrandOptions({_id: e})
        });

        brand.matches = brand.matches.concat(equivalents);
        brand.verified = true;
        await this.updateBrand(brand);
        return brand
    }

    async saveExtractedBrand(b) {
        let prompt = inquirer.createPromptModule();
        let prefix = "\t";
        console.log(chalk.yellow(`${prefix}Extracting ${b.original}`));

        let question = [
            {
                message: 'Save extracted brand?',
                type: 'confirm',
                name: 'continue'
            },
            {
                message: 'What is the head of the extracted brand',
                name: 'head',
                when: (answers) => {
                    return answers['continue']
                },
                default: b.original,
                validate: async (head) => {
                    if (await this.checkIfHeadExists(head)) {
                        return 'Provided head already exists';
                    } else {
                        return true;
                    }
                }
            }
        ];

        let answer = await prompt(question);

        if (answer['continue']) {
            let brand = {
                _id: new ObjectID(),
                head: answer.head,
                matches: [b]
            };

            await this.updateBrand(brand)
        }
    }

    async checkIfHeadExists(head) {
        let count = await this.db.collection('brands').find({head: head}).count()
        return count > 0;
    }

    async updateBrand(b) {
        console.log('Updating brand...');
        this.buildSearchString(b);
        await this.db.collection('brands').replaceOne({_id: b._id}, b, {upsert: true})
        await this.syncDocuments([b])
    }

    buildSearchString(brand) {
        let options = new Set([brand.head]);
        brand.matches.forEach(m => {
            options.add(m.spaceless).add(m.characters)
        });

        brand.searchString = [...options].join('|')
    }

    groupByMod(docs) {
        let newResults = _.groupBy(docs, 'mod');
        this.mappedCount = Object.keys(newResults).length;
        return newResults;
    };

    async log(docs) {

        if (this.mode === BrandMapperModes.PROGRAMMATIC)
            return docs

        let print = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'print',
                message: 'Print Tentative Mappings?',
                default: false
            },
            {
                name: 'level',
                message: 'Minimum match level ie (1,2,3)',
                validate: (response) => {
                    if (_.isNumber(+response)) {
                        return true;
                    }

                    return 'Please enter a number'
                },
                when: (answers) => {
                    return answers['print']
                }
            }
        ]);

        if (print['print']) {
            _.forEach(docs, (subNames, newName) => {
                subNames = _.uniq(subNames, 'mod');
                if (subNames.length > +print['level']) {
                    console.log(chalk.green(newName), ...subNames.map(n => {
                        return `\n\t${n.original}\t->${n.stemless}\t->\t${n.spaceless}`
                    }));
                }

            });
        }
        return docs;
    };

    generateBrandOptions(doc) {
        doc.mod = doc._id.split(/\W+/)
            .filter(w => stopwords.indexOf(w.toLowerCase()) < 0)
            .join(' ')
            .toLowerCase()
            .trim();

        doc.characters = doc._id.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '');

        if (doc.mod.length === 0)
            doc.mod = doc._id.trim();

        doc.stemless = doc.mod.split(' ')
            .map((word) => {
                return natural.PorterStemmer.stem(word);
            })
            .join(' ');

        doc.spaceless = doc.stemless.split(' ').join('');

        doc.original = doc._id;
        delete doc._id;
        return doc;
    }

    listMatches(brand) {
        // instantiate
        let table = new Table({
            head: [`Original - ${brand.head}`, 'Mod', 'Characters', 'Spaceless', 'Stemless']
        });

        table.push(...brand.matches.map(m => [m.original, m.mod, m.characters, m.spaceless, m.stemless]));
        console.log(table.toString());
    }

    async getSimilarBrands(brand) {
        //Search for the first word
        let word = this.generateBrandOptions({_id: brand.head}).characters;

        let results = await this.db.collection('brands').aggregate([
            {
                $match: {
                    'matches.characters': {$regex: new RegExp(word, 'ig')},
                    _id: {$ne: brand._id}
                }
            },
            {
                $unwind: '$matches'
            }
        ]).toArray();

        return results;
    }

    commitOps(bulkObj) {
        return new Promise(resolve => {
            bulkObj.execute().then(resolve)
        })
    };

    async pushToDb(documents) {

        const updateDb = () => {
            let bulk = this.db.collection('brands').initializeUnorderedBulkOp();
            let promises = [], requiresCommit = false, i = 0;
            _.forEach(documents, (matches, head) => {
                i++;
                let b = {
                    head: head.toLowerCase(),
                    matches: matches,
                    verified: false,
                };

                this.buildSearchString(b);
                bulk.insert(b);
                requiresCommit = true;
                if (i > 0 && i % 5000 === 0) {
                    promises.push(this.commitOps(bulk));
                    bulk = this.db.collection('brands').initializeUnorderedBulkOp();
                    requiresCommit = false
                }
            });

            if (requiresCommit) {
                promises.push(this.commitOps(bulk))
            }

            return Promise.all(promises)
        };

        let choices = {
            nothing: 'Cancel',
            trash: 'Rebuild brand database',
            trashPassively: 'Rebuild and maintain verified brands',
        };

        let answer = {}

        if (this.mode === BrandMapperModes.CLI) {
            let prompt = inquirer.createPromptModule();
            answer = await prompt({
                type: 'list',
                name: 'action',
                message: 'What would you like to do',
                choices: Object.values(choices)
            });
        }

        switch (answer['action']) {
            case choices.trash:
                try {
                    await this.db.collection('brands').drop();
                } catch (e) {
                    //Ignore if the table never existed
                    if (e.message === 'ns not found') {
                    } else console.log(e);
                }
                break;
            case choices.trashPassively:
                //Drop all unverified heads
                await this.db.collection('brands').deleteMany({verified: false})
                //Get verified heads
                let heads = await this.db.collection('brands')
                    .find({}, {head: 1, _id: -1})
                    .toArray();

                let _documents = {};

                _.forEach(documents, (d, h) => {
                    if (_.find(heads, {'head': h.toLowerCase()}) === undefined)
                        _documents[h] = d;
                });

                documents = _documents;
                console.log(`Adding ${Object.keys(_documents).length} elements into database`);
                break;
            case choices.nothing:
                return;
        }

        return updateDb();
    };

    async syncAll() {
        let documents = await this.db.collection('brands').find({}).toArray();
        await this.syncDocuments(documents);
    }


    async syncDocuments(documents) {

        let bulk = this.db.collection(cols.REST_API).initializeUnorderedBulkOp();

        await this.db.collection(cols.REST_API).createIndex({'Manufacturers.Name': 1});

        const sync = doc => {
            let matches = doc.matches;
            for (let i = 0; i < matches.length; i++) {
                bulk.raw({
                    updateMany: {
                        update: {
                            $set: {
                                "Manufacturers.$[elem].assignedId": doc._id
                            }
                        },
                        arrayFilters: [{"elem.Name": {$eq: matches[i].original}}]
                    }
                });
            }
        };

        if (_.isArray(documents)) {
            console.log('This may take some time...Synchronizing\t', documents.length);
            documents.forEach(sync)
        } else {
            sync(documents)
        }

        let r = await bulk.execute();
        console.log(chalk.blue('Synchronization results'));
        console.log(JSON.stringify(r), '\n\n');
    };

    async syncRecallsToBrands() {
        console.log('Syncing...')

        let recalls = await this.db.collection(cols.REST_API)
            .aggregate([
                {'$unwind': {path: '$Manufacturers', includeArrayIndex: 'index'}},
            ])
            .toArray()

        let bulk = this.db.collection(cols.REST_API).initializeUnorderedBulkOp();
        for (let i = 0; i < recalls.length; i++) {
            let r = recalls[i]
            let name = r.Manufacturers.Name
            let resolved = await this.resolveBrand(name)
            if (resolved && resolved.reduced) {
                let id = resolved.reduced[0]._id
                bulk.find({_id: r._id})
                    .updateOne({
                            $set: {
                                [`Manufacturers.${r.index}.assignedId`]: id
                            }
                        }
                    )
            }
        }

        console.log('Executing...')

        return await bulk.execute()
    }

    printSummary() {
        console.log(`Went from: ${this.originalCount} to ${chalk.green(this.mappedCount)}\tMerged: ${chalk.blue(this.originalCount - this.mappedCount)}`);
    };

    async testBrand() {
        let answer = await inquirer.prompt({
            name: 'brand',
            message: 'Enter a brand name'
        });

        let matches = await this.resolveBrand(answer['brand']);

        if (matches.reduced.length === 0) {
            console.log(chalk.red('No matches found'));
        } else {
            console.log(chalk.green(`Matched [${answer['brand']}] to the following brands`));

            console.log('\n\t', chalk.magenta('Reduction Result'), matches.name);
            matches.reduced.forEach(this.listMatches);

            if (matches.other) {
                console.log('\t', chalk.blue('Other Results'));
                matches.other.forEach(this.listMatches)
            }
        }
    }

    async resolveBrand(brandString) {
        if (!brandString) return

        let brand = this.generateBrandOptions({_id: brandString});

        let matches = await this.db.collection('brands').find({
            $or: [
                {searchString: new RegExp(brand.characters, 'ig')},
                {searchString: new RegExp(brand.stemless, 'ig')},
            ]
        }).toArray();

        let deepSearch = this.deepSearchMatch(brand, matches);

        // console.log(`Found ${matches.length} maps...resolved to ${deepSearch.length}`);

        return {
            matches,
            options: brand,
            other: matches.filter(m => m.head !== deepSearch[0].head),
            reduced: deepSearch,
            name: _.get(deepSearch, '[0].matches[0].original', undefined)
        };
    }

    reduceByLevenshtein(source, brandMatches) {
        let distance;
        let table = {};

        brandMatches.forEach(m => {
            let id = m._id.toString();
            if (table[id] === undefined) {
                table[id] = {
                    data: m,
                    score: 2000
                }
            }

            m.matches.forEach(m => {
                distance = levenshtein.get(source.characters, m.characters, {useCollator: true});
                table[id].score = Math.min(table[id].score, distance)
            })
        });

        return _.sortBy(Object.values(table), 'score')[0]['data']
    }

    deepSearchMatch(brand, brandMatches) {
        //Check if exact match on any original strings

        if (brandMatches.length === 0) {
            return [];
        }

        if (brandMatches.length === 1) {
            return brandMatches;
        }

        for (let i = 0; i < brandMatches.length; i++) {

            let b2 = brandMatches[i];

            //Check for the original string
            let match = _.find(b2.matches, (m) => {
                return brand.original.toLowerCase() === m.original.toLowerCase();
            });

            if (match) return [b2];
        }

        let levensteinMatch = this.reduceByLevenshtein(brand, brandMatches)
        return [levensteinMatch];
    }
}