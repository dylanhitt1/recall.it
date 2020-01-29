const express = require('express');
const router = express.Router();
const utils = require('../utils.js');
const path = require('path')
const _ = require('lodash');
const paginate = require('express-paginate');

const queryForCpscCategory = async (db, productCategory) => {
    let query = {'amazonItems': productCategory};
    let results = await db.mappingData.find(query).toArray();
    return results.length > 0 ? results[0] : undefined;
};


router.get('/', (req, res) => {
    res.sendFile(path.join(req.app.get('webPath'), 'iframe.html'));
});

router.get('/search', async (req, res) => {

    // Store query values
    let productBrand = req.query.brand;
    let productCategories = (req.query.categories || '').split(',');
    let productCategory = productCategories[productCategories.length - 1].trim();
    let query;
    let resolvedBrand, resolveBrandName;

    let BrandMapper = req.app.locals.services.brandMapper;

    const parseRecallData = (r) => {

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
    };

    const renderResults = (recalls, catRecalls, neissData, categoryId) => {
        let recallYears = {};   // for number of recalls by year

        recalls.forEach(recall => {
            let year = +recall.RecallDate.substring(0, 4);
            if (!(year in recallYears)) {
                recallYears[year] = 1;
            }
            else {
                recallYears[year]++;
            }
        });

        productBrand = resolveBrandName || productBrand;

        res.json({
            productTitle: req.query.productTitle || 'No Product Title',
            category: productCategory || 'No Category',
            brand: productBrand,
            recallCount: recalls.length,
            recalls: recalls.slice(0, 5).map(parseRecallData),
            catRecalls: catRecalls.map(parseRecallData),
            hazardCount: neissData.hazardCount,
            hazards: neissData.hazards,
            years: recallYears,
            categoryId: categoryId
        });
    };

    const renderNoResults = () => {
        console.log('No results for', query);
        res.status(404).json();
    };

    const renderWithError = (error) => {
        console.log('Error with query', JSON.stringify(query));
        res.status(500).json({error: error})
    };

    const queryRestApi = async (db, productType) => {

        let brandMapper = new BrandMapper();
        let brand = await brandMapper.resolveBrand(productBrand);

        if (brand.reduced) {
            resolvedBrand = brand.reduced[0];
            resolveBrandName = resolvedBrand.matches[0].original;
            query = {};

            let results = await db.restAPI.aggregate([
                {
                    $unwind: '$Manufacturers'
                },
                {
                    $match: {
                        $and: [
                            {'Products.Type': productType},
                            {'Manufacturers.assignedId': brand.reduced[0]._id}
                        ]
                    }
                },
                {
                    $addFields: {
                        brandName: resolveBrandName
                    }
                }
            ]).toArray();

            console.log(`Found ${results.length} brand based rest api recalls`);
            return results;
        } else {
            //No brand found
            console.error(`No brand found for: ${productNum}`);
            return [];
        }
    };

    const queryForCategoryRecalls = async (db, productType) => {
        const tenYearsAgo = 10 * 365 * 24 * 60 * 60 * 1000;

        let queryDate = new Date(Date.now() - tenYearsAgo).toISOString();

        let results = await db.restAPI.aggregate([
            {
                $unwind: '$Manufacturers'
            },
            {
                $match: {
                    $and: [
                        {'Products.Type': productType},
                        {'RecallDate': {$gte: queryDate}}
                    ]
                }
            },
            {
                $lookup: {
                    from: 'brands',
                    localField: 'Manufacturers.assignedId',
                    foreignField: '_id',
                    as: 'brand'
                }
            },
            {
                $match: {
                    "brand": {$ne: []}
                }
            },
            {
                $group: {
                    _id: '$RecallID',
                    Products: {$first: '$Products'},
                    Images: {$first: '$Images'},
                    Hazards: {$first: '$Hazards'},
                    RecallDate: {$first: '$RecallDate'},
                    brand: {$push: '$brand'},
                    Manufacturers: {$push: '$Manufacturers'},
                    URL: {$first: '$URL'},
                    injunction: {$first: '$Inconjunctions'},
                    Description: {$first: '$Description'}
                }
            },
            {
                $sort: {
                    RecallDate: -1
                }
            }
        ]).toArray();

        console.log(`Found ${results.length} category based rest api recalls`);
        return results;
    };

    const queryNeissData = (db, cpscProductNumber) => {
        return new Promise(resolve => {
            query = {'product': cpscProductNumber};
            db.neissData.find(query).toArray()
                .then(results => {
                    let report = {};
                    console.log(`Found ${results.length} NEISS claims`);
                    report.hazardCount = results.length;
                    report.hazards = {};
                    for (let i = 0; i < results.length; i++) {
                        let diagnosis = results[i].diagnosis;
                        if (!(diagnosis in report.hazards)) {
                            report.hazards[diagnosis] = 1;
                        }
                        else {
                            report.hazards[diagnosis] += 1;
                        }
                    }

                    report.ohazards = Object.keys(report.hazards)
                        .map(key => {
                            return {
                                name: key,
                                value: report.hazards[key]
                            }
                        });

                    report.hazards = _.sortBy(report.ohazards, 'value').reverse();

                    //pass results
                    resolve(report)
                })
        })
    };

    let db = await utils.getDB();
    let cpscResults = await queryForCpscCategory(db, productCategory);

    if (cpscResults === undefined) {
        renderNoResults();
        return;
    }

    let productType = cpscResults.cpscName;
    let productNum = cpscResults.cpscNumber;

    //Since last queries don't depend on each other, run in parallel
    Promise.all([
        queryRestApi(db, productType),
        queryForCategoryRecalls(db, productType),
        queryNeissData(db, productNum)
    ]).then(([brandRecalls, categoryRecalls, neissData]) => {
        renderResults(brandRecalls, categoryRecalls, neissData, productNum)
    }).catch(renderNoResults)
});

