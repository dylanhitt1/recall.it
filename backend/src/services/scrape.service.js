const Db = require('mongodb').Db;
const cols = require('../config/server').collections;
const Nightmare = require('nightmare');

export default class ScrapeService {
    db: Db;

    constructor(db) {
        if (db === undefined) {
            throw new Error('Must provide a db connection')
        }
        this.db = db;
    }

    scrapePage = async (productUrl) => {
        let myNightMare = new Nightmare({
            waitTimeout: 5000
        });
        console.log(`Scraping Amazon product page ${productUrl}`);
        const amznProduct = await myNightMare
            .goto(productUrl)
            .wait('#wayfinding-breadcrumbs_container')
            .evaluate(() => {

                let anchors = document.getElementById('wayfinding-breadcrumbs_container')
                    .getElementsByTagName('a');

                let categories = Array.from(anchors).map(x => x.innerText.trim());

                let asinNumber;

                let dp = document.location.href.indexOf('dp/')
                if(dp >=0) {
                    let start = document.location.href.substr(dp + 3)
                    let indexNextSlash = start.indexOf('/')
                    asinNumber = start.substr( 0, indexNextSlash)
                }

                if(!asinNumber && document.getElementById('prodDetails')) {
                    let tableStrings = Array.from(document.getElementById('prodDetails')
                        .querySelectorAll('th, td'))
                        .map(element => element.innerText);

                    asinNumber = tableStrings[tableStrings.indexOf('ASIN') + 1]
                }

                if(!asinNumber && document.getElementById('detail-bullets')) {
                    Array.from(document.getElementById('detail-bullets')
                        .querySelectorAll('li'))
                        .map(element => element.innerText)
                        .forEach(x => {
                            if(x.substr(0, 4) === 'ASIN') {
                                asinNumber = x.substr(x.indexOf(' '), x.length - x.indexOf(' ')).trim()
                            }
                        })
                }

                return {
                    category: categories.length > 0 ? categories[categories.length -1]: undefined,
                    categories,
                    asinNumber
                };
            });
        await myNightMare.end();
        return amznProduct;
    };

    /*
        Function will add asin number to a found document
        or will insert a new document with amzn category and asin number
     */
    insertAsin = async (amznProduct) => {
        let result = await this.db.collection(cols.MAPPING_DATA).updateOne(
            {'amazonItems': amznProduct.category},
            {"$addToSet": {"asins": amznProduct.asinNumber}},
            {upsert: true}
            );

        return result;
    };

    insertAsinV2 = async (amazonProduct) => {
        //Insert into amazon items
        return this.db.collection(cols.AMAZON_ITEMS).updateOne(
            {'asin': amazonProduct.asinNumber},
            {'$set': {amznCategories: amazonProduct.categories}},
            {upsert: true}
        )
    }

    findCategoryMatchV2 = async(asin) => {
        let scrapedProduct = await this.scrapePage(`https://www.amazon.com/dp/${asin}`);
        let result = await this.insertAsinV2(scrapedProduct);

        //if no mappings exist insert new document return no results
        if (result.result.hasOwnProperty('upserted')) {
            console.log(scrapedProduct.category + ' were added to the collection with ' +
                'asin: ' + scrapedProduct.asinNumber);
            return scrapedProduct;
        }

        return {
            asin,
            categories: scrapedProduct.categories
        }
    }



    findCategoryMatch = async (asinNumber) => {
        let amznProduct = await this.scrapePage(`https://www.amazon.com/dp/${asinNumber}`);
        let result = await this.insertAsin(amznProduct);

        //if no mappings exist insert new document return no results
        if (result.result.hasOwnProperty('upserted')) {
            console.log(amznProduct.category + ' were added to the collection with ' +
                'asin: ' + amznProduct.asinNumber);
            return amznProduct;
        }
        return amznProduct;
    }
}