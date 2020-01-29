import BrandMapperService from "./brand.mapper.service"

const _ = require('lodash')
const Db = require('mongodb').Db
const cols = require('../config/server').collections;
import ScrapeService from "./scrape.service"
import CategoryFinderService from "./category.finder.service";

export default class SearchService {

    db: Db;
    brandMapper: BrandMapperService;
    scraper: ScrapeService;
    categoryFinder: CategoryFinderService;

    constructor(db, brandMapper: BrandMapperService, scraper: ScrapeService, categoryFinder: CategoryFinderService) {
        if (db === undefined) {
            throw new Error('Must provide a db connection')
        }

        this.brandMapper = brandMapper;
        this.categoryFinder = categoryFinder;
        this.db = db;
        this.scraper = scraper;
    }

    queryForCpscCategory = async (productCategory) => {
        let query = {'amazonItems': productCategory};
        let results = await this.db.collection(cols.MAPPING_DATA).find(query).toArray();
        return results.length > 0 ? results[0] : undefined
    };

    queryForCpscCategoryWithAsin = async (asinNumber) => {
        let query = {'asins': asinNumber};
        let results = await this.db.collection(cols.MAPPING_DATA).find(query).toArray();
        return results.length > 0 ? results[0] : undefined;
    };

    /**
     *
     * @param asin
     * @returns {Promise<void>}
     */
    getAmazonItem = async (asin) => {
        return this.db.collection(cols.AMAZON_ITEMS).findOne({asin})
    }

