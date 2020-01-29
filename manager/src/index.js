import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Root from './Root';
import * as serviceWorker from './serviceWorker';
import {createMuiTheme, MuiThemeProvider} from 'material-ui/styles';
import {store, history} from "./util/storeAndHistory";

const theme = createMuiTheme({
    palette: {
        primary: {
            main: '#143863'
        }
    },
    typography: {
        fontFamily: '"Open Sans", sans-serif',
        display4: {
            fontFamily: '"Oxygen", sans-serif',
            fontSize: 36,
            fontWeight: "bold",
        },
        display3: {
            fontSize: 30,
            fontWeight: 300,
            fontFamily: '"Oxygen", sans-serif',
            color: '#4A4A4A',
            letterSpacing: 0
        },
        display2: {
            fontSize: 22,
            color: '#6d6d6d'
        },
        body1: {
            fontWeight: 300,
        },
        body2: {
            fontWeight: 400
        },
        subheading: {
            fontSize: 16
        },
        title: {
            fontSize: 16,
            color: 'rgba(0,0,0,0.40)',
            marginTop: 10
        }
    },
});

const render = (app) => {
    ReactDOM.render(
        <MuiThemeProvider theme={theme}>
            <Root history={history} store={store}/>
        </MuiThemeProvider>,
        document.getElementById('root')
    )
}

render();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
