import {request, response} from 'express'
import jwt from 'jsonwebtoken';
import serverConfig  from './config/server';
import _ from 'lodash'
import { ArgumentParser } from 'argparse';

/**
 * Verifies user authentication
 * Decodes user token into the request
 * @param {request} req
 * @param {response} res
 * @param {function} next
 * @returns {Response}
 */
export function verifyTokenMiddleware(req: request, res, next) {
    // check header or url parameters or post parameters for token
    const token = req.cookies[serverConfig.cookieName];

    // decode token
    if (token) {
        // verifies secret and checks expiration
        jwt.verify(token, serverConfig.signingKey, (err, decoded) => {
            if (err) {
                res.json({authenticated: false, reason: err})
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        })
    } else {
        // Return an error if not authenticated
        return res.status(403).send({
            message: 'No token provided.'
        });
    }
}


/**
 * Logs all application errors to console
 * @param err
 * @param req
 * @param res
 * @param next
 */
export function logErrors (err, req, res, next) {
    console.error(err.stack);
    next(err);
}

/**
 * Handles application errors, sends a response back to the client
 * depending on how it was requested
 * @param err
 * @param req
 * @param res
 * @param next
 */
export function clientErrorHandler (err, req, res, next) {
    if (req.xhr) {
        if(req.get('isDev')) {
            res.status(500).send({
                error: err,
                message: 'Server Failure' ,
            })
        } else {
            res.status(500).send({ message: 'Server Failed. Contact your administrator' })
        }
    } else {
        //todo: There isn't an error page to render at this point
        // next()
        res.status(500).send({message: 'Server Failed', error: JSON.stringify(err)})
    }
}

/**
 * Handles Joi schema errors
 * @param err
 * @param req
 * @param res
 * @param next
 */
export function handleJoiError (err, req, res, next) {
    if (_.get(err, 'isJoi', false)) {
        // Return a custom 400 json response
        res.status(400).json({
            type: err.name,
            message: err.message,
            details: err.details
        });
    } else {
        // pass on to another error handler
        next(err);
    }
}

/**
 * Creates application parser with configurable options
 * @returns {any}
 */
export function getAppParser() {
    const parser = new ArgumentParser({
        addHelp: true,
        description: 'Start an express server for webpack dev or prod',
    });

    parser.addArgument(['-m', '--mode'], {
        help: 'Set server mode. Default: dev',
        dest: 'mode',
        defaultValue: 'dev',
        choices: ['dev', 'prod'],
    });

    parser.addArgument(['--host'], {
        help: 'Set server host',
        dest: 'host',
        defaultValue:  serverConfig.host
    });

    parser.addArgument(['-r','--routes'], {
        help: 'List all application endpoints',
        dest: 'listRoutes',
        action:'storeTrue'
    });

    parser.addArgument(['-p','--port'], {
        help: 'Defines port number to run application',
        dest: 'port',
        defaultValue: serverConfig.port,
    });

    let args = parser.parseArgs();

    args.isDev = args.mode === 'dev';

    //Check process env variables
    if(process.env.MODE) {
        args.mode = process.env.MODE;
    } else {
        process.env.MODE = args.mode;
    }

    if(process.env.PORT) {
        args.port = process.env.PORT;
    } else {
        process.env.PORT = args.port;
    }

    if(process.env.HOST) {
        args.host = process.env.HOST;
    } else {
        process.env.HOST = args.host;
    }

    return args;
}

export const AsyncMiddleware = fn =>
    (req, res, next) => {
        Promise.resolve(fn(req, res, next))
            .catch(next);
    };

export const createId = (length) => {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
