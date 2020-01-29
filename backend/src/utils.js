import _ from "lodash";

const MongoClient = require('mongodb').MongoClient;
const jwt = require('jsonwebtoken');
let dbo;
const program = require('commander');
const bcrypt = require('bcrypt');
const cols = require('./config/server').collections;
const axios = require('axios');

program
    .version('0.1.0')
    .option('-m, --mongo <url>', 'Mongo url', process.env.MONGO_URL || 'localhost')
    .parse(process.argv);

const url = `${program.mongo}`;
console.log(url);

export async function getDB() {
    if (dbo) return dbo;
    let db = await MongoClient.connect(url, {useNewUrlParser: true});
    let proxy = {
        //Simple wrapper to get the collection
        get: function (target, name) {
            return target.collection(name);
        }
    };
    dbo = new Proxy(db.db('recall_it'), proxy);
    return dbo;
}


export function handleError(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
}

export function handleNotFound(req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
}


export function updateRestApi(db, services) {
    return new Promise((res, err) => {

        const request = require('request');
        const options = {
            url: 'https://www.saferproducts.gov/RestWebServices/Recall?format=json',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Accept-Charset': 'utf-8'
            }
        };

        const getDate = () => {
            return db.collection('restAPI').find({}, {LastPublishDate: 1}).sort({LastPublishDate: -1}).limit(1).toArray()
        };
        let counter = 0;

        request(options, function (err1, response, body) {
            let json = JSON.parse(body);
            getDate()
                .then(async data => {

                    let inserts = []

                    for (let i = 0; i < json.length; i++) {
                        if (json[i]['LastPublishDate'] > data[0]['LastPublishDate']) {
                            counter++;
                            inserts.push(json[i])
                        }
                    }

                    if(inserts.length > 0)
                    {
                        await db.collection('restAPI').insertMany(inserts);
                        await services.brandMapper.truncate();
                        await services.brandMapper.mapBrands();
                        await services.brandMapper.syncRecallsToBrands()
                    } else {
                        console.log("\tNo new recalls")
                    }

                    res(true);
                })
                .catch(data => {
                        console.log("Collection restAPI does not exist... Recreating collection restAPI")
                        db.collection('restAPI').insertMany(json)
                            .then(async x => {
                                console.log("Collection restAPI created...updating brands")
                                await services.brandMapper.truncate();
                                await services.brandMapper.mapBrands();
                                await services.brandMapper.syncRecallsToBrands()
                            })
                            .catch(e =>{
                                console.log(e)
                            })
                })
        })
    })


}

export function verifyUserToken(req, res, next) {

    // check header or url parameters or post parameters for token
    let token = req.body['_cpscBEToken'] || req.cookies['_cpscBEToken']

    // decode token
    if (token) {

        // verifies secret and checks exp
        jwt.verify(token, req.app.get('signingKey'), function (err, decoded) {
            if (err) {
                return res.status(400).json({success: false, msg: 'Failed to authenticate token.'});
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });

    } else {

        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            msg: 'No token provided.'
        });

    }
}

export async function getHash(userInfo) {
    let genSalt = async (password) => {
        return new Promise((resolve, reject) => {
            bcrypt.genSalt(10, function (err, salt) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        salt: salt,
                        password: password
                    })
                }
            })
        })
    }

    let genHash = async (salt, password) => {
        return new Promise((resolve, reject) => {
            bcrypt.hash(password, salt, function (err, hash) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        hash: hash
                    })
                }
            })
        })
    }

    let result = await genSalt(userInfo.password);
    let hash = await genHash(result.salt, result.password);

    return hash.hash;
}

export function parseRecallData(r) {
    const numberPattern = /\d+/g;

    const getSold = () => {
        let sold = r['Products'][0]['NumberOfUnits'];
        sold = sold.replace(/[^\w\s]|_/g, "").match(numberPattern);
        if (sold && sold.length)
            sold = +sold[0];
        else
            sold = undefined;
        return sold;
    };

    const getImages = () => {
        return r.Images ? r.Images.slice(0, 3).map(i => i.URL) : [];
    };

    const getBrand = () => {
        return _.get(r,
            'brand[0][0].matches[0].original',
            _.get(r, 'Manufacturers[0].Name', 'Brand Unknown'))
    };

    const getHazards = () => {
        return r.Hazards ? r.Hazards.map(h => h.Name) : [];
    };

    const getInjunction = () => {
        return _.get(r, 'injunction[0].URL', null)
    };

    return {
        recallID: r['RecallID'] || r['_id'],
        productName: r['Products'][0].Name,
        brand: r['brandName'] ? r.brandName : getBrand(),
        date: r['RecallDate'],
        hazards: getHazards(),
        sold: getSold(),
        images: getImages(),
        injunction: getInjunction(),
        url: r['URL'],
        description: r['Description']
    }
}

export function groupYears(brandRecalls) {
    let recallYears = {};
    brandRecalls.forEach(recall => {
        let year = +recall.RecallDate.substring(0, 4);
        if (!(year in recallYears)) {
            recallYears[year] = 1;
        } else {
            recallYears[year]++;
        }
    });
    return recallYears;
}


