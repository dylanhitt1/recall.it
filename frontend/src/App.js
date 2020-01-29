import React, {Component} from 'react';
import './App.css';
import './normalize.scss';
import Viewer from './Viewer'
import {Provider} from 'react-redux'
import {BrowserRouter} from 'react-router-dom'

class App extends Component {

    render() {

        let {store} = this.props

        return (
            <Provider store={store}>
                <BrowserRouter>
                    <Viewer/>
                </BrowserRouter>
            </Provider>
        )
    }
}

export default App;
