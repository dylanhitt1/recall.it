import Mongo from 'mongodb'
import serverConfig from './config/server';

export default function getDB() {
    return new Promise(resolve => {
        let dbName = serverConfig.database.name
        let url = serverConfig.database.uri
        Mongo.MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            resolve(db.db(dbName))
        });
    })
}
