import express, {application} from 'express'
require('express-async-errors');
import bodyParser from 'body-parser'
import http from 'http'
import AppController from './controllers/app.controller'
import chalk from 'chalk'
import {clientErrorHandler, handleJoiError, logErrors} from "./util"
import BaseController from "./controllers/base.controller"
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import fallback from 'express-history-api-fallback'
import * as MongoDB from 'mongodb'
import helmet from 'helmet'
import {Config, Services, Application} from "./types/types"
import cors from 'cors'

const PUBLIC_ASSETS = require('path').join(__dirname, '../client/public')

export default class Server {
    app: Application
    server: http.Server
    controller: BaseController
    config: Config
    db: MongoDB.Db
    services: Services

    constructor(config: Config, db: MongoDB.Db, services: Services) {
        this.config = config
        this.services = services
        this.app = express()
        this.db = db
        this.controller = new AppController()
        this.configure(config)
    }

    listRoutes() {
        this.controller.listRoutes()
    }

    getCors() {
        return cors({
            origin: function (origin, callback) {

                let validOrgins = [
                    'http://localhost',
                    'https://localhost',
                    'https://admin.recall-oz.com',
                    'https://recall-oz.com'
                ];

                // Allow requests with no origin
                // eg. ike mobile apps or curl requests
                if (!origin || origin.includes('http://localhost') || origin.includes('https://localhost') ||
                    origin.includes('https://admin.recall-oz.com') || origin.includes('https://recall-oz.com')){
                    return callback(null, true)
                }


                if (![].includes(origin.toLowerCase())) {
                    const msg = `Unrecognized origin: ${origin}`;
                    return callback(new Error(msg), false)
                }

                return callback(null, true)
            }
        })

    }

    configure(config: Config) {

        this.app.locals.services = this.services
        this.app.locals.db = this.db

        // Set express environment
        this.app.set('env', config.isDev ? 'development' : 'production')
        this.app.set('isDev', config.isDev)

        //Add body parsing, url decoding, and cookie parsing
        this.app.use(helmet())
        this.app.use(this.getCors())

        this.app.use(bodyParser.json())
        this.app.use(bodyParser.urlencoded({extended: true}))
        this.app.use(cookieParser())
        this.app.use(this.getLogger(config))

        // Set public assets and node directory
        this.app.use(express.static(PUBLIC_ASSETS))

        //Add routing
        this.controller.init(this.app)

        //Add default page
        this.app.use(fallback('index.html', {root: PUBLIC_ASSETS}))

        //Add error handling
        this.app.use(logErrors)
        this.app.use(handleJoiError)
        this.app.use(clientErrorHandler)


    }

    getLogger(config: Config) {
        let logger
        if (config.isDev) {
            logger = morgan('dev')
        } else {
            logger = morgan('combined', {
                skip: (req, res) => {
                    //Skip successful responses
                    return res.statusCode < 400
                }
            })
        }

        return logger
    }

    start(port?: number) {
        //Start the server at set port
        this.server = this.app.listen(port || this.config.port, () => {
            console.log(chalk.green(`\n[${this.app.get('env')}]\tRunning at ${chalk.bold(`http://localhost:${this.config.port}`)}`))
            console.log('\nPress CTRL-C to stop\n')
        })
    }

    stop(cb?: Function) {
        this.server.close(cb)
    }
}
