import {Redirect, Route, Switch, withRouter} from "react-router";
import React from "react";
import PropTypes from 'prop-types';
import first from 'lodash/first'
import map from 'lodash/map'
import './CategoryReport.scss'
import ReactTable from 'react-table';
import 'react-table/react-table.css'
import {getBrandTable} from "../../api/report";
import history from '../../util/history'
import Viewer from "../Viewer";
import {BetterNavLink} from "./BetterNavLink";
import Popup from "reactjs-popup";
import {axios} from '../../config'

const numeral = require('numeral');

const Events = {
    FULL_SCREEN: 0,
    REGULAR_SCREEN: 1
}

export const Footer = ({messages}) => {
    return (
        <footer>
            {
                messages.map((bar, i) => {
                    if (bar.onClick) {
                        return (
                            <div className='barlink' onClick={bar.onClick} key={i}>{bar.message}</div>
                        )
                    }
                    return (
                        <div key={i}>{bar.message}</div>
                    )
                })
            }
        </footer>
    )
}


export class CategoryRecallList extends React.Component {

    static propTypes = {
        recall: PropTypes.any,
    };

    state = {
        expanded: false,
        open: false,
        feedback: ''
    };

    toggleExpanded = () => {
        this.setState({expanded: !this.state.expanded})
    };

    openModal = () => {

        if (Viewer.parentIframe) {
            this.props.setFullscreen(true)
            Viewer.parentIframe.sendMessage(Events.FULL_SCREEN)
        }

        this.setState({open: true})
    }
    closeModal = () => {

        if (Viewer.parentIframe) {
            this.props.setFullscreen(false)
            Viewer.parentIframe.sendMessage(Events.REGULAR_SCREEN)
        }

        this.setState({open: false})
    }

    handleFeedbackChange = (event) => {
        this.setState({feedback: event.target.value});
    }

    submitFeedback = async () => {

        await axios.post('/api/feedback', {
            recallId: this.props.recall.recallID,
            feedback: this.state.feedback
        })

        this.setState({open: false, feedback: ''})
    }

    render() {

        const {recall, category} = this.props;
        const {expanded} = this.state;
        const hasImages = recall.images.length > 0;
        const hasHazards = recall.hazards.length > 0;

        let images = recall.images;

        if (expanded === false && hasImages) {
            images = [first(recall.images)]
        }

        return (
            <div data-recall-id={recall.recallID}
                 className={['categoryReportItem', hasImages ? '' : '-no-images'].join(" ")}>
                <Popup
                    trigger={<span className={'-feedback-button'}/>}
                    position="left top"
                    on="hover"
                    closeOnDocumentClick
                    mouseLeaveDelay={200}
                    mouseEnterDelay={100}
                    contentStyle={{
                        padding: '0',
                        boxShadow: 'rgba(0, 0, 0, 0.25) 0px 2px 7px 3px',
                        border: 'none'
                    }}
                >
                    <ul>
                        <li onClick={this.openModal}>Give Feedback on Recall</li>
                    </ul>
                </Popup>

                <div className={'-images'}>
                    {hasImages
                        ? (map(images, (image, i) => <img className={'-photo'} src={image}
                                                          key={i}/>))
                        : null
                    }
                </div>
                <div className='-content'>
                    <p className='intro-text'>{recall.brand}</p>
                    <b className="productCatName">{recall.productName}</b>
                    <p className='-bubbles'>
                        <span className='-orange'>{recall.dateString}</span>
                        {
                            recall.sold ? (
                                <span className='-brown'>sold ~ {numeral(recall.sold).format('0,0')}</span>
                            ) : null
                        }
                    </p>
                    <div className='-urls'>
                        <a target='_blank' href={recall.url}>cpsc</a>
                        {
                            recall.injunction
                                ? (<a target='_blank' href={recall.injunction}>injunction</a>)
                                : null
                        }
                    </div>
                </div>
                {
                    expanded ? (
                        <div className='-details'>
                            {
                                hasHazards ? (
                                    <div className='-hazards productCatName'>
                                        <p>hazards{recall.hazards.map((h, i) => <span key={i}>{h}</span>)}</p>
                                    </div>
                                ) : null
                            }
                            <p className='-description productCatName'>description{
                                <span>{recall.description}</span>}</p>
                        </div>
                    ) : null
                }
                <div className='-footer' onClick={this.toggleExpanded}>
                    {expanded ? 'Collapse' : 'View details'}
                </div>
                <Popup
                    open={this.state.open}
                    onClose={this.closeModal}
                    contentStyle={{
                        maxWidth: 400,
                        maxHeight: 450,
                        width: 400,
                        height: 450,
                    }}
                >
                    <div id='feedback-modal'>
                        <h2>Feedback</h2>
                        <h3>{recall.productName}</h3>
                        <p><b>Brand:</b> {recall.brand}</p>
                        <p><b>Category:</b> {category}</p>
                        <textarea value={this.state.feedback} onChange={this.handleFeedbackChange}
                                  placeholder='Comments on this product recall'/>
                        <button disabled={this.state.feedback === ''} onClick={this.submitFeedback}>Submit</button>
                        <button className='cancel' onClick={this.closeModal}>Cancel</button>
                    </div>
                </Popup>
            </div>
        )
    }
}

