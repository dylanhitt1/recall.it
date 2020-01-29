import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {closeSnack, saveFeedbackAndRecall, saveRecall, setSnack} from '../actions';
import {withStyles} from 'material-ui/styles';
import Typography from 'material-ui/Typography';
import ReactTable from 'react-table'
import MapDataPage from './MapDataPage'
import Button from 'material-ui/Button';
import Radio, {RadioGroup} from 'material-ui/Radio';
import {FormControl, FormControlLabel, FormLabel} from 'material-ui/Form';
import axios from '../util/axios'

const ace = window.ace

const $ = require('jquery');
const styles = theme => ({
    textField: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        width: '80%',
        maxWidth: '400px'
    },
    rightIcon: {
        marginLeft: theme.spacing.unit,
    },
    marginTop: {
        marginTop: theme.spacing.unit * 3
    }
});

class ManageRecalls extends Component {
    static propTypes = {
        app: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired,
        classes: PropTypes.object.isRequired
    };

    state = {
        loading: false,
        pages: -1,
        data: [],
        feedbackData: [],
        dialogOpen: false,
        recall: null,
        viewingAllRecalls: 'byRecalls'
    };

    editor = false;
    feedbackTable;

    componentDidMount() {
        $(document).keyup((e) => {
            if (e.keyCode == 27 && this.editor) { // escape key maps to keycode `27`
                this.handleClose();
            }
        });
    }

    get columns() {
        return [{
            Header: 'Id',
            accessor: 'RecallID',
            width: 100,
            filterable: true,
            filterMethod: MapDataPage.filterMethodNumber,
        }, {
            Header: 'Title',
            accessor: 'Title',
            filterable: true,
            filterMethod: MapDataPage.filterMethod,
        }];
    }

    get byFeedbackColumns() {
        return [{
            Header: 'Id',
            accessor: 'RecallID',
            width: 100,
            filterable: true,
            filterMethod: MapDataPage.filterMethodNumber,
        }, {
            Header: 'Date',
            accessor: 'feedback.date',
            width: 220

        },   {
            Header: 'Title',
            accessor: 'Title',
            filterable: true,
            filterMethod: MapDataPage.filterMethod,
        }, {
            Header: 'User Feedback',
            accessor: 'feedback.feedback',
        }]
    }

    get data() {
        if (this.state.viewingAllRecalls === 'byFeedback')
            return this.state.feedbackData;

        return this.state.data;
    }

    getTdProps = (state, rowInfo, column, instance) => {
        return {
            onClick: (e, handleOriginal) => {
                console.log('Handling td click')
                axios.get('/admin/recall', {params: {id: rowInfo.original._id}})
                    .then(res => {
                        console.log(res)

                        this.setState({
                            dialogOpen: true,
                            recall: res.data,
                            recallIndex: rowInfo.index
                        }, () => {
                            this.editor = ace.edit('json-editor');
                            this.editor.setTheme("ace/theme/monokai");
                            this.editor.setOptions({
                                showLineNumbers: true,
                            });
                            this.editor.setWrapBehavioursEnabled(true);
                            this.editor.session.setUseWrapMode(true);
                            this.editor.session.setMode('ace/mode/json');
                        })
                    });

                if (handleOriginal) {
                    handleOriginal()
                }
            }
        }
    };

    getFeedbackTdProps = (state, rowInfo, column, instance) => {
        return {
            onClick: (e, handleOriginal) => {
                console.log('getFeedbackTdProps td click')
                this.setState({
                    dialogOpen: true,
                    recall: rowInfo.original,
                    recallIndex: rowInfo.index
                }, () => {
                    this.editor = ace.edit('json-editor');
                    this.editor.setTheme("ace/theme/monokai");
                    this.editor.setOptions({
                        showLineNumbers: true,
                    });
                    this.editor.setWrapBehavioursEnabled(true);
                    this.editor.session.setUseWrapMode(true);
                    this.editor.session.setMode('ace/mode/json');
                });

                if (handleOriginal) {
                    handleOriginal()
                }
            }
        }
    };

    handleClose = (newRecall = undefined) => {
        if (this.state.dialogOpen) {
            this.editor.destroy();
            if (newRecall && newRecall['_id'] && this.state.viewingAllRecalls === 'byRecalls') {
                let data = this.state.data;
                data[this.state.recallIndex] = newRecall;
                this.setState({dialogOpen: false, recall: undefined, data: data});
            } else if (newRecall && newRecall['feedback'] && this.state.viewingAllRecalls === 'byFeedback') {
                this.setState({dialogOpen: false, recall: undefined, feedbackData: []}, () => {
                    this.feedbackTable.fireFetchData();
                });
            } else {
                this.setState({dialogOpen: false, recall: undefined});
            }
        }
    };

