import CategoryFinder from '../src/services/category.finder.service';
import Scrape from '../src/services/scrape.service';
import inquirer from 'inquirer'



import Mongo from 'mongodb'

// 
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

let keepGoing = true;

let message = 'Please help the CPSC clean their data.. Please';
let whoMessage = "Who are you?";
let howManyMessage = "How many?";
let names = {
    Dylan: 'Dylan',
    Jonathan: 'Jonathan'
}
let choices = {
    build: 'Build Category Tables',
    cancel: 'Quit'
};

process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error.message);
    console.log(error.stack);
    process.exit(1)
});

async function start() {
    const db = await getDB();
    const scraper = new Scrape(db);
    const finder = new CategoryFinder(db, scraper);
    finder.createIndexes();

    while (keepGoing) {

        let answer1 = await inquirer.prompt({
            name: 'who',
            message: whoMessage,
            type: 'list',
            choices: Object.values(names)
        });

        let answer2 = await inquirer.prompt({
            name: 'action',
            message: howManyMessage,
            type: 'input',
        });

        let answer3 = await inquirer.prompt({
            name: 'action',
            message: message,
            type: 'list',
            choices: Object.values(choices)
        });

        switch (answer3['action']) {
            case choices.build:
                await finder.insertRecallCategories(undefined, answer1['who'], parseInt(answer2['action']));
                break;
            case choices.cancel:
                keepGoing = false;
                break;
        }
    }
}

start().then(() => {
    console.log('Thank you for your time today');
    process.exit()
})