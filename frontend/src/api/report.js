import {axios} from '../config'
import moment from 'moment'

export async function getReport (brand, productTitle, asin) {
    let response = await axios.get('/api/search', {
        params: {brand, productTitle, asin}
    });

    let report = response.data;

    //Format dates
    report.recalls = report.recalls.map(recall => {
        recall.date = moment(recall.date);
        recall.dateString = 'recalled ' + recall.date.format('MMM Do, YYYY');
        return recall;
    });

    report.recallsInCategory = report.recallsInCategory.map(recall => {
        recall.date = moment(recall.date);
        recall.dateString = 'recalled ' + recall.date.format('MMM Do, YYYY');
        return recall;
    });

    let barData = {
        labels: Object.keys(report.years),
        datasets: [{
            label: "Recalls",
            data: Object.values(report.years),
            backgroundColor: [
                '#4a90e2',
                '#b15252',
                '#f5a623',
                '#8b572a',
                '#59505c',
                '#121664',
                '#808080',
                '#4a90e2',
                '#b15252',
            ]
        }]
    };

    let pieData = {
        labels: report.hazards.map(x => x.name),
        datasets: [{
            label: "% of claims",
            data: report.hazards.map(x => x.value),
            backgroundColor: [
                '#4a90e2',
                '#b15252',
                '#f5a623',
                '#8b572a',
                '#59505c',
                '#121664',
                '#808080',
                '#4a90e2',
                '#b15252',
            ]
        }]
    };

    return {
        report: response.data,
        pieData: pieData,
        barData: barData,
        categoryId: report.categoryId
    }
}

export async function getBrandTable(category, tableState) {
    return axios.get('/api/brand-table', {
        params: {
            category,
            page: tableState.page + 1,
            limit: tableState.pageSize,
            sorted: tableState.sorted,
            filtered: tableState.filtered
        }
    })
}