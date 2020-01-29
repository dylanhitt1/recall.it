const Db = require('mongodb').Db;
const cols = require('../config/server').collections;
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;
const utils = require('../utils.js');
const _ = require('lodash');

export default class AdminUtils {

    db: Db;

    constructor(db) {
        if (db === undefined) {
            throw new Error('Must provide a db connection')
        }

        this.db = db
    }

    updateMapping = async (mappingInfo) => {
        let query = mappingInfo._id ? {_id: new ObjectID(mappingInfo._id)} : {cpscNumber: mappingInfo.cpscNumber};

        await this.db.collection(cols.MAPPING_DATA).update(query, {
            amazonItems: mappingInfo.amazonItems,
            cpscName: mappingInfo.cpscName,
            cpscNumber: mappingInfo.cpscNumber
        },
        {upsert: true})
    };

    getMapping = async () => {
        let result = this.db.collection(cols.MAPPING_DATA).find().toArray();
        return result;
    };

    getUsers = async () => {
        let userBlob = this.db.collection(cols.USERS).find().toArray();
        return userBlob;
    };

    getRecalls = async (limit, skip) => {
        let recalls = this.db.collection(cols.REST_API).find({}, {
            fields: {
                RecallID: 1,
                RecallNumber: 1,
                RecallDate: 1,
                Description: 1,
                URL: 1,
                Title: 1
            }
        }).skip(skip).limit(limit).toArray();
        let count = this.db.collection(cols.REST_API).find().count();
        const pageCount = Math.ceil(await count / limit);
        return {
            data: await recalls,
            pages: pageCount
        }
    };

    createUser = async (userInfo) => {
        let hash = await utils.getHash(userInfo);
        let response = this.db.collection(cols.USERS).update(
            {email: userInfo.email},
            {
                email: userInfo.email,
                password: hash,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                isAdmin: userInfo.isAdmin
            },
            {upsert: true}
        );
        return response;
    };

    deleteUser = async (email) => {
        if (email === undefined) {
            return false;
        }
        console.log(email);
        let bool = this.db.collection(cols.USERS).deleteOne({
            email: email
        });
        return bool;
    };

    getRecall = async (id) => {
        let recall = this.db.collection(cols.REST_API).findOne({
            _id: new ObjectID(id)
        });
        return recall;
    };

    updateRecall = async (recall) => {

        let {_id, ...payload} = recall;
        let id = new ObjectID(_id);
        let result = this.db.collection(cols.REST_API).updateOne({_id: id}, {$set: payload})
        return result;
    };

    deleteFeedback = async (feedbackId) => {
        let _id = new ObjectID(feedbackId);
        let response = this.db.collection(cols.PRODUCT_FEEDBACK).deleteOne({
            _id: _id
        });

        return response;
    };

    updateFeedback = async (feedback) => {
        let {_id, ...payload} = feedback;
        let id = new ObjectID(_id);
        let result = this.db.collection(cols.PRODUCT_FEEDBACK).updateOne({_id: id}, {$set: payload});
        return result;
    };

    getRecallsFeedback = async (skip, limit) => {
        const groupData = (feedbackData, recalls) => {
            let recallsFeedback = [];
            recalls.forEach(recall => {
                let feedback = _.find(feedbackData, {recallID: +recall['RecallID']});
                recallsFeedback.push({
                    recall: recall,
                    feedback: feedback
                })
            });
            return recallsFeedback;
        };

        let feedbackCount = this.db.collection(cols.FEEDBACK_DATA).find().count();
        let feedback = await this.db.collection(cols.FEEDBACK_DATA).find({negCount: {$gte: 10}})
            .skip(skip)
            .limit(limit)
            .toArray();

        let recallIds = feedback.map(function (feedback) {return feedback.recallID});
        let recalls = this.db.collection(cols.REST_API).find({
            RecallID: {$in: recallIds}}).toArray();

        let recallsFeedback = {
            pages: Math.ceil(await feedbackCount / limit),
            data: groupData(feedback, await recalls)
        };
        return recallsFeedback;
    }

    getRecallsFeedbackV2 = async (skip, limit) => {

        let [count, recallsFeedback] = await Promise.all([
            this.db.collection(cols.PRODUCT_FEEDBACK).countDocuments(),
            this.db.collection(cols.REST_API).aggregate([
                {
                    $lookup: {
                        from:'productFeedback',
                        localField: 'RecallID',
                        foreignField: 'recallId',
                        as: 'feedback'
                    }
                },
                {$unwind: '$feedback'},
                {$skip: skip},
                {$limit: limit}

            ]).toArray()
        ]);

        let pages = Math.ceil(await count/limit);

        return {
            pages,
            data: recallsFeedback
        }
    }

}