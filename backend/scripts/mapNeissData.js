import launchMongo from "../src/db";
import ScrapService from "../src/services/scrape.service";
import CategoryFinderService from "../src/services/category.finder.service";
const count = process.env.COUNT || 10

launchMongo().then(async db => {
    let scraper = new ScrapService(db)
    let service = new CategoryFinderService(db, scraper)
    await service.buildNeissCodeTable()
    await service.buildProductCodeAmazonRelationships(count)
    process.exit(0)
})