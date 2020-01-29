import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import configureStore from './redux/configureStore'
import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';
import 'iframe-resizer/js/iframeResizer.contentWindow'

// NOTE 1: DO NOT CHANGE the 'reducerMap' name and the declaration pattern.
// This is used for Rekit cmds to register new features, remove features, etc.
// NOTE 2: always use the camel case of the feature folder name as the store branch name
// So that it's easy for others to understand it and Rekit could manage theme.

const reducerMap = {
    router: routerReducer,
};

const rootReducer = combineReducers(reducerMap);

const {store, history} = configureStore({}, rootReducer);

ReactDOM.render(<App store={store} history={history} />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
