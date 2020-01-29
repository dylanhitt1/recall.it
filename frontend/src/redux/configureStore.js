import thunk from 'redux-thunk';
import { createBrowserHistory } from 'history'
import { applyMiddleware, compose, createStore } from 'redux'

const middlewares = [
    thunk,
];

let devToolsExtension = f => f;

if (process.env.NODE_ENV === 'development') {
    const { createLogger } = require('redux-logger');

    const logger = createLogger({ collapsed: true });
    middlewares.push(logger);

    if (window.devToolsExtension) {
        devToolsExtension = window.devToolsExtension();
    }
}

const history = createBrowserHistory()

export default function configureStore(initialState, rootReducer) {
    const store = createStore(rootReducer, initialState, compose(
        applyMiddleware(...middlewares),
        devToolsExtension
    ));

    return {store, history};
}
