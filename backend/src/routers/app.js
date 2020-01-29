const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const utils = require('../utils.js');
const path = require('path')
const paginate = require('express-paginate');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index.pug', {title: 'CPSC Browser Extension'});
});


/* GET user complaints page. */
router.get('/complaints/search', [paginate.middleware(10, 50), (req, res) => {

    const getCount = (db) => db.consumerData
        .find(filter)
        .count();

    const getResults = (db) => {
        return db.consumerData
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

    if(req.query.filtered) {
        req.query.filtered.forEach(field => {
            field = JSON.parse(field);
            if (field.id === 'product.brand') {
                filter['product.brand'] = new RegExp(`${field.value}`, 'i');
            }
        })
    }

    utils.getDB().then(db => {
        Promise.all([
            getCount(db),
            getResults(db)
        ]).then(([count, data]) => {
            const pageCount = Math.ceil(count / req.query.limit);
            res.send({
                hasMore: paginate.hasNextPages(req)(pageCount),
                rows: data,
                pages: pageCount
            });
        });
    });
}]);

router.get('/complaints', (req, res) => {
    res.sendFile(path.join(req.app.get('webPath'), 'complaints.html'));
});

/**
 * Route to get the manager file
 * Note: does not use Jade
 */
router.get('/app', (req, res) => {
    res.sendFile(path.join(req.app.get('webPath'), 'index.html'));
});

router.post('/auth', (req, res) => {
    //This will serve as an authentication route
    //todo: Use this guide - https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens

    let email = req.body.email,
        password = req.body.password;


    utils.getDB().then(db => {
        db.users.findOne({email: email})
            .then(x => {
                if (x === null) {
                    console.info(`Auth: ${email} not found`);
                    res.status(401).json({
                        success: false,
                        msg: 'User with email and password not found'
                    })
                } else {
                    console.info(`Auth: ${email} found`);
                    bcrypt.compare(password, x.password)
                        .then(function (response) {

                            if (response) {
                                console.info(`\tSuccess`);

                                const payload = {
                                    email: x.email,
                                    isAdmin: x.isAdmin
                                };
                                let token = jwt.sign(payload, req.app.get('signingKey'), {
                                    expiresIn: '8 hours'
                                });

                                res.cookie('_cpscBEToken', token, {httpOnly: true});

                                res.json({
                                    success: true,
                                    data: response,
                                    isAdmin: x.isAdmin
                                });

                            }
                            else {
                                console.log(`\t${email}\tFailed authentication`);
                                res.json({
                                    success: false,
                                    data: response,
                                    msg: 'User with email and password not found'
                                });
                            }
                        })
                }
            })
            .catch(x => {
                console.error("Error:\n", JSON.stringify(x))
                res.json({
                    success: false,
                    data: x,
                    msg: 'Server Error. Please contact your administrator'
                })
            })
    })
});


module.exports = router;
