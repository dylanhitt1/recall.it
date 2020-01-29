import React from "react";
import PropTypes from "prop-types";
import {Provider} from "react-redux";
import { ConnectedRouter } from 'connected-react-router';
import App from './App'

export default class Root extends React.Component {
    static propTypes = {
        store: PropTypes.object.isRequired,
        history: PropTypes.object.isRequired,
    };

    render() {
        return (
            <Provider store={this.props.store}>
                <ConnectedRouter history={this.props.history}>
                    <App/>
                </ConnectedRouter>
            </Provider>
        );
    }
}