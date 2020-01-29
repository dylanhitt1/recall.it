const express = require('express');
const router = express.Router();
const utils = require('../utils.js');
const thePath = require('path').join(__dirname, '../uploads');
const upload = require('multer')({dest: thePath});
const fs = require('fs');
let csv = require("fast-csv");
const path = require('path');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const ObjectID = require('mongodb').ObjectID;
const paginate = require('express-paginate');

//Encrypt all urls in router
//router.use(utils.verifyUserToken)

/**
 * Upload NEISS from a csv file, admin
 */
router.post('/neiss-update', upload.single('file'), (req, res) => {
    //using package called multer - https://www.npmjs.com/package/multer
    //File should exist inside of req.file

    const file = req.file.path;

    if (false === (file && file.length > 0)) {
        res.json({
            msg: 'No file detected',
            success: false
        })

        return
    }

    let myInt = 0;
    let myObj;
    let promises = [];

    const formatData = (data, diagnosisString) => {
        let post = {};
        post['caseNumber'] = data[0];
        post['date'] = Date.parse(data[1]);
        post['age'] = parseInt(data[5]);
        post['diagnosis'] = diagnosisString;

        switch (data[6]) {
            case 'Male':
                post['sex'] = 1
                break;
            case 'Female':
                post['sex'] = 2
                break;
            case 'None listed':
                post['sex'] = 0
                break;
            default:
                post['sex'] = parseInt(data[6])
                break;
        }
        switch (data[7]) {
            case 'None listed':
                post['race'] = 0
                break;
            case 'Other / Mixed Race':
                post['race'] = 3
                break;
            case 'White':
                post['race'] = 1
                break;
            case 'Black/African American':
                post['race'] = 2
                break;
            case 'American Indian/Alaska Native':
                post['race'] = 5
                break;
            case 'Asian':
                post['race'] = 4
                break;
            case 'Native Hawaiian/Pacific Islander':
                post['race'] = 6
                break;
            default:
                post['race'] = parseInt(data[7])
                break;
        }
        post['raceOther'] = data[8];
        post['bodyPart'] = parseInt(data[11]);
        post['disposition'] = parseInt(data[12]);
        post['location'] = parseInt(data[13]);
        post['product'] = parseInt(data[15]);
        post['narr1'] = data[17];
        if (data.length == 19) {
            post['narr2'] = data[18]
        }
        return post
    }

    const commitOps = (bulkObj, count) => {
        return new Promise(resolve => {
            bulkObj.execute()
                .then(x => {
                    console.log(`Executed bulk operation for: ${count}`)
                    resolve(x)
                })
        })
    }

    utils.getDB().then(db => {

        let count = 0

        //db.neissData.drop();

        let bulk = db.neissData.initializeUnorderedBulkOp();
        let post;
        let requiresCommit = false;


        db.diagnosisData.find().toArray()
            .then(diagnoses => {
                console.log('here');
                fs.createReadStream(file)
                    .pipe(csv())
                    .on('data', function (data) {
                        ++count;

                        if (count === 1) {
                            //Skip the header
                            return;
                        }

                        let diagnosisString = _.find(diagnoses, {code: parseInt(data[9])}).diagnosis;

                        post = formatData(data, diagnosisString);
                        bulk.find({caseNumber: post['caseNumber']}).upsert().update({$set: post});
                        requiresCommit = true;
                        if (count > 0 && count % 5000 === 0) {
                            promises.push(commitOps(bulk, count));
                            bulk = db.neissData.initializeUnorderedBulkOp();
                            requiresCommit = false
                        }
                    })
                    .on('end', function (data) {
                        if (requiresCommit) {
                            promises.push(commitOps(bulk, count));
                        }
                        Promise.all(promises)
                            .then(x => {
                                console.log("Done.");

                                res.json({
                                    success: true,
                                    imported: count
                                })
                            })
                            .catch(x => {
                                console.log('Fail')
                            })


                    })
            })
    });

});
/**
 * Call the CPSC rest api and upload into the database (check the url in the getData.py file for default)
 */
// router.post('/update-cpsc', (req, res) => {
//
//     const url = req.body.url;
//     let promises = [];
//     console.log('Downloading content from: ', url);
//
//     const request = require('request');
//     const options = {
//         url: 'https://www.saferproducts.gov/RestWebServices/Recall?format=json',
//         method: 'GET',
//         headers: {
//             'Accept': 'application/json',
//             'Accept-Charset': 'utf-8'
//         }
//     };
//     const getDate = (db) => {
//         return db.restAPI.find({}, {LastPublishDate: 1}).sort({LastPublishDate: -1}).limit(1).toArray()
//     };
//     let counter = 0;
//
//     request(options, function (err, response, body) {
//         let json = JSON.parse(body);
//         utils.getDB().then(db => {
//             getDate(db)
//                 .then(data => {
//                     console.log(data)
//                     for (let i = 0; i < json.length; i++) {
//
//                         if (json[i]['LastPublishDate'] > data[0]['LastPublishDate']) {
//                             counter++;
//                             promises.push(
//                                 db.restAPI.insertOne(json[i])
//                             )
//                         }
//                     }
//                     Promise.all(promises)
//                         .then(x => {
//                             console.log("Done.");
//                             console.log(x);
//
//                             res.json({
//                                 success: true,
//                                 count: counter
//
//                             })
//                         })
//                         .catch(x => {
//                             console.log("Error");
//                             res.status(500).json({
//                                 success: false,
//                                 msg: JSON.stringify(x)
//                             })
//                         })
//                 });
//         })
//     });
// });
/**
 * Be able to map between the cpsc category names, numbers and amazon category items. maybe see all the rest of them
 */
