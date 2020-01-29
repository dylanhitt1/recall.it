import launchMongo from "../db";
import ScrapService from "./scrape.service";
import _ from 'lodash'
import dataTree from 'data-tree'

const Db = require('mongodb').Db;
const cols = require('../config/server').collections;
const Nightmare = require('nightmare');

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function randomSleep() {
    let interval = getRandomIntInclusive(500, 5000)
    return new Promise(resolve => setTimeout(resolve, interval))
}

export default class CategoryFinderService {
    forceUpdate = false;
    db: Db;
    nightmare = new Nightmare({
        waitTimeout: 5000
    });
    baseAmznUrl = "https://www.amazon.com/s/ref=nb_sb_noss_1?field-keywords=";
    scrapeService

    constructor(db, scrapeService) {
        if (db === undefined || scrapeService === undefined) {
            throw new Error('Must provide a db connection + scrape service');
        }
        this.db = db;
        this.scrapeService = scrapeService
    }

    createIndexes() {
        this.db.collection(cols.AMAZON_ITEMS).createIndex('asin', {background: true, unique: true, dropDups: true});
        this.db.collection(cols.RECALL_CATEGORIES).createIndex('productName', {
            background: true,
            unique: true,
            dropDups: true
        });
    }

    getAsin = async (productName) => {
        console.log('Opening Amazon');

        const asins = await this.nightmare
            .goto(this.baseAmznUrl + productName)
            .wait('[data-asin]')
            .evaluate(() => {
                return Array.from(
                    document.querySelectorAll('[data-asin].s-result-item'))
                    .map(element => element.getAttribute("data-asin"));
            });

        return asins;
    };

    getDistinctProducts = async (recallId = undefined, who = undefined, howMany = undefined) => {
        let count = await this.db.collection('restAPI').countDocuments();
        let index;
        let matchQuery;
        if (who === 'Dylan') {
            index = await this.db.collection('scriptCount').findOne({who: who});
            console.log(index);
            matchQuery = {$lte: Math.floor(count / 2)};
        } else if (who === 'Jonathan') {
            index = await this.db.collection('scriptCount').findOne({who: who});
            console.log(index);
            matchQuery = {$gt: Math.floor(count / 2)}
        } else {
            index = 0;
            howMany = count;  //all of them
            matchQuery = {$gt: 0}
        }

        let match = {'Products.Name': {$ne: ''}};

        if (recallId) {
            match['RecallID'] = recallId
        }

        if (!this.forceUpdate) {
            match['assignedCategory'] = {$exists: false}
        }

        console.log(`Your previous searches are being skipped`);
        console.log(`Searching for ${Math.min((howMany + index.count), count)} of ${(count / 2)}`);

        await this.db.collection('scriptCount').replaceOne(
            {who: who},
            {
                who: who,
                count: Math.min((howMany + index.count), count)
            }
        );

        return this.db.collection('restAPI').aggregate(
            [
                {$sort: {RecallID: 1}},
                {$match: {RecallID: matchQuery}},
                {$limit: Math.min((howMany + index.count), count)},
                {$skip: index.count}, //change this recycle through all previous searched items
                {$unwind: "$Products"},
                {$match: match},
                {
                    $group: {
                        _id: {'id': "$RecallID", 'ProductNames': '$Products.Name'}
                    }
                },
                {
                    $project:
                        {
                            RecallID: "$_id.id",
                            ProductName: '$_id.ProductNames'
                        }
                },
                {$sort: {RecallID: 1}}
            ]
        ).toArray();
    };

    asinExists = async (asin) => {
        return (await this.db.collection('amazonItems').findOne({asin})) !== null
    };