    handleDialogSave = () => {

        let annotations = this.editor.getSession().getAnnotations();

        if (annotations && annotations.length > 0) {
            alert('There is an error with the changed recall data:\n\n' + JSON.stringify(annotations));
            console.log(annotations);
            return;
        }

        let recall = this.editor.getValue();

        try {
            recall = JSON.parse(recall);
        } catch (e) {
            console.log('Error parsing to JSON');
            alert('There is an error parsing the changed recall');
        }

        if (this.state.viewingAllRecalls === 'byRecalls') {
            //Ensure no changes to recall ids
            recall._id = this.state.recall._id;
            recall['RecallID'] = this.state.recall.RecallID;

            this.props.actions.saveRecall(recall)
                .then(() => {
                    this.handleClose(recall);
                    this.props.actions.setSnack('Update recall successful')
                })
                .catch(() => {
                    this.props.actions.setSnack('Update recall failed');
                    this.handleClose()
                });
        } else {
            let data = {};
            let {feedback, ...payload} = recall;
            //Ensure no changes to ids
            data.recall = payload;
            data.feedback = feedback;
            data.recall._id = this.state.recall._id;
            data.recall['RecallID'] = this.state.recall.RecallID;
            data.feedback._id = this.state.recall.feedback._id;
            data.feedback.recallID = this.state.recall.RecallID;

            if(window.confirm('This operation will delete the feedback object and no longer display in this table')) {
                this.props.actions.saveFeedbackAndRecall(data)
                    .then(() => {
                        this.props.actions.setSnack('Update recall and feedback deletion successful');
                        this.handleClose(data);
                    })
                    .catch(() => {
                        this.props.actions.setSnack('Update recall and feedback deletion failed');
                        this.handleClose()
                    });
            }
        }
    };

    handleChange = event => {
        console.log(event.target.value);
        if (event.target.value === 'byRecalls') {

        } else {
            //Assume byFeedback
        }
        this.setState({viewingAllRecalls: event.target.value});
    };

    render() {
        const classes = this.props.classes;
        const byFeedback = this.state.viewingAllRecalls === 'byFeedback';
        return (
            <div className="home-default-page">
                <Typography variant="display4" gutterBottom>
                    CPSC Recalls
                </Typography>
                <Typography variant='title' gutterBottom>
                    This page allows you to make changes to any recall information. All updates will be saved and
                    available to consumers immediately.
                </Typography>
                <FormControl component="fieldset" required>
                    <FormLabel component="legend">Choose the data to view</FormLabel>
                    <RadioGroup
                        name="viewingAllRecalls"
                        value={this.state.viewingAllRecalls}
                        onChange={this.handleChange}
                        style={{
                            flexDirection: 'row',
                            paddingTop: '30px'
                        }}
                    >
                        <FormControlLabel value={'byRecalls'} control={<Radio/>} label="View all recalls"/>
                        <FormControlLabel value={'byFeedback'} control={<Radio/>}
                                          label="View recalls by user feedback"/>
                    </RadioGroup>
                </FormControl>
                <div className='content'>
                    {
                        this.state.dialogOpen ? (
                                <div style={{
                                    zIndex: 10000,
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <div id='json-editor' style={{
                                        width: '100%',
                                        height: '90%'
                                    }}>
                                        {JSON.stringify(this.state.recall, null, '\t')}
                                    </div>
                                    <div id='json-editor-buttons' style={{
                                        textAlign: 'right',
                                        paddingTop: '15px'
                                    }}>
                                        <Button onClick={this.handleClose} color="secondary">
                                            Close
                                        </Button>
                                        <Button onClick={this.handleDialogSave} color="primary" variant='raised'>
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            ) :
                            null
                    }
                    {
                        byFeedback === false ? (
                            <ReactTable
                                className={'-striped -highlight -linked'}
                                columns={this.columns}
                                data={this.state.data}
                                pages={this.state.pages}
                                loading={this.state.loading}
                                defaultPageSize={10}
                                manual
                                onFetchData={(state, instance) => {
                                    // show the loading overlay
                                    this.setState({loading: true});

                                    // fetch your data
                                    axios.get('/admin/recalls', {
                                        params: {
                                            page: state.page + 1,
                                            limit: state.pageSize,
                                            sorted: state.sorted,
                                            filtered: state.filtered
                                        }
                                    })
                                        .then((res) => {
                                            // Update react-table
                                            this.setState({
                                                data: res.data.data,
                                                pages: res.data.pages,
                                                loading: false
                                            })
                                        })
                                }}
                                getTdProps={this.getTdProps}
                            />
                        ) : null
                    }
                    {
                        byFeedback === true ? (
                            <ReactTable
                                className={'-striped -highlight -linked'}
                                columns={this.byFeedbackColumns}
                                ref={r => this.feedbackTable = r}
                                data={this.state.feedbackData}
                                pages={this.state.pages}
                                loading={this.state.loading}
                                defaultPageSize={10}
                                manual
                                onFetchData={(state, instance) => {

                                    // show the loading overlay
                                    this.setState({loading: true});

                                    // fetch your data
                                    axios.get('/admin/recalls/feedback', {
                                        params: {
                                            page: state.page + 1,
                                            limit: state.pageSize,
                                            sorted: state.sorted,
                                            filtered: state.filtered
                                        }
                                    })
                                        .then((res) => {
                                            // Update react-table
                                            this.setState({
                                                feedbackData: res.data.data,
                                                pages: res.data.pages,
                                                loading: false
                                            })
                                        })
                                }}
                                getTdProps={this.getFeedbackTdProps}
                            />
                        ) : null
                    }
                </div>
            </div>
        );
    }
}


const ManageRecallsWithStyles = withStyles(styles)(ManageRecalls)

/* istanbul ignore next */
function mapStateToProps(state) {
    return {
        app: state.app,
    };
}

/* istanbul ignore next */
function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({setSnack, closeSnack, saveRecall, saveFeedbackAndRecall}, dispatch)
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ManageRecallsWithStyles);
