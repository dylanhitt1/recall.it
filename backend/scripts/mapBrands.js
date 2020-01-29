import BrandMapper, { BrandMapperModes } from '../src/services/brand.mapper.service'
import inquirer from 'inquirer'
import Mongo from "mongodb";

let keepGoing = true;

let choices = {
    build: 'Build brand table',
    clean: 'Clean mappings',
    fix: 'Fix individual mapping',
    sync: 'Sync brands',
    testBrand: 'Resolve brand string',
    cancel: 'Quit'
}

process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error.message)
    console.log(error.stack)
    process.exit(1)
})

function getDB() {
    return new Promise(resolve => {
        let dbName = 'recall_it';
        let url = ``;
        Mongo.MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            resolve(db.db(dbName))
        });
    })
}


async function start() {

    const db = await getDB()
    const Mapper = new BrandMapper(db)
    Mapper.mode = BrandMapperModes.CLI

    while (keepGoing) {
        let answer = await inquirer.prompt({
            name: 'action',
            message: 'What are we doing',
            type: 'list',
            choices: Object.values(choices)
        });

        switch (answer['action']) {
            case choices.build:
                await Mapper.truncate()
                await Mapper.mapBrands()
                break
            case choices.clean:
                await Mapper.cleanBrands()
                break
            case choices.fix:
                await Mapper.findAndFix()
                break
            case choices.sync:
                await Mapper.syncAll()
                break
            case choices.testBrand:
                await Mapper.testBrand()
                break
            case choices.cancel:
                keepGoing = false
                break
        }
    }
}

start().then(() => {
    console.log('Done')
    process.exit()
})