    insertAmznItems = async (asins) => {
        let validAsins = [];
        let promises = [];
        let object;

        console.log(`found ${asins.length} asin numbers`);

        let max = Math.min(asins.length, 5);

        for (let i = 0; i < max && i < asins.length; i++) {

            let asin = asins[i];
            try {

                //check to see if we need to do this
                if (await this.asinExists(asin)) {
                    validAsins.push(asins[i]);
                    console.log('ASIN found previously')
                    continue;
                }

                object = await this.scrapeService
                    .scrapePage(`https://www.amazon.com/dp/${asins[i]}`);


                let promise = this.db.collection('amazonItems').insertOne({
                    asin: asins[i],
                    amznCategories: object.categories
                });
                promises.push(promise);
                validAsins.push(asins[i])
            } catch (e) {
                max++;
                console.log('invalid asin', e.message);
            }

            if (validAsins.length === 10)
                break;
        }
        await Promise.all(promises);
        return validAsins;
    };

    insertRecallCategories = async (recallId, who = undefined, howMany = undefined) => {
        let indexStart = 0;
        console.log(`Resolving categories for ${howMany} recalls`);
        let products = await this.getDistinctProducts(recallId, who, howMany);
        let preprocessedProducts = await this.db.collection('recallCategories')
            .find({productName: {$in: products.map(p => p.ProductName)}}, {productName: 1}).toArray();

        let recallIds = new Set();

        console.log(`Found ${products.length} products.. Searching..`);

        for (let i = 0; i < products.length; i++) {
            let productName = products[i].ProductName;
            let asins;
            let validAsins;
            let exists = false;
            let index = _.findIndex(preprocessedProducts, (p) => p.productName === productName);

            if (index > -1) {
                exists = true;
                recallIds.add(products[i].RecallID);
                continue
            }

            console.log(`Creating categories for ${productName}`);

            try {
                asins = await this.getAsin(productName);
            } catch (e) {
                console.log('\terror getting asins...skipping', e.message);
                continue;
            }

            if (exists) {
                asins = _.difference(asins, preprocessedProducts[index].asins)
            }

            validAsins = await this.insertAmznItems(asins);
            console.log('\tretrieved valid asins...saving')

            try {
                await this.db.collection('recallCategories').insertOne({
                    productName: productName,
                    recallId: products[i].RecallID,
                    asins: validAsins
                });
            } catch (e) {
                console.log('Duplicated product name')
            }

            recallIds.add(products[i].RecallID);

            console.log(`Inserts for ${productName} complete!`)
        }

        //Resolve the category
        console.log('\tbuilding category mapping...');
        recallIds.forEach(async id => {
            await this.resolveRecallCategory(id)
        });
        console.log('\tcomplete')
    }

    resolveUnresolvedCategories = async () => {
        let recallIds = await this.db.collection('recallCategories').aggregate([
            {$match: {'resolved': {$exists: false}}},
            {$group: {_id: {'recallId': "$recallId"}}},
            {$sort: {'_id.recallId': 1}}
        ]).toArray()

        recallIds = recallIds.map(r => r._id.recallId)
        let promises = []
        recallIds.forEach(r => promises.push(this.resolveRecallCategory(r)))
        await Promise.all(promises)
    }

    getCategoryFromAsins = async (asins) => {

        //Load associated asin numbers
        let asinsToInspect = await this.db.collection('amazonItems')
            .find({asin: {$in: asins}})
            .toArray()


        let tree = dataTree.create()
        tree.insert({key: 'root', value: {}})

        try {
            asinsToInspect.forEach(a => {
                a.amznCategories.forEach((c, i) => {

                    let item = {
                        key: c,
                        value: {asin: a.asin, count: 1}
                    }

                    //Check and see if it already exists
                    // Search DFS
                    let node
                    node = tree.traverser().searchBFS(function (data) {

                        return data.key === c;
                    });


                    if (node) {
                        //Update with a new count
                        let data = node.data()
                        data.value = {...data.value, count: data.value.count + 1}
                        node.data(data)
                    } else {

                        if (i === 0) {
                            tree.insertTo(data => data.key === 'root', itesm)
                        } else {
                            tree.insertTo(data => data.key === a.amznCategories[i - 1], item)

                        }
                    }
                })
            })
        } catch (e) {
            console.log(e);
        }


        let bottomNodes = [], hierarchy = {}

        //Traverse starting from the bottom nodes
        tree.traverser().traverseDFS(function (node) {
            //Only looking at the children
            if (node.childNodes().length === 0) {
                bottomNodes.push(node)
            }
        });

        bottomNodes.forEach((node, i) => {
            let key = node.data().key
            hierarchy[key] = 0
            node.getAncestry().forEach(n => {
                hierarchy[key] += (n.data().value.count || 0)
            })

            let data = node.data()
            data.value = {...data.value, ancestryCount: hierarchy[key]}
            node.data(data)
        })

        bottomNodes.sort((a, b) => {
            return a.data().value.ancestryCount < b.data().value.ancestryCount
        })

        let path = bottomNodes[0].getAncestry().map(n => n.data().key)
            .reverse()
            .slice(1)

        return path
    }

