import * as React from "react";
import {Link} from "react-router-dom";
import Viewer from '../Viewer'

export default class ReportSummary extends React.Component {

    static propTypes = {
    }

    render() {

        let {report} = this.props

        let hasData = (
            report.recallsInCategory.length + report.recalls.length
        ) > 0

        if (!hasData) {
            return null
        }

        return (
            <div className={'content'}>
                {
                    report.recallsInCategory.length > 0 && <p>Found <Link
                        to={'/category' + Viewer.QUERY}><b>{report.recallsInCategory.length} recall{report.recallsInCategory.length > 1 ? 's' : ''}</b></Link> related to {report.category}</p>
                }
                {
                    report.recalls.length > 0 &&
                    <p>
                        Found <Link
                        to={'/brand' + Viewer.QUERY}><b>{report.recalls.length} recall{report.recalls.length > 1 ? 's' : ''}</b></Link> associated with {report.brand} and {report.category}
                    </p>
                }
            </div>
        )
    }
}
