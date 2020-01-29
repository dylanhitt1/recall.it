import Server from './server'
import {getAppParser} from "./util";
import  launchMongo from "./db";
import chalk from 'chalk';
import BrandMapperService from "./services/brand.mapper.service";
import type {Services} from "./types/types";
import FeedbackService from "./services/feedback.service";
import SearchService from "./services/search.service";
import AdminUtils from "./services/admin.utils.service";
import ScrapeService from "./services/scrape.service";
import Cron from "node-cron";
import * as utils from "./utils";
import CategoryFinderService from "./services/category.finder.service";
const cols = require('./config/server').collections;

const args = getAppParser();

launchMongo().then((db) => {

    let services: Services = {
        brandMapper: new BrandMapperService(db),
        feedback: new FeedbackService(db),
        adminUtils: new AdminUtils(db),
        scrape: new ScrapeService(db),
    };

    services.categoryService = new CategoryFinderService(db, services.scrape)
    services.search = new SearchService(db, services.brandMapper, services.scrape, services.categoryService);

    const server = new Server(args, db, services);

    if (args.listRoutes) {
        server.listRoutes();
    }

    server.start();

    services.categoryService.createIndexes()
    db.collection(cols.MAPPING_DATA).createIndex('asins', {"background": true});
    db.collection(cols.MAPPING_DATA).createIndex('cpscNumber', {"background": true});
    db.collection(cols.REST_API).createIndex('Manufacturer.name', {"background": true});
    db.collection(cols.NEISS_DATA).createIndex('product', {'background': true});
    db.collection('brands').createIndex('searchString', {'background': true});

    Cron.schedule("5 2 * * 1",  async function () {
        console.log("Updating CPSC Recalls");
        await utils.updateRestApi(db, services);
    });

    process.on('SIGINT', () => {
        server.stop(() => {
                console.log(chalk.bgRed.white('Server terminated'));
                process.exit(0);
            }
        )
    });
});



