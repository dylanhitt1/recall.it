import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {setLoggedIn} from '../actions';
import TextField from 'material-ui/TextField';
import Button from 'material-ui/Button';
import {withStyles} from 'material-ui/styles';
import Typography from 'material-ui/Typography';
import {FormControl, FormHelperText} from "material-ui";
import './DefaultPage.scss'
import axios from '../util/axios'

const styles = theme => ({
    textField: {
        marginTop: theme.spacing.unit * 2,
    },
    button: {
        width: 120,
        marginTop: theme.spacing.unit * 3,


    }
});

export class DefaultPage extends Component {
    static propTypes = {
        app: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired,
        classes: PropTypes.object.isRequired
    };

    state = {
        email: '',
        msg: '',
        password: ''
    };

    componentDidMount() {
        // this.login();
    }

    handleChange = name => event => {
        this.setState({
            [name]: event.target.value,
        });
    };

    login = () => {

        const checkOnFailure = (response) => {
            if (response.data.success === false) {
                this.setState({
                    msg: response.data.msg
                })
                return true
            }

            return false
        }

        axios.post('/auth', {
            email: this.state.email,
            password: this.state.password
        }).then(result => {
            if (false === checkOnFailure(result)) {
                console.log('Success', result);
                this.props.actions.setLoggedIn()
            }
        }).catch(reason => {
            checkOnFailure(reason.response)
        })
    }


    render() {
        const classes = this.props.classes
        return (
            <div className="home-default-page">
                <Typography variant="display3" gutterBottom>
                    Consumer Product Safety Commission
                </Typography>
                <Typography variant="display2" gutterBottom>
                    Browser Extension Admin
                </Typography>
                <div className='logos'>
                    <img width='72' height='72' src={'/cpsc-logo.png'}/>
                    <img width='72' height='72' style={{marginRight: '30px'}} src={'/logo.png'}/>
                    <img width='72' height='72'  src={'/kid-logo.jpg'}/>
                </div>
                <form noValidate autoComplete="off">
                    <TextField
                        className={classes.textField}
                        id="email"
                        label="Email"
                        value={this.state.email}
                        onChange={this.handleChange('email')}
                        margin="normal"
                    />
                    <TextField
                        className={classes.textField}
                        id="password"
                        type="password"
                        label="Password"
                        value={this.state.password}
                        onChange={this.handleChange('password')}
                        margin="normal"
                    />
                    {
                        this.state.msg ? (
                            <FormControl error className={classes.formControl}>
                                <FormHelperText>
                                    {this.state.msg}
                                </FormHelperText>
                            </FormControl>
                        ) : null
                    }
                </form>
                <Button variant="raised" color="primary" className={classes.button}
                        disabled={this.state.password === '' || this.state.email === ''}
                        onClick={this.login}>
                    Log In
                </Button>
            </div>
        );
    }
}


const DefaultPageWithStyles = withStyles(styles)(DefaultPage)

/* istanbul ignore next */
function mapStateToProps(state) {
    return {
        app: state.app,
    };
}

/* istanbul ignore next */
function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({setLoggedIn}, dispatch)
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(DefaultPageWithStyles);