    queryRestApi = async (productBrand, productType) => {

        let brand = await this.brandMapper.resolveBrand(productBrand);

        if (brand && brand.reduced && brand.reduced.length > 0) {
            let resolvedBrand = brand.reduced[0];
            let resolveBrandName = resolvedBrand.matches[0].original;
            let results = await this.db.collection(cols.REST_API).aggregate([
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

            console.log(`Found ${results.length} brand based rest api recalls`)
            return results
        } else {
            console.error(`No brand found for: ${productBrand}`)
            return []
        }
    }

    queryRestApiV2 = async (productBrand, categories) => {

        let brand = await this.brandMapper.resolveBrand(productBrand);

        if (brand && brand.reduced && brand.reduced.length > 0) {
            let resolvedBrand = brand.reduced[0];
            let resolveBrandName = resolvedBrand.matches[0].original;
            let results = await this.db.collection(cols.REST_API).aggregate([
                {
                    $unwind: '$Manufacturers'
                },
                {
                    $match: {
                        $and: [
                            {'assignedCategory.0': categories[0]},
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

            console.log(`Found ${results.length} brand based rest api recalls`)
            return results
        } else {
            console.error(`No brand found for: ${productBrand}`)
            return []
        }
    }

    queryForCategoryRecalls = async (category) => {

        const tenYearsAgo = 10 * 365 * 24 * 60 * 60 * 1000;
        let queryDate = new Date(Date.now() - tenYearsAgo).toISOString();

        let results = await this.db.collection(cols.REST_API).aggregate([
            {
                $unwind: '$Manufacturers'
            },
            {
                $match: {
                    $and: [
                        {'Products.Type': category},
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
        return results
    };

    queryForCategoryRecallsV2 = async (categories) => {

        const tenYearsAgo = 10 * 365 * 24 * 60 * 60 * 1000;
        let queryDate = new Date(Date.now() - tenYearsAgo).toISOString();
        const first = new RegExp(categories[0], 'i')
        const second = new RegExp(categories[categories.length - 1], 'i')

        let results = await this.db.collection(cols.REST_API).aggregate([
            {
                $unwind: '$Manufacturers'
            },
            {
                $match: {
                    $and: [
                        {
                            $or: [
                                {'assignedCategory.0': {$regex: first}},
                                {'assignedCategory': {$regex: second}},
                            ]
                        },
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
                    Description: {$first: '$Description'},
                    assignedCategory: {$first: '$assignedCategory'},
                }
            },
            {
                $sort: {
                    RecallDate: -1
                }
            }
        ]).toArray();

        //Group them by the match of first or last category

        results = _.groupBy(results, r => {
            //Use more specific search option first
            if (second.test(r.assignedCategory.join('|')))
                return 'specific'
            return 'broad'
        })

        results = {
            specific: results.specific || [],
            broad: results.broad || [],
        }

        console.log(`Found ${results.specific.length} specific results, ${results.broad.length} broad results by category`)
        return results.specific && results.specific.length > 5 ? {
                category: categories[categories.length - 1],
                results: results.specific
            } :
            {
                category: categories[0],
                results: results.broad || []
            };

    };

    queryNeissData = async (cpscProductNumber) => {
        let query = {'product': cpscProductNumber};
        let results = await this.db.collection(cols.NEISS_DATA).find(query).toArray();

        let report = {};
        console.log(`Found ${results.length} NEISS claims`);
        report.hazardCount = results.length;
        report.hazards = {};
        for (let i = 0; i < results.length; i++) {
            let diagnosis = results[i].diagnosis;
            if (!(diagnosis in report.hazards)) {
                report.hazards[diagnosis] = 1
            } else {
                report.hazards[diagnosis] += 1
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

        return report
    };

    getBrandTable = async (category, skip, limit) => {

        let brandsInCategory = await this.db.collection(cols.REST_API).aggregate([
            {
                $match: {
                    'assignedCategory': category
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

        brandsInCategory = brandsInCategory.slice(skip, skip + limit);

        let brandTotals = brandsInCategory.length === 0
            ? []
            : await this.db.collection(cols.REST_API).aggregate([
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
            b.percentInCategory = (b.recallsInCategory / sumInCategory).toPrecision(2)
        })


        const pageCount = Math.ceil(count / limit);

        return {
            brands: brandsInCategory,
            sum: sumInCategory,
            pages: pageCount
        }
    };

    getCategoryInfo = async (asinNumber) => {
        let cpscResults = await this.queryForCpscCategoryWithAsin(asinNumber);
        if (!cpscResults) {
            let amznProduct = await this.scraper.findCategoryMatch(asinNumber);
            cpscResults = await this.queryForCpscCategory(amznProduct.category);
        }

        return cpscResults;
    };

    getCategoryInfoV2 = async (asin) => {
        let item = await this.getAmazonItem(asin)
        if (!item) {
            item = await this.scraper.findCategoryMatchV2(asin);
            //temp
            item.amznCategories = item.categories
        }

        return item;
    };

    getNeissClaims = async (neissCodes) => {

        //Ensure all codes are integers
        neissCodes = neissCodes.map(x => +x).filter(x => !Number.isNaN(x))
        let hazards = await this.db.collection(cols.NEISS_DATA).aggregate([
            {$match: {'product': {$in: neissCodes}}},
            {
                $group: {
                    _id: '$diagnosis',
                    value: { $sum: 1 }
                }
            },
            {
                $project: {_id: 0, name: '$_id', value: '$value'}
            },
            {
                $sort: {value: -1}
            }
        ]).toArray()

        return {
            hazardCount: Object.values(hazards).reduce((a, c) => a + c.value, 0),
            hazards
        }
    }

    getResultsV2 = async (asin, brand) => {
        try {
            const amazonItem = await this.getCategoryInfoV2(asin)
            const neissCodes = await this.categoryFinder.getProductCodesFromAmazonCategories(amazonItem.amznCategories)
            const [brandRecalls, categoryRecalls, neissData] = await Promise.all([
                this.queryRestApiV2(brand, amazonItem.amznCategories),
                this.queryForCategoryRecallsV2(amazonItem.amznCategories),
                this.getNeissClaims(neissCodes.results)
            ])

            if (brandRecalls && brandRecalls.length === 0
                && categoryRecalls && categoryRecalls.length === 0)
                return null

            return {
                category: categoryRecalls.category,
                categoryRecalls: categoryRecalls.results,
                neissCategory: neissCodes.category,
                neissData,
                amazonItem,
                brandRecalls,
            }
        } catch (e) {
            console.log('Error getting search results', e.message)
            return null
        }
    };

    getResults = async (asinNumber, brand) => {

        let categoryInfo = await this.getCategoryInfo(asinNumber);

        return Promise.all([
            this.queryRestApi(brand, categoryInfo.cpscName),
            this.queryForCategoryRecalls(categoryInfo.cpscName),
            this.queryNeissData(categoryInfo.cpscNumber),

        ]).then(([brandRecalls, categoryRecalls, neissData]) => {

            if (brandRecalls && brandRecalls.length === 0
                && categoryRecalls && categoryRecalls.length === 0)
                return null

            return {
                brandRecalls: brandRecalls,
                categoryRecalls: categoryRecalls,
                neissData: neissData,
                categoryId: categoryInfo.cpscNumber,
                category: categoryInfo.cpscName
            }
        }).catch(error => {
            return null;
        })
    }


}