// router.post('/update-mapping', (req, res) => {
//     //Be able to map between the cpsc category names,
//     //numbers and amazon category items. maybe see all the rest of them
//
//     //Going to return an array of object with the following mapping
//     //the same object that is stored in the db
//     let obj = req.body;
//     let query = obj._id ? {_id: new ObjectID(obj._id)} : {cpscNumber: obj.cpscNumber};
//
//     utils.getDB().then(db => {
//         db.mappingData.update(query,
//             {
//                 amazonItems: obj.amazonItems,
//                 cpscName: obj.cpscName,
//                 cpscNumber: obj.cpscNumber
//             },
//             {upsert: true}
//         )
//             .then(x => {
//                 console.log("Successful");
//                 res.json({
//                     success: true,
//                     data: x
//                 })
//             })
//             .catch(x => {
//                 console.log("fail");
//                 res.status(500).json({
//                     data: x
//                 })
//             })
//
//     });
// });

// router.get('/get-mapping', (req, res) => {
//     //beable to get data from the mappingData Collection
//     //user can visualize what data they are changing
//     utils.getDB().then(db => {
//         db.mappingData.find().toArray()
//             .then(x => {
//                 console.log("Successful");
//                 res.json({
//                     success: true,
//                     data: x
//                 })
//             })
//             .catch(x => {
//                 console.log("fail")
//             })
//
//     });
// });

// router.post('/create-user', (req, res) => {
//     //create new user
//
//     let obj = req.body;
//
//     bcrypt.genSalt(10, function (err, salt) {
//         bcrypt.hash(obj.password, salt, function (err, hash) {
//             utils.getDB().then(db => {
//                 db.users.update(
//                     {email: obj.email},
//                     {
//                         email: obj.email,
//                         password: hash,
//                         firstName: obj.firstName,
//                         lastName: obj.lastName,
//                         isAdmin: obj.isAdmin
//                     },
//                     {upsert: true})
//                     .then(x => {
//                         res.json({
//                             success: true,
//                             data: x
//                         })
//                     })
//                     .catch(x => {
//                         console.log("Failed user insert", x)
//                         res.json({
//                             success: false,
//                             msg: JSON.stringify(x)
//                         })
//                     })
//             });
//         });
//     });
// });

// router.post('/delete-user', (req, res) => {
//     //todo: Ensure that there is an email passed
//     utils.getDB().then(db => {
//         db.users.deleteOne({
//             email: req.body.email
//         })
//             .then(x => {
//                 res.json({
//                     success: true,
//                     data: x
//                 })
//                     .catch(x => {
//                         console.log(x);
//                     })
//             });
//     });
//
// });

// router.get('/get-user', (req, res) => {
//     //get user checks if the users password is correct
//     let obj = {
//         email: 'dfhitt@gmail.com',
//         password: '1235'
//     };
//
//     utils.getDB().then(db => {
//         let user = db.users.findOne({email: obj.email})
//             .then(x => {
//                 console.log('userfound');
//                 bcrypt.compare(obj.password, x.password)
//                     .then(function (response) {
//                         res.json({
//                             success: true,
//                             data: response
//                         })
//                     });
//             })
//     })
//         .catch(x => {
//             console.log(x)
//         })
//
// });
/**
 * Get all users
 */
// router.get('/users', (req, res) => {
//     utils.getDB().then(db => {
//         db.users.find().toArray()
//             .then(users => {
//                 res.json(users)
//             })
//             .catch(reason => {
//                 res.status(500).json({
//                     msg: JSON.stringify(reason)
//                 })
//             })
//     })
// });

/**
 * Return all recall data with limited fieldset
 * to reduce data size
 */
// router.get('/recalls', [paginate.middleware(10, 50), (req, res) => {
//     utils.getDB().then(db => {
//
//         Promise.all([
//             db.restAPI.find({}, {
//                 fields: {
//                     RecallID: 1,
//                     RecallNumber: 1,
//                     RecallDate: 1,
//                     Description: 1,
//                     URL: 1,
//                     Title: 1
//                 }
//             }).skip(req.skip).limit(req.query.limit).toArray(),
//             db.restAPI.find().count()
//         ]).then(([data, count]) => {
//             const pageCount = Math.ceil(count / req.query.limit);
//             res.json({
//                 data: data,
//                 hasMore: paginate.hasNextPages(req)(pageCount),
//                 pages: pageCount
//             })
//         }).catch(reason => {
//             res.json({
//                 success: false,
//                 msg: JSON.stringify(reason)
//             })
//         })
//     })
// }]);