router.get('/feedback', (req, res) => {
    let id = req.query.recallID;
    let query = {'recallID': +id};
    let inc = {$inc: {negCount: 1}};
    let newObj = {
        recallID: +id,
        infos: [
            {
                amazonUrl: req.query.amzn || "",
                extensionPage: req.query.extn || "",
            }
        ],
        negCount: 1
    };

    utils.getDB().then(db => {
        db.feedbackData.find(query).toArray().then(results => {
            if (results.length == 0) {
                db.feedbackData.insertOne(newObj, function (err, response) {
                    if (err) console.log(err);
                    else {
                        console.log(`RecallID: ${id} feedback log created.`);
                        res.json({});
                    }
                });
            } else {
                db.feedbackData.update(query, inc, function (err, response) {
                    if (err) console.log(err);
                    else {
                        console.log(`RecallID: ${id} feedback incremented.`);
                        res.json({});
                    }
                });
            }
        });
    });
});

router.get('/brand-table', [paginate.middleware(10, 50), async (req, res) => {
    let category = req.query.category;
    let db = await utils.getDB();
    let cpscData = await queryForCpscCategory(db, category);

    if (cpscData === undefined) {
        res.json([]);
        return;
    }

    let productType = cpscData.cpscName;

    let brandsInCategory = await db.restAPI.aggregate([
        {
            $match: {
                'Products.Type': productType
            }
        },
        {
            $unwind: '$Manufacturers'
        },
        {
            $project: {
                manufacturerId: '$Manufacturers.assignedId'
            }
        },
        {
            "$group": {
                _id: '$manufacturerId',
                count: {$sum: 1}
            }
        },
        {
            $lookup: {
                from: 'brands',
                localField: '_id',
                foreignField: '_id',
                as: 'brand'
            }
        },
        {
            $match: {
                "brand": {$ne: []}
            }
        },
        {
            $project: {
                _id: '$_id',
                recallsInCategory: '$count',
                brand: {$arrayElemAt: ['$brand.matches.original', 0]}
            }
        },
        {
            $sort: {
                recallsInCategory: -1,
            }
        }
    ]).toArray();
    let count = brandsInCategory.length;
    let sumInCategory = _.sumBy(brandsInCategory, 'recallsInCategory') || 0;

    brandsInCategory = brandsInCategory.slice(req.skip, req.skip + req.query.limit);

    let brandTotals = brandsInCategory.length === 0
        ? []
        : await db.restAPI.aggregate([
            {
                $unwind: '$Manufacturers'
            },
            {
                $match: {
                    'Manufacturers.assignedId': {$in: brandsInCategory.map(m => m._id)}
                }
            },
            {
                $project: {
                    manufacturerId: '$Manufacturers.assignedId'
                }
            },
            {
                $group: {
                    _id: '$manufacturerId',
                    totalRecalls: {$sum: 1}
                }
            },
        ]).toArray();

    brandsInCategory.forEach(b => {
        let other = _.find(brandTotals, {'_id': b._id});
        b.totalRecalls = other.totalRecalls;
        b.brand = b.brand[0];
        b.percentInCategory = (b.recallsInCategory / sumInCategory).toPrecision(2);
    });


    const pageCount = Math.ceil(count / req.query.limit);

    res.json({
        brands: brandsInCategory,
        sum: sumInCategory,
        hasMore: paginate.hasNextPages(req)(pageCount),
        pages: pageCount
    })

}]);

module.exports = router;
