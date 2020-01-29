import axios from 'axios'

export const baseURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3111';

let client = axios.create({
    baseURL: baseURL,
    timeout: 100000000,
});

export default client