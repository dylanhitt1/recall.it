import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import Button from 'material-ui/Button';
import {withStyles} from 'material-ui/styles';
import Typography from 'material-ui/Typography';
import FileUpload from 'material-ui-icons/FileUpload';
import TextField from 'material-ui/TextField';
import axios from 'axios'

const _axios = axios.create({
    baseURL: 'http://localhost:3111',
    timeout: 100000000,
});

const _ = require('lodash')
const $ = require('jquery')
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

class UploadDataPage extends Component {
    static propTypes = {
        app: PropTypes.object.isRequired,
        classes: PropTypes.object.isRequired
    };

    state = {
        users: [
            {
                firstName: 'Jonathan',
                lastName: 'Witchard',
                email: 'jwitch99@vt.edu',
                isAdmin: false,
                id: '1234'
            },
            {
                firstName: 'Cassiane',
                lastName: 'Mavromatis',
                email: 'cmavromatis@vt.edu',
                isAdmin: false,
                id: '12346'
            }
        ],
        cpscPath: 'https://www.saferproducts.gov/RestWebServices/Recall?format=json',
        filePath: '',
        isLoadingCpsc: false
    }

    createNewUser = () => {
        const mongoObjectId = function () {
            let timestamp = (new Date().getTime() / 1000 | 0).toString(16);
            return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
                return (Math.random() * 16 | 0).toString(16);
            }).toLowerCase();
        };
        let users = [...this.state.users].concat({
            firstName: '',
            lastName: '',
            email: '',
            isAdmin: false,
            isNew: true,
            id: mongoObjectId()
        })

        console.log(users);

        this.setState({users: users})
    }

    saveUser = (user) => {
        return new Promise(res => {
            console.log('Saving', user);

        })
    }

    uploadCpscData = () => {
        this.setState({
            isLoadingCpsc: true
        }, () => {
            _axios.post('/admin/update-cpsc', {
                url: this.state.cpscPath
            }).then(response => {
                console.log('The response is', response);
                alert('Finished loading everything!\n' + JSON.stringify(response.data))
                this.setState({
                    isLoadingCpsc: false
                })
            })
        })


    }


    handleChange = name => event => {
        this.setState({
            [name]: event.target.value,
        });
    };

    updateNeissData = () => {
        let files = $('#file-path')[0].files


        if (files.length > 0) {
            console.log(files);
            let formData = new FormData();
            formData.append('file', files[0]);
            _axios.post('/admin/neiss-update', formData)
                .then(response => {
                    if (response.data.success === true) {
                        alert('this actually worked' + JSON.stringify(response.data))
                    }
                })
        }
    }

    render() {
        const classes = this.props.classes
        return (
            <div className="home-default-page">
                <Typography variant="display4" gutterBottom>
                    Upload Data
                </Typography>
                <div className='content'>
                    <section>
                        <Typography variant='display2'>
                            NEISS Data
                        </Typography>
                        <Typography variant='title' gutterBottom>
                            Choose a csv file with most recent data
                        </Typography>
                        <div className={'file-upload'}>
                            <TextField
                                type={'file'}
                                id="file-path"
                                value={this.state.filePath}
                                inputProps={
                                    {
                                        accept: ".csv"
                                    }
                                }
                                className={classes.textField}
                                helperText="Depending on the file size, this operation might take some time"
                                onChange={this.handleChange('filePath')}
                            />
                            <Button className={[classes.button, classes.marginTop].join(' ')} variant="raised"
                                    color="primary" onClick={this.updateNeissData}>
                                Go
                                <FileUpload className={classes.rightIcon}/>
                            </Button>
                        </div>
                    </section>
                    <section>
                        <Typography variant='display2'>
                            CPSC Recall Data
                        </Typography>
                        <Typography variant='title' gutterBottom>
                            Enter the url to upload the most recent recall information
                        </Typography>
                        <TextField
                            multiline
                            disabled
                            id="recall-path"
                            className={[classes.textField, classes.marginTop].join(' ')}
                            helperText="Depending on the file size, this operation might take some time"
                            onChange={this.handleChange('cpscPath')}
                            value={this.state.cpscPath}
                        />
                        <br/>
                        <Button disabled={this.state.isLoadingCpsc} size='small'
                                className={[classes.button, classes.marginTop].join(' ')} variant="raised"
                                color="primary" onClick={this.uploadCpscData}>
                            Go
                        </Button>
                    </section>

                </div>
            </div>
        );
    }
}


const UploadDataPageWithStyles = withStyles(styles)(UploadDataPage)

/* istanbul ignore next */
function mapStateToProps(state) {
    return {
        app: state.app,
    };
}

/* istanbul ignore next */
function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({}, dispatch)
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(UploadDataPageWithStyles);
