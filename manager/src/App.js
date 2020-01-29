import React from 'react';
import PropTypes from 'prop-types';
import SimpleNav from './components/SimpleNav';
import DefaultPage from './components/DefaultPage'
import routeConfig from './util/routeConfig';
import { Link, Route, Switch, Redirect } from 'react-router-dom'
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import * as actions from "./actions";
import Typography from 'material-ui/Typography';
import Snackbar from 'material-ui/Snackbar';
import Fade from 'material-ui/transitions/Fade';
import UploadDataPage from './components/UploadDataPage'
import MapDataPage from './components/MapDataPage'
import ManagerUserPage from './components/ManagerUserPage'
import ManageRecalls from './components/ManageRecalls'

import './App.scss'
import './global.scss'
import {closeSnack} from "./actions";

/*
  This is the root component of your app. Here you define the overall layout
  and the container of the react router. The default one is a two columns layout.
  You should adjust it according to the requirement of your app.
*/
class App extends React.Component {
  static propTypes = {
    children: PropTypes.node,
    isLoggedIn: PropTypes.bool.isRequired,
    snack: PropTypes.string,
      closeSnack: PropTypes.func
  };

  static defaultProps = {
    children: 'No content.',
  };

  render() {
    return (
        <div className="home-app">
          <div className="sidebar">
            <SimpleNav routes={routeConfig}/>
            <p className="memo">
              This is the admin portal for the CPSC browser extension. To request a login please contact the system administrator at <br/><a className='alt' href='mailto:cpsc.extension@gmail.com?subject=Login Requested'>this address</a>
            </p>
          </div>
          <div className="page-container">
            {
              this.props.isLoggedIn ?
                  (
                      <Switch>
                        <Route path='/app/upload-data' component={UploadDataPage}/>
                        <Route path='/app/map-data' component={MapDataPage}/>
                        <Route path='/app/manage-users' component={ManagerUserPage}/>
                        <Route path='/app/manage-recalls' component={ManageRecalls}/>
                        <Redirect to='/app/manage-recalls'/>
                      </Switch>
                  ):
                  <Redirect to='/app'/>
            }
            <Route exact path='/app' component={DefaultPage}/>
            <footer>
              <Typography variant='body2'><b>Created by</b></Typography>
              <Typography variant='body1'>Dylan Hitt and Jonathan Witchard</Typography>
            </footer>
          </div>
          <Snackbar
              open={this.props.snack.length > 0}
              onClose={this.props.closeSnack}
              transition={Fade}
              SnackbarContentProps={{
                'aria-describedby': 'message-id',
              }}
              message={<span id="message-id">{this.props.snack}</span>}
          />
        </div>
    );
  }
}

/* istanbul ignore next */
function mapStateToProps(state) {
  return {
    isLoggedIn: state.app.isLoggedIn,
    snack: state.app.snackMessage
  };
}

/* istanbul ignore next */
function mapDispatchToProps() {
  return {
      closeSnack
  };
}

const enhanced = connect(
    mapStateToProps,
    mapDispatchToProps
)(App);

export default enhanced
