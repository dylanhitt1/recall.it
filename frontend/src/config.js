import _axios from "axios";

export const baseURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3111';
export const axios = _axios.create({
    baseURL: baseURL
})