import BaseRouter from './base.controller'
import bodyParser from 'body-parser'
import type {Response} from "../types/types";
import {Request} from "../types/types";
import Joi from 'joi'
import expressJoiMiddleware from "express-joi-middleware";
import {groupYears, parseRecallData} from "../utils";

const SearchSchema = {
    query: {
        asin: Joi.string().required(),
        brand: Joi.string(),
        productTitle: Joi.string(),
    }
}

const FeedbackSchema = {
    body: {
        recallId: [Joi.string().required(), Joi.number().required()],
        feedback: Joi.string().required()
    }
}


const paginate = require('express-paginate');
export default class ApiController extends BaseRouter {
    name: string = ApiController.name;

    search = async (req: Request, res: Response) => {
        let productBrand = req.query.brand;
        let asinNumber = req.query.asin;


        let results = await req.app.locals.services.search.getResultsV2(asinNumber, productBrand)

        if (results === null) {
            console.log(`No results for ${productBrand} and ${asinNumber}`);
            res.status(404).json();
        } else {
            res.json({
                productTitle: req.query.productTitle || 'No Product Title',
                category: results.category || null,
                brand: productBrand || 'No brand',
                recallCount: results.brandRecalls.length,
                recalls: results.brandRecalls.slice(0, 5).map(parseRecallData),
                recallsInCategory: results.categoryRecalls.map(parseRecallData),
                hazardCount: results.neissData.hazardCount,
                hazards: results.neissData.hazards,
                years: groupYears(results.brandRecalls),
                categoryId: results.categoryId
            });
        }
    };

    getFeedback = async (req: Request, res: Response) => {
        let id = req.query.recallID;
        await req.app.locals.services.feedback.increment(id);
        res.json({})
    };

    getBrandTable = async (req: Request, res: Response) => {
        let category = req.query.category;

        let results = await req.app.locals.services.search.getBrandTable(
            category,
            req.skip,
            req.query.limit
        );

        res.json({
            ...results,
            hasMore: paginate.hasNextPages(req)(results.pages),
        })
    };

    addProductFeedback = async (req: Request, res: Response) => {

        if (isNaN(Number(req.body.recallId))) {
            res.status(403).json('Invalid recall id')
            return
        }

        try {
            await req.app.locals.services.feedback.addProductFeedback(+req.body.recallId, req.body.feedback)
            res.json()
        } catch (e) {
            res.status(404).json(e.message)
        }
    }

    services() {
        return {
            '/newSearch': [
                expressJoiMiddleware(SearchSchema),
                this.search
            ],
            '/search': [
                expressJoiMiddleware(SearchSchema),
                this.search
            ],
            '/brand-table': [
                paginate.middleware(10, 50),
                this.getBrandTable
            ],
            'POST /feedback': [
                expressJoiMiddleware(FeedbackSchema),
                this.addProductFeedback
            ]
        }
    }

    middlewares() {
        return [
            //todo: why is this here? BodyParser is done early on
            //idk what this is at all -Dylan
            bodyParser.json(),
        ]
    }
}
