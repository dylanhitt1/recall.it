import axios from '../util/axios';

export async function getMappings() {
    try {
        let result = await axios.get('/admin/mapping')
        return result.data
    } catch(reason) {
        console.log('Failed to get mappings', reason)
    }
}

export function setLoggedIn() {
    return (dispatch) => {
        dispatch({type: 'LOGGED_IN'})
    }
}


export function setSnack(message) {
    return (dispatch) => {
        dispatch({type: 'OPEN_SNACK', data: message})
    }
}

export function closeSnack() {
    return (dispatch) => {
        dispatch({type: 'CLOSE_SNACK'})
    }
}

export function saveRecall(recall) {
    return (dispatch) => {
        return new Promise(res => {
            axios.post('/admin/update-recall', recall)
                .then(response => {
                    res(true)
                })
                .catch(reason => {
                    console.log('Failed', reason);
                    res(false)
                })
        })
    }
}

export function saveFeedbackAndRecall(data) {
    console.log(data.recall);
    return (dispatch) => {
        return new Promise(res => {

            Promise.all([
                axios.post('/admin/update-recall', data.recall),
                axios.post('/admin/delete/feedback', data.feedback)
            ]).then(response => {
                res(true)
            }).catch(reason => {
                console.log('Failed', reason);
                res(false)
            })
        })
    }
}


