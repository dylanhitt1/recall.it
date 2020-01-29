const Db = require('mongodb').Db;
const cols = require('../config/server').collections

export default class FeedbackService {

    db: Db

    constructor(db) {
        if (db === undefined) {
            throw new Error('Must provide a db connection')
        }

        this.db = db
    }

    addProductFeedback = async (id, feedback) => {
        if(!id || !feedback)
            throw new Error('Must provide feedback and recall id')

        //Check to see if the recall exists
        let exists = await this.db.collection(cols.REST_API).findOne({RecallID: id})

        if(!exists) {
            throw new Error('Recall does not exist')
        }

        return this.db.collection(cols.PRODUCT_FEEDBACK)
            .insertOne({
                recallId: id,
                date: new Date(),
                feedback
            })
    }

    increment = async (id, amazonUrl, extensionPage) => {
        let query = {'recallID': +id};
        let inc = {$inc: {negCount: 1}};
        let newObj = {
            recallID: +id,
            infos: [
                {
                    amazonUrl: amazonUrl || "",
                    extensionPage: extensionPage || "",
                }
            ],
            negCount: 1
        };

        let results = await this.db.collection(cols.FEEDBACK_DATA).find(query).toArray()

        if (results.length === 0) {
            let response = await this.db.collection(cols.FEEDBACK_DATA).insertOne(newObj)
            if (err) {
                throw new Error('err')
            } else {
                //todo: remove these - they are synchronous
                console.log(`RecallID: ${id} feedback log created.`);
                return true;
            }
        } else {
            //TODO: update is deprecated
            let response = await this.db.collection(cols.FEEDBACK_DATA).updateOne(query, inc)
            if (false) {
                console.log(err)
                throw new Error(err)
            } else {
                //todo: remove these - they are synchronous
                console.log(`RecallID: ${id} feedback incremented.`);
                return true;
            }
        }
    }
}