    resolveRecallCategory = async (recallId) => {

        // let _id = mongo.ObjectId('5c46bd44b3da9c1639b5f645')
        // recallId = 3724

        let recallProducts = await this.db.collection('recallCategories')
            .find({recallId}).toArray()

        //Ensure that the number of product entries is equal to recall product count, else need to rerun the script
        let productCount = await this.db.collection('restAPI')
            .aggregate([
                {
                    $match: {'RecallID': recallId}
                },
                {
                    $unwind: '$Products'
                },
                {
                    $match: {'Products.Name': {$ne: ''}}
                },
            ])
            .toArray()

        if (productCount.length !== recallProducts.length) {
            //Missing product names
            console.log('missing some products for - ', recallId)
            return
            // await this.insertRecallCategories(recallId)

            recallProducts = await this.db.collection('recallCategories')
                .find({recallId}).toArray()
        }

        let asinsToInspect = _.uniq(_.flatten(recallProducts.map(r => r.asins)))
        let path = await this.getCategoryFromAsins(asinsToInspect)
        console.log('Highest rated path - ', recallId, path.join('\t'))
        return this.setCategoriesOnRecall(recallId, path)
    }

    setCategoriesOnRecall = async (recallId, categories) => {
        await this.db.collection('restAPI').updateOne({'RecallID': recallId}, {
            $unset: {'assignedCategory': ''}
        })

        this.db.collection('recallCategories').updateMany({'recallId': recallId}, {
            $set: {resolved: true}
        })

        return this.db.collection('restAPI').findOneAndUpdate({'RecallID': recallId}, {
            $set: {'assignedCategory': categories}
        })
    }

    //region NEISS -> CPSC mapping

