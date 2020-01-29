import _ from 'lodash'

const initialState = {
    isLoggedIn: false,
    snackMessage: ''
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
     case 'LOGGED_IN':
         return _.merge({}, state, {
             isLoggedIn: true
         });
      case 'OPEN_SNACK':
          return _.merge({}, state, {
              snackMessage: action.data
          });
      case 'CLOSE_SNACK':
          return _.merge({}, state, {
              snackMessage: ''
          });
    default:
      return state;
  }
}
