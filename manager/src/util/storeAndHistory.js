import {createStore, applyMiddleware, compose} from 'redux';
import thunk from 'redux-thunk';
import rootReducer from '../reducers/index';
import createHistory from "history/createBrowserHistory";
import { routerMiddleware } from 'connected-react-router'

import {createLogger} from "redux-logger";

const history = createHistory();
const router = routerMiddleware(history);

const middlewares = [
    thunk,
    router,
];

let devToolsExtension = f => f;


if (process.env.NODE_ENV !== 'production') {
    const logger = createLogger({collapsed: true});
    middlewares.push(logger);

    if (window.devToolsExtension) {
        devToolsExtension = window.devToolsExtension();
    }
}

export default function configureStore(initialState) {
    const store = createStore(rootReducer(history), initialState, compose(
        applyMiddleware(...middlewares),
        devToolsExtension
    ));

    if (module.hot) {
        // Enable Webpack hot module replacement for reducers
        module.hot.accept('../reducers/index', () => {
            const nextRootReducer = require('../reducers/index').default;
            store.replaceReducer(nextRootReducer);
        });
    }
    return store;
}


let store = configureStore()

export {store, history}