// router.get('/feedback-recalls', [paginate.middleware(10, 50), (req, res) => {
//     const feedbacks = [];
//     const getFeedback = (db, skip, limit) => {
//         return db.feedbackData.find({negCount: {$gte: 10}})
//             .skip(skip)
//             .limit(limit)
//             .toArray()
//     };
//     const getRecalls = (db, data) => {
//         for (let i = 0; i < data.length; i++) {
//             feedbacks.push(data[i]['recallID'])
//         }
//         return db.restAPI.find({RecallID: {$in: feedbacks}}).toArray()
//     };
//     const getCount = (db) => {
//         return db.feedbackData.find().count()
//     };
//     const groupData = (feedbackData, recalls) => {
//         let data = [];
//         recalls.forEach(recall => {
//             let f = _.find(feedbackData, {recallID: +recall['RecallID']})
//             data.push({
//                 recall: recall,
//                 feedback: f
//             })
//         })
//         return data;
//     };
//     utils.getDB().then(db => {
//         getFeedback(db, req.skip, req.query.limit)
//             .then(feedbackData => {
//                 Promise.all([
//                     getRecalls(db, feedbackData),
//                     getCount(db)
//                 ])
//                     .then(([data, count]) => {
//                         const pageCount = Math.ceil(count / req.query.limit);
//                         const groupedData = groupData(feedbackData, data);
//
//                         res.json({
//                             count: count,
//                             data: groupedData,
//                             hasMore: paginate.hasNextPages(req)(pageCount),
//                             pages: pageCount
//                         })
//                     })
//                     .catch(reason => {
//                         res.json({
//                             success: false,
//                             msg: JSON.stringify(reason)
//                         })
//                     })
//             })
//             .catch(x => {
//                 res.json({
//                     success: false,
//                     msg: JSON.stringify(x)
//                 })
//             })
//     })
// }]);

/**
 * Used to get all information related
 * to a query.
 *
 */
// router.get('/recall', (req, res) => {
//
//     if (false == req.query.id) {
//         res.status(400).json({
//             msg: 'No query id specified',
//             success: false
//         });
//         return;
//     }
//
//     utils.getDB().then(db => {
//
//         db.restAPI.findOne({
//             _id: new ObjectID(req.query.id)
//         }).then(recall => {
//             res.json(recall)
//         }).catch(reason => {
//             res.status(500).json({
//                 success: false,
//                 msg: JSON.stringify(reason)
//             })
//         })
//     })
// });
/**
 * deletes data in the feedback table
 */
// router.post('/delete-feedback', (req, res) => {
//     let obj = req.body;
//
//     utils.getDB().then(db => {
//         db.feedbackData.deleteOne({
//             recallID: obj.recallID //req.recallID
//         })
//             .then(message => {
//                 res.json({})
//             })
//             .catch(message => {
//                 res.json({
//                     success: false,
//                     msg: message
//                 })
//             })
//     });
//
// });
/**
 * deletes data in the recall table
 */
// router.post('/update-recall', (req, res) => {
//     //just needed to test
//     let obj = req.body;
//
//     utils.getDB().then(db => {
//
//         let id = new ObjectID(obj._id);
//
//         //Don't allow updates to this
//         delete obj['_id'];
//         db.restAPI.update({_id: id}, obj)
//             .then(x => {
//                 res.json({
//                     data: x
//                 })
//             })
//             .catch(x => {
//                 res.status(400).json({
//                     msg: x
//                 })
//             })
//     });
// });

/**
 * this is just example code on how to use the brandMapping
 * I don't know if we are actually going to use this
 */
// router.get('/brandMapping', (req, res) => {
//
//     const amznBrand = 'Bassett Baby & Kids';
//     const amznCat = 'Cribs'
//     let cpscBrands = []
//
//     utils.getDB().then(db => {
//         db.mappingBrand.find({amazonBrands : amznBrand}, {
//             fields: {
//                 cpscBrands: 1
//             }
//         }).toArray()
//             .then(cpscBrands => {
//                 db.restAPI.find({$and: [
//                         {'Products.Type' : amznCat},
//                         {'Manufacturers.Name' : {$in: cpscBrands[0]['cpscBrands'] }}
//                 ]}).count()
//                     .then(x => {
//                         res.json({
//                             success : true,
//                             data : x
//                         })
//                     })
//
//             })
//             .catch(x => {
//                 res.json({
//                     success: false,
//                     data: x
//                 })
//             })
//     })
// });


module.exports = router;
