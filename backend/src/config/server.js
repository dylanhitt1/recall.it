/**
 * Defines server configuration
 */

const uri = process.env.MONGO_URL || 'mongodb://localhost:27017'

module.exports = {
        port: 3111,
        host: 'http://localhost',
        tokenDuration: '8 hours',
        cookieName: '_rIt',
        signingKey: 'p4_&u+RP6I-11sC$%"s+dn@F?l>LzM/^?VYSG-[B1.}Y>-).`^|X(TXcSwh)oBU',
        database: {
            uri,
            name: 'recall_it',
    },
    collections: {
        MAPPING_DATA: 'mappingData',
        AMAZON_ITEMS: 'amazonItems',
        RECALL_CATEGORIES: 'recallCategories',
        REST_API: 'restAPI',
        FEEDBACK_DATA: 'feedbackData',
        CONSUMER_DATA: 'consumerData',
        NEISS_DATA: 'neissData',
        USERS: 'users',
        PRODUCT_FEEDBACK: 'productFeedback',
        NEISS_CODES: 'neissProductCodes'
    }
};
