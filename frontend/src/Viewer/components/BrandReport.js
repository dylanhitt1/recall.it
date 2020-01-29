import {Link} from "react-router-dom";
import {Redirect, Route, Switch, withRouter} from "react-router";
import {Bar, Pie} from "react-chartjs-2";
import RecallItem from "./RecallItem";
import React from "react";
import PropTypes from 'prop-types';
import Viewer from "../Viewer";
import {BetterNavLink} from "./BetterNavLink";
import {CategoryRecallList, Footer} from "./CategoryReport";
const year = (new Date()).getFullYear()

class BrandReport extends React.Component {

    static propTypes = {
        brand: PropTypes.string,
        recalls: PropTypes.array
    }

    static getHeaderLinks(base) {
        return [
            <BetterNavLink key={'summary'} to={base + '/summary' + Viewer.QUERY}>SUMMARY</BetterNavLink>,
            <BetterNavLink key={'list'} to={base + '/list' + Viewer.QUERY}>LIST</BetterNavLink>,
        ]
    }

    render() {

        const {report} = this.props
        const summaryPath = this.props.match.url + '/summary'
        const listPath = this.props.match.url + '/list'
        const yearRecallCount = (report.report.years[year] || 0) + (report.report.years[year - 1] || 0)
        const messages = []

        const realReport = report.report

        messages.push({
            message: `Showing data on ${realReport.category} made by ${realReport.brand}`
        });

        if (realReport.recallsInCategory.length > 0) {
            messages.push(
                {
                    message: `Go to ${realReport.category} report`,
                    onClick: () => {
                        this.props.history.push('/category' + Viewer.QUERY)
                    }
                });
        }


        return (
            <React.Fragment>
                <div className='content' style={{width: '450px', height: '500px'}}>
                    <Switch>
                        <Route path={summaryPath} render={(props) => {
                            return (
                                <div>
                                    <div className='grid'>

                                        <div>
                                            <h4>CPSC Data Reports</h4>
                                            <div style={{width: '200px', height: '250px'}}>
                                                <Bar
                                                    data={report.barData}
                                                    height={250}
                                                    width={200}
                                                    options={{
                                                        maintainAspectRatio: true,
                                                        legend: {display: false},
                                                        scales: {
                                                            xAxes: [{
                                                                gridLines: {display: false}
                                                            }],
                                                            yAxes: [{
                                                                display: false,
                                                                ticks: {
                                                                    beginAtZero: true
                                                                }
                                                            }]
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className='title-group'>most recent recalls</h4>
                                            {
                                                this.props.recalls.slice(0, 2).map(recall => <RecallItem
                                                    key={recall.recallID} short={true} recall={recall}/>)
                                            }
                                            <Link className='center' to={listPath + Viewer.QUERY}><b>view more</b></Link>
                                        </div>

                                    </div>
                                    <div className='grid'>
                                        <div>
                                            <h4 className='title-group'>{report.report.hazardCount} emergency room visits linked to {report.report.category.toLowerCase()}</h4>
                                            <p>found from NEISS Data Reports</p>
                                            <div style={{width: '200px'}}>
                                                <Pie
                                                    data={report.pieData}
                                                    height={200}
                                                    options={{
                                                        maintainAspectRatio: true,
                                                        legend: {display: false},
                                                        scales: {
                                                            xAxes: [{
                                                                display: false
                                                            }],
                                                            yAxes: [{
                                                                display: false
                                                            }]
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className='title-group'>hazards</h4>
                                            <ul className={'style-1'}>
                                                {
                                                    report.report.hazards.slice(0, 7).map((hazard, i) => {
                                                        if (i < 2) {
                                                            return <li key={hazard.name}><b>{hazard.name} ({hazard.value})</b></li>
                                                        }

                                                        return <li key={hazard.name}>{hazard.name} ({hazard.value})</li>
                                                    })
                                                }
                                            </ul>
                                        </div>

                                    </div>
                                </div>
                            )
                        }}/>
                        <Route path={listPath} render={(props) => {
                            return (
                                this.props.recalls.map((recall, i) => {
                                    return (
                                        <CategoryRecallList
                                            setFullscreen={this.props.setFullscreen}
                                            onClickThumb={this.onClickThumb}
                                            category={report.report.category}
                                            showPhoto={true}
                                            key={i}
                                            recall={recall}/>
                                    )
                                })
                            )
                        }}/>
                        <Redirect to={summaryPath + Viewer.QUERY}/>
                    </Switch>
                </div>
                <Footer messages={messages}/>
            </React.Fragment>
        )

    }
}

const ConnectedBrandReport = withRouter(BrandReport)
export default ConnectedBrandReport