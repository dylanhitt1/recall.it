import * as React from "react";
import {getParameterByName} from '../util'
import './Viewer.scss'
import {Switch, Route, Redirect} from 'react-router'
import {getReport} from '../api/report'
import ReportSummary from './components/ReportSummary'
import Logo from './components/Logo'
import BrandReport from './components/BrandReport'
import CategoryReport from "./components/CategoryReport";
import {NavLink} from "react-router-dom";
import $ from "jquery";

const maxBodyHeight = $('html, body').height('100%').height();

function superEncodeURI(url) {

    let encodedStr = '', encodeChars = ["(", ")"];
    url = encodeURI(url);

    for(let i = 0, len = url.length; i < len; i++) {
        encodedStr += encodeChars.indexOf(url[i]) >= 0
            ? '%' + parseInt(url.charCodeAt(i)).toString(16)
            : url[i]
    }

    return encodedStr
}

export default class Viewer extends React.Component {

    static QUERY: string
    static parentIframe;
    static PARENT_AUTO_SIZE_DISABLED = false;

    state = {
        ready: false,
        show: true,
        shown: false,
        fullscreen: false,
        maxContentHeight: maxBodyHeight
    }

    constructor(props) {
        super(props)
        Viewer.QUERY = superEncodeURI(decodeURIComponent(props.history.location.search))
    }

    componentDidMount() {
        //Search for the report
        this.getReport()

        window.iFrameResizer = {
            readyCallback: () => {
                Viewer.parentIframe = window.parentIFrame;
                Viewer.parentIframe.getPageInfo((data) => {
                    let newHeight = data.clientHeight;
                    if (this.state.maxContentHeight !== newHeight) {
                        this.setState({
                            clientHeight: data.clientHeight,
                            maxContentHeight: newHeight
                        });
                    }
                })
            }
        }
    }

    get visibleReport() {
        const url = this.props.history.location.pathname
        switch (true) {
            case url.substr(0, '/brand/'.length) === '/brand/':
                return 'brand'
            case url.substr(0, '/category/'.length) === '/category/':
                return 'category'
            case url.substr(0, '/summary'.length) === '/summary':
                return 'summary';
            default:
                return 'hidden'
        }
    }

    /**
     * Used to get the dimensions for the entire component
     * Returns [iframe height, width, content max height]
     * @returns {*}
     */
    getSize = () => {

        let visibleReport = this.visibleReport

        if (visibleReport === 'hidden') {
            return [60, 60];
        }

        if (visibleReport === 'summary') {
            return [250, 460]
        }

        if (visibleReport === 'category') {
            return [780, 500]
        }

        if (visibleReport === 'brand') {
            return [780, 500]
        }
    };

    updateSize = () => {
        if (Viewer.parentIframe) {
            let estimated = this.getSize();
            Viewer.parentIframe.size(estimated[0], estimated[1]);

            if (Viewer.PARENT_AUTO_SIZE_DISABLED === false) {
                Viewer.parentIframe.autoResize(false);
                Viewer.PARENT_AUTO_SIZE_DISABLED = true
            }
        }
    };

    setFullscreen = (state) => {
        this.setState({fullscreen: state})
    }


    getReport = async () => {
        let report = await getReport(
            getParameterByName('brand', document.URL),
            getParameterByName('productTitle', document.URL),
            getParameterByName('asin', document.URL)
        )

        this.setState({
            report,
            ready: true
        }, this.updateSize)
    }

    onClickHomeButton = () => {
        this.setState({show: !this.state.show, shown: true}, this.updateSize)
    }

    getHeaderText = (url) => {
        switch (this.visibleReport) {
            case 'brand':
                return this.state.report.report.brand
            case 'category':
                return this.state.report.report.category
            default:
                return null;
        }
    }

    getHeaderLinks = (url) => {
        switch (true) {
            case url.substr(0, '/brand/'.length) === '/brand/':
                return BrandReport.getHeaderLinks('/brand')
            case url.substr(0, '/category/'.length) === '/category/':
                return CategoryReport.getHeaderLinks('/category')
            default:
                return null;
        }
    }

    componentDidUpdate(prevProps: Readonly<P>, prevState: Readonly<S>, snapshot: SS): void {
        this.updateSize()
    }

    render() {

        if (this.state.ready === false) {
            return null
        }

        let {report, show, fullscreen} = this.state
        let logoUrl = this.visibleReport === 'hidden' ? 'summary' : 'hidden'

        return (
            <div id='RecallIt' className={(this.state.shown ? 'shown' : '') + (fullscreen ? ' fullscreen' : '')}>
                {
                    show && (
                        <div className={'-body'}>
                            <Route render={(props) => {

                                if (props.location.pathname === '/summary') {
                                    return <h2 style={{
                                        margin: 0,
                                        padding: '10px 25px'
                                    }}>Recall.It</h2>
                                }

                                if (props.location.pathname === '/hidden') return null

                                return (
                                    <header>
                                        <h2>Recall.It</h2>
                                        <h1>{this.getHeaderText(props.location.pathname)}</h1>
                                        <div className='links'>{this.getHeaderLinks(props.location.pathname)}</div>
                                    </header>
                                )
                            }}/>
                            <Switch>
                                <Route path={'/hidden'}/>
                                <Route path={'/summary'}
                                       render={(props) => <ReportSummary setFullscreen={this.setFullscreen}
                                                                         report={report.report}/>}/>
                                <Route path={'/brand'} render={(props) => {
                                    return (
                                        <BrandReport setFullscreen={this.setFullscreen}
                                                     recalls={report.report.recalls}
                                                     report={report}
                                                     brand={report.report.brand}/>
                                    )
                                }
                                }/>
                                <Route path={'/category'}
                                       render={(props) => <CategoryReport setFullscreen={this.setFullscreen}
                                                                          report={report.report}/>}/>
                                <Redirect to={'/summary' + Viewer.QUERY}/>
                            </Switch>
                        </div>
                    )
                }

                <NavLink style={{
                    width: '60px',
                    display: 'flex',
                    justifyContent: 'flex-start'
                }} to={'/' + logoUrl + Viewer.QUERY}><Logo onClick={this.onClickHomeButton}/></NavLink>

            </div>
        )
    }

}