class BrandTable extends React.Component {

    state = {
        loading: true,
        pages: 0,
        data: []
    };

    getData = async (tableState) => {
        let c = this.props.category;
        try {
            let {data} = await getBrandTable(c, tableState)
            this.setState({
                data: data.brands || [],
                pages: data.pages,
                loading: false
            });
        } catch (e) {
            console.log('Error', e);
            alert(JSON.stringify(e))
        }
    };

    render() {
        const {pages, loading, data} = this.state;
        return (
            <ReactTable
                style={{width: '100%'}}
                className={'-striped -highlight'}
                defaultPageSize={10}
                data={data}
                columns={BrandTable.columns}
                manual
                sortable={false}
                loading={loading}
                pages={pages}
                onFetchData={(state) => {
                    // show the loading overlay
                    this.setState({loading: true});
                    this.getData(state);
                }}
                SubComponent={this.getSubComponent}
            />
        )
    }
}

BrandTable.columns = [
    {
        Header: 'Brand',
        accessor: 'brand',
    },
    {
        Header: 'Recalls in Category',
        accessor: 'recallsInCategory',
        className: '-txt-right'
    },
    // {
    //     Header: '% Recalls in Category',
    //     accessor: 'percentInCategory',
    //     className: '-txt-right'
    // },
    {
        Header: 'Total Recalls',
        accessor: 'totalRecalls',
        className: '-txt-right'
    }
];

class CategoryReport extends React.Component {

    static getHeaderLinks(base) {
        return [
            <BetterNavLink key={'recalls'} to={base + '/recalls' + Viewer.QUERY}>RECALLS</BetterNavLink>,
            <BetterNavLink key={'brands'} to={base + '/brands' + Viewer.QUERY}>BRANDS</BetterNavLink>,
        ]
    }

    render() {

        const {report} = this.props
        const recallListPath = this.props.match.url + '/recalls'
        const brandListPath = this.props.match.url + '/brands'
        const messages = []
        messages.push(
            {
                message: `Showing ${report.recallsInCategory.length} recall${report.recallsInCategory.length > 1 ? 's' : ''} on ${report.category}`,
            });

        if (report.recallCount > 0) {
            messages.push(
                {
                    message: `Go to ${report.brand} report`,
                    onClick: () => {
                        this.props.history.push('/brand/summary' + Viewer.QUERY)
                    }
                });
        }

        return (
            <React.Fragment>
                <div className='content' style={{width: '450px', height: '500px'}}>
                    <Switch>
                        <Route path={recallListPath} render={(props) => {
                            return (
                                <React.Fragment>
                                    {/*<p className={'subtitle'}>{`found ${report.recallsInCategory.length} recalls in the past decade`}</p>*/}
                                    {report.recallsInCategory.slice(0, 100).map((recall, i) =>
                                        <CategoryRecallList
                                            onClickThumb={this.onClickThumb}
                                            setFullscreen={this.props.setFullscreen}
                                            category={report.category}
                                            showPhoto={true}
                                            key={i}
                                            recall={recall}/>)}
                                </React.Fragment>
                            )
                        }}/>

                        <Route path={brandListPath} render={(props) => {
                            return (
                                <React.Fragment>
                                    <BrandTable category={report.category}/>
                                </React.Fragment>
                            )
                        }}/>

                        <Redirect to={recallListPath + Viewer.QUERY}/>
                    </Switch>
                </div>
                <Footer messages={messages}/>
            </React.Fragment>
        )

    }
}

CategoryReport.propTypes = {
    brand: PropTypes.string,
    recalls: PropTypes.array,
    setFullscreen: PropTypes.func
}

const ConnectedCategoryReport = withRouter(CategoryReport)
export default ConnectedCategoryReport