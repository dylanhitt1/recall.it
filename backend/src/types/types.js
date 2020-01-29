import BrandMapperService from "../services/brand.mapper.service";
import express from 'express'
import MongoDB from "mongodb";
import SearchService from "../services/search.service";
import FeedbackService from "../services/feedback.service";
import AdminUtilsService from "../services/admin.utils.service";
import ScrapeService from "../services/scrape.service";
import CategoryFinderService from "../services/category.finder.service";
const Db = require('mongodb').Db;
const s = require('cookie-parser').JSONCookie
export interface Config {
    port: number,
    isDev: boolean,
    database: string,
    mode: 'dev' | 'prod',
    listRoutes: boolean
}

export interface Services {
    brandMapper: BrandMapperService,
    search: SearchService,
    feedback: FeedbackService,
    adminUtils: AdminUtilsService,
    scrape: ScrapeService,
    categoryService: CategoryFinderService
}

export interface Application extends express {
    locals: {
        services: Services,
        db: Db
    }
}

export interface JsonTokenDecoded {
    fullName: string,
    isAdmin: boolean,
    email: string
}

export interface Request extends express.request {
    app: Application,
    decoded: JsonTokenDecoded
}

export interface Response extends express.response {
    cookie: () => void
}
