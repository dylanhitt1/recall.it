import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {NavLink} from 'react-router-dom';
import {connect} from "react-redux";
import './SimpleNav.scss'

class SimpleNav extends Component {
    static propTypes = {
        routes: PropTypes.array.isRequired,
        isLoggedIn: PropTypes.bool.isRequired,
        location: PropTypes.object
    };

    renderLinks(items, basePath) {
        return (
            <ul>
                {items.reduce((prev, item) => {
                    if (item.autoIndexRoute) return prev;
                    if(item.requiresLogin === true && this.props.isLoggedIn === false)
                    {
                        console.log('Getting rid of this one');
                        return prev;
                    }

                    let path;
                    if (/^\//.test(item.path)) {
                        path = item.path;
                    } else if (basePath === '/') {
                        path = `/${item.path}`;
                    } else {
                        path = `${basePath}/${item.path}`;
                    }

                    prev.push(<li key={path}><NavLink to={path}>{item.name || item.path}</NavLink></li>);

                    if (item.childRoutes && item.childRoutes.length) {
                        prev.push(<li key={`${path}_wrapper`}>{this.renderLinks(item.childRoutes, path)}</li>);
                    }
                    return prev;
                }, [])}
            </ul>
        );
    }

    render() {
        return (
            <div className="common-simple-nav">
                {this.renderLinks(this.props.routes[0].childRoutes, '')}
            </div>
        );
    }
}


function mapStateToProps(state) {
    return {
        location: state.router.location,
        isLoggedIn: state.app.isLoggedIn
    };
}

function mapDispatchToProps(dispatch) {
    return {};
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SimpleNav);
