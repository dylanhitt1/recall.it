import BaseRouter from './base.controller'
import serverConfig from '../config/server'
import {Request, Response} from "../types/types";
import {verifyTokenMiddleware} from "../util";
const paginate = require('express-paginate');
const cols = serverConfig.collections;

export default class AdminController extends BaseRouter {
    name = AdminController.name;

    subControllers = [];

    /**
     * Verifies authentication.
     * Since api controller is under a firewall
     * this method will only be called on success.
     * @param req
     * @param res
     */
    verifyAuthenticated = (req: Request, res) => {
        res.json({
            authenticated: true,
            fullName: req.decoded.fullName,
        })
    }

    complaintSearch = async (req: Request, res: Response) => {
        const getCount = () => req.app.locals.db.collection(cols.CONSUMER_DATA)
            .find(filter)
            .count();

        const getResults = () => {
            return req.app.locals.db.collection(cols.CONSUMER_DATA)
                .find(filter)
                .sort(sortObject)
                .skip(req.skip)
                .limit(req.query.limit)
                .toArray();
        };

        let sortObject = {};
        let filter = {'product.code': req.query['categoryId']};
        if (req.query.sorted) {
            req.query.sorted.forEach(field => {
                field = JSON.parse(field);
                if (field.id === 'dateString') {
                    sortObject['date'] = field.desc ? -1 : 1;
                } else if (field.id === 'product.description') {
                    sortObject['product.description'] = field.desc ? -1 : 1;
                } else if (field.id === 'product.brand') {
                    sortObject['product.brand'] = field.desc ? -1 : 1;
                }
            })
        }

        if (req.query.filtered) {
            req.query.filtered.forEach(field => {
                field = JSON.parse(field);
                if (field.id === 'product.brand') {
                    filter['product.brand'] = new RegExp(`${field.value}`, 'i');
                }
            })
        }

        Promise.all([
            getCount(),
            getResults()
        ]).then(([count, data]) => {
            const pageCount = Math.ceil(count / req.query.limit);
            res.json({
                hasMore: paginate.hasNextPages(req)(pageCount),
                rows: data,
                pages: pageCount
            });
        });
    };

    updateMapping = async (req: Request, res: Response) => {
        let body = req.body;
        await req.app.locals.services.adminUtils.updateMapping(body);
        res.json({
            success: "i did it"
        })
    };

    getMapping = async (req: Request, res: Response) => {
        let body = req.body;
        let response = await req.app.locals.services.adminUtils.getMapping(body);
        res.json(response)
    };

    getUsers = async (req: Request, res: Response) => {
        let response = await req.app.locals.services.adminUtils.getUsers();
        res.json(response)
    };

    getRecalls = async (req: Request, res: Response) => {
        let limit = req.query.limit;
        let skip = req.skip;

        let recallInfo = await req.app.locals.services.adminUtils.getRecalls(limit, skip);
        res.json({
            data: recallInfo.data,
            hasMore: paginate.hasNextPages(req)(recallInfo.pages),
            pages: recallInfo.pages
        })
    };

    createUser = async (req: Request, res: Response) => {
        let result = await req.app.locals.services.adminUtils.createUser(req.body);

        res.json({
            data: result
        })
    };

    deleteUser = async (req: Request, res: Response) => {
        let email = req.body.email;
        let response = await req.app.locals.services.adminUtils.deleteUser(email);
        res.json({
            success: response
        })
    };

    recallsFeedback = async (req: Request, res: Response) => {
        let limit = req.query.limit;
        let skip = req.skip;
        let recallInfo = await req.app.locals.services.adminUtils.getRecallsFeedbackV2(skip, limit);
        res.json({
            data: recallInfo.data,
            hasMore: paginate.hasNextPages(req)(recallInfo.pages),
            pages: recallInfo.pages
        })

    };

    getRecall = async (req: Request, res: Response) => {
        let id = req.query.id;
        let recall = await req.app.locals.services.adminUtils.getRecall(id);
        res.json(recall)
    };

    updateRecall = async (req: Request, res: Response) => {
        let response = await req.app.locals.services.adminUtils.updateRecall(req.body);
        res.json(response)
    };

    deleteFeedback = async (req: Request, res: Response) => {
        let response = await req.app.locals.services.adminUtils.deleteFeedback(req.body._id);
        res.json(response)
    };

    updateFeedback = async (req: Request, res: Response) => {
        let response = await req.app.locals.services.adminUtils.updateFeedback(req.body);
        res.json(response)
    };

    services() {
        return {
            // 'POST /verify-auth': this.verifyAuthenticated,
            // 'GET /complaints/search': [
            //     paginate.middleware(10, 50),
            //     this.complaintSearch
            // ],
            'GET /mapping': this.getMapping,
            'GET /users': this.getUsers,
            'GET /recall': this.getRecall,
            'GET /recalls': [
                paginate.middleware(10, 50),
                this.getRecalls
            ],
            'GET /recalls/feedback': [
                paginate.middleware(10, 50),
                this.recallsFeedback
            ],
            'POST /delete-user': this.deleteUser,
            'POST /update-recall': this.updateRecall,
            'POST /update-mapping': this.updateMapping,
            'POST /create-user': this.createUser,
            'POST /delete/feedback': this.deleteFeedback,
            'POST /update/feedback': this.updateFeedback
        }
    }

    // middlewares(): Array<*> {
    //     return [
    //         verifyTokenMiddleware,
    //     ]
    // }
}