    buildNeissCodeTable = async () => {


        //Find all ids of mappings in order to do a diff
        let currentProductCodes = (
            await this.db.collection(cols.NEISS_CODES)
                .find()
                .project({code: 1, _id: 0})
                .toArray()
        ).map(x => x.code)


        let consumerMappings = await this.db.collection(cols.CONSUMER_DATA)
            .aggregate([
                {
                    '$group': {
                        _id: {
                            "code": "$product.code",
                            "category": "$product.category",
                            'subCategory': "$product.subCategory"
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        'code': '$_id.code',
                        'category': '$_id.category',
                        'subCategory': '$_id.subCategory'
                    }
                },
                {'$sort': {code: 1}},
            ])
            .toArray()

        let codesToInsert = _.difference(consumerMappings.map(x => x.code), currentProductCodes)

        consumerMappings = _.keyBy(consumerMappings, 'code')

        if (codesToInsert.length > 0)
            await this.db.collection(cols.NEISS_CODES).insertMany(codesToInsert.map(c => consumerMappings[c]))
    }

    buildProductCodeAmazonRelationships = async (limit = 10) => {
        //Get all unique category and subcategories
        let codes = (await this.db.collection(cols.NEISS_CODES).aggregate([
            {$match: {'asins': {$eq: null}}},
            {$group: {_id: {category: '$category', subCategory: '$subCategory'}, codes: {$push: '$code'}}},
            {$project: {_id: 0, codes: '$codes', category: {$concat: ['$_id.category', ' ', '$_id.subCategory']}}},
            {$sort: {category: 1}}
        ]).toArray())

        //Get all the asins that we already have parsed
        let availableAmazonItems = _.keyBy(await this.db.collection(cols.AMAZON_ITEMS).find().project({
            asin: 1,
            _id: 0
        }).toArray(), 'asin')

        //Search amazon for each category + subcategory
        for (let i = 0; i < Math.min(codes.length, limit); i++) {
            let code = codes[i]

            //Search amazon for product numbers
            let asins = await this.getAsin(code.category)

            //Use all preprocessed asins first
            let associatedAsins = asins.reduce((a, c) => {
                if (availableAmazonItems[c]) a.push(c)
                return a
            }, [])

            //Search for the asin that are remaining
            const remainingAsins = _.difference(asins, associatedAsins)
            for (let x = 0; x < remainingAsins.length && associatedAsins.length <= 8; x++) {

                let amazonItem

                try {
                    amazonItem = await this.scrapeService.scrapePage(`https://www.amazon.com/dp/${remainingAsins[x]}`)
                } catch (e) {
                    console.log(`\terror with ${remainingAsins[x]}`)
                    continue
                }

                //Ensure that the delivered asin isn't already available
                if (!availableAmazonItems[amazonItem.asinNumber]) {
                    await this.db.collection(cols.AMAZON_ITEMS).insertOne({
                        asin: amazonItem.asinNumber,
                        amznCategories: amazonItem.categories
                    })
                }

                associatedAsins.push(amazonItem.asinNumber)

                //Memoize the current asin number (value doesn't matter)
                availableAmazonItems[amazonItem.asinNumber] = 1
            }

            //Set associated asins on the neiss product code
            await this.db.collection(cols.NEISS_CODES).updateMany(
                {code: {$in: code.codes}},
                {$set: {'asins': associatedAsins}}
            )

            //Assign the category
            console.log('\tassigning category for', code.category)
            await this.generateCategoryForNeissCodes(code.codes)
        }
    }

    generateCategoryForNeissCodes = async (codes) => {

        if (!Array.isArray(codes))
            throw new Error('Codes must be an array')

        if (codes.length === 0)
            throw new Error('Codes is empty')

        //Assumes that all the passed in codes have the same asins
        let neissProduct = await this.db.collection(cols.NEISS_CODES)
            .findOne({code: codes[0]})

        if (!neissProduct)
            throw new Error('NEISS code does not exist')

        let assignedCategory = await this.getCategoryFromAsins(neissProduct.asins)
        console.log('\thighest rated path - ' + assignedCategory.join('\t'))

        //Set the assigned category on all codes
        await this.db.collection(cols.NEISS_CODES)
            .updateMany(
                {code: {$in: codes}},
                {$set: {assignedCategory}}
            )
    }

    getProductCodesFromAmazonCategories = async (categories) => {

        const first = new RegExp(categories[0], 'i')
        const second = new RegExp(categories[categories.length - 1], 'i')

        //Search for all the first level categories
        let results = await this.db.collection(cols.NEISS_CODES)
            .find(
                {
                    $or: [
                        {'assignedCategory.0': {$regex: first}},
                        {'assignedCategory': {$regex: second}},
                    ]
                })
            .project({code: 1, assignedCategory: 1})
            .toArray()

        results = _.groupBy(results, r => {
            //Use more specific search option first
            if (second.test(r.assignedCategory.join('|')))
                return 'specific'
            return 'broad'
        })

        results = {
            specific: results.specific || [],
            broad: results.broad || [],
        }

        console.log(`NEISS matches - Found ${results.specific.length} specific results, ${results.broad.length} broad results by category`)

        results = results.specific.length > 5 ? {
                category: categories[categories.length - 1],
                results: _.uniq(results.specific.map(x => x.code))
            } :
            {
                category: categories[0],
                results: _.uniq(results.broad.map(x => x.code))
            }

        return results
    }


    //endregion
}























