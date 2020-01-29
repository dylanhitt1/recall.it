import { combineReducers } from 'redux';
import appReducer from './app';
import { connectRouter } from 'connected-react-router'

export default history => combineReducers({
  router: connectRouter(history),
  app: appReducer,
});
