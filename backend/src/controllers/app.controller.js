import BaseRouter from './base.controller'
import ApiController from './api.controller'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import {Request, Response} from "../types/types";
import AdminController from "./admin.controller";
import serverConfig from '../config/server'
const cols = serverConfig.collections;

export default class AppController extends BaseRouter {
    name = AppController.name

    subControllers = [
        new ApiController(this, '/api'),
        new AdminController(this, '/admin')
    ]

    /**
     * Logs out user by erasing cookie token
     * @param req
     * @param res
     */
    logout = (req, res) => {
        res.clearCookie(serverConfig.cookieName)
        res.json()
    }

    /**
     * Authenticate a user
     * @param req
     * @param res
     * @param next
     * @returns {Promise<void>}
     */
    authenticate = async (req: Request, res: Response, next) => {

        let user = await req.app.locals.db.collection(cols.USERS).findOne({
            email: req.body.email,
        })

        //Check if successful
        if (!!!user) {
            console.info(`Attempted auth for:\t${req.body.email}`)

            //Return unauthorized
            res.status(401).json({
                message: 'Unauthorized access',
            })

            return
        }

        const match = await bcrypt.compare(req.body.password, user['password'])

        if (false == match) {
            //Return unauthorized
            res.status(401).json({
                message: 'Unauthorized access',
            })

            return
        }

        delete user['_id']
        delete user['password']

        //Create data to be stored in token
        const payload = {
            ...user,
        }

        //Create token with expiration date
        let token = jwt.sign(payload, serverConfig.signingKey, {
            expiresIn: serverConfig.tokenDuration,
        })

        //Set the token in the cookie
        res.cookie(serverConfig.cookieName, token, {
            httpOnly: true,
        })

        res.json(payload)
    }


    getComplaintsFile = (req: Request, res: Response) => {
        res.sendFile(path.join(req.app.get('webPath'), 'complaints.html'));
    }

    getIframe = (req: Request, res: Response) => {
        res.sendFile(path.join(req.app.get('webPath'), 'iframe.html'));
    }

    /**
     * Route to get the manager file
     * Note: does not use Jade
     */
    getAppFile = (req: Request, res: Response) => {
        res.sendFile(path.join(req.app.get('webPath'), 'index.html'));
    }


    services() {
        return {
            'POST /auth': this.authenticate,
            'GET /logout': this.logout,
            'GET /complaints': this.getComplaintsFile,
            'GET /app': this.getAppFile,
            'GET /iframe': this.getIframe
        }
    }
}
