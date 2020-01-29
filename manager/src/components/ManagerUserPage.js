import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import Button from 'material-ui/Button';
import {withStyles} from 'material-ui/styles';
import Typography from 'material-ui/Typography';
import {FormControlLabel} from 'material-ui/Form';
import Checkbox from 'material-ui/Checkbox';
import green from 'material-ui/colors/green';
import TextField from 'material-ui/TextField';
import axios from '../util/axios'
const _ = require('lodash')

const styles = theme => ({
    textField: {
        marginTop: theme.spacing.unit * 2,
    },
    button: {
        width: 150,
        marginTop: theme.spacing.unit * 3,

    }
});

const userFormStyles = theme => ({
    formContainer: {
        marginBottom: theme.spacing.unit * 3,
        paddingLeft: theme.spacing.unit * 2,
        '&:hover': {
            cursor: 'pointer',
            borderLeft: '5px solid rgba(74,144,226,0.32)'
        },
        '&.editing': {
            borderLeft: '5px solid rgba(74,144,226,0.32)',
        },
        '&.saving': {
            borderLeft: '5px solid red',
            pointerEvents: 'none'
        },
        '&.editing:hover': {
            cursor: 'initial',
        }
    },
    checked: {
        color: green[500],
    },
    textField: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        width: 200,
    },
})

class UserForm extends Component {

    static propTypes = {
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        email: PropTypes.string,
        isAdmin: PropTypes.bool,
        password: PropTypes.string,
        isNew: PropTypes.bool,
        save: PropTypes.func.isRequired,
        remove: PropTypes.func.isRequired
    };

    static defaultProps = {
        isNew: false,
    };

    state = {
        isEditing: false
    }

    constructor(props) {
        super(props)
        this.state = {
            _id: props._id,
            isEditing: props.isNew,
            isSaving: false,
            firstName: props.firstName,
            lastName: props.lastName,
            email: props.email,
            isAdmin: props.isAdmin,
            password: props.password
        }
    }

    toggleEditing = (forceClose, clearChanges) => () => {
        if (this.state.isEditing === true && forceClose) {

            if (clearChanges) {
                this.setState({
                    isEditing: false,
                    firstName: this.props.firstName,
                    lastName: this.props.lastName,
                    email: this.props.email,
                    isAdmin: this.props.isAdmin,
                    password: this.props.password
                })
            } else {
                this.setState({isEditing: false})
            }
        } else {
            this.setState({isEditing: true})
        }
    }

    handleCheck = name => event => {
        this.setState({
            [name]: event.target.checked,
        });
    };

    handleChange = name => event => {
        this.setState({
            [name]: event.target.value,
        });
    };

    saveChanges = () => {
        this.setState({
            isSaving: true,
            isEditing: false
        }, () => {
            this.props.save({
                firstName: this.state.firstName,
                lastName: this.state.lastName,
                email: this.state.email,
                isAdmin: this.state.isAdmin,
                password: this.state.password,
                _id: this.props._id
            }).then(() => {
                this.setState({
                    isSaving: false
                })
            })
        })

    }

    deleteUser = () => {
        this.setState({
            isSaving: true
        }, () => {
            this.props.remove(this.props._id)
        })
    }


    render() {
        const {classes} = this.props
        const {isEditing, email, password, firstName, lastName, isAdmin, isSaving} = this.state
        let sectionClasses = classes.formContainer + ' ' + (
            isEditing ? 'editing' : ''
        ) + ' ' + (
            isSaving ? 'saving' : ''
        )

        let sectionProps = isEditing ? {} : {onClick: this.toggleEditing(false)}
        return (
            <section className={sectionClasses} {...sectionProps}>
                {
                    isEditing ? (
                        <div>
                            <div className={''}>
                                <TextField
                                    id="firstName"
                                    placeholder="First Name"
                                    className={classes.textField}
                                    onChange={this.handleChange('firstName')}
                                    value={firstName}
                                    margin="normal"
                                /><br/>
                                <TextField
                                    id="lastName"
                                    placeholder="Last Name"
                                    onChange={this.handleChange('lastName')}
                                    value={lastName}
                                    className={classes.textField}
                                    margin="normal"
                                /><br/>
                                <TextField
                                    id="email"
                                    placeholder="Email"
                                    onChange={this.handleChange('email')}
                                    value={email}
                                    className={classes.textField}
                                    margin="normal"
                                /><br/>
                                <TextField
                                    id="password"
                                    placeholder="Password"
                                    type="password"
                                    onChange={this.handleChange('password')}
                                    value={password}
                                    className={classes.textField}
                                    margin="normal"
                                />
                            </div>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        margin="normal"
                                        checked={isAdmin}
                                        onChange={this.handleCheck('isAdmin')}
                                        value="isAdmin"
                                        classes={{
                                            checked: classes.checked,
                                        }}
                                    />
                                }

                                label="Admin"
                            /><br/>
                            <Button size="small" color="primary" className={classes.button} onClick={this.saveChanges}>
                                Save
                            </Button>
                            <Button size="small" color="secondary" className={classes.button} onClick={this.deleteUser}>
                                Delete
                            </Button>
                            <Button size="small" className={classes.button} onClick={this.toggleEditing(true, true)}>
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <Typography variant='subheading'>{`${firstName} ${lastName}`}</Typography>
                            <Typography variant='body2'>{email}</Typography>
                        </div>
                    )
                }
            </section>
        )

    }
}

const UserFormWithStyles = withStyles(userFormStyles)(UserForm)


class ManagerUserPage extends Component {
    static propTypes = {
        app: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired,
        classes: PropTypes.object.isRequired
    };

    state = {
        users: [
        ],
    }

    componentDidMount() {
        this.getUsers()
    }

    getUsers = () => {
        axios.get('/admin/users')
            .then(res => {
                console.log('Found users', res.data);
                this.setState({
                    users: res.data
                })
            })
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
            password: '',
            isAdmin: false,
            isNew: true,
            _id: mongoObjectId()
        })

        console.log(users);

        this.setState({users: users})
    }

    saveUser = (user) => {
        return new Promise(res => {
            console.log('Saving', user);
            axios.post('/admin/create-user', {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                password: user.password
            }).then(response => {
                if(response.data.success === true) {
                    res(true)
                }
            }).catch(reason => {
                console.log('Failed', reason);
            })
        })
    }

    deleteUser = (userId) => {
        console.log('Deleting', userId);
        let users = _.groupBy(this.state.users, (u) => {
            return u._id === userId ? 'delete': 'remaining'
        })

        this.setState({users: users.remaining})
        console.log(users.delete[0].email);
        axios.post('/admin/delete-user', {

            email: users.delete[0].email
        }).then(res => {
            console.log('This worked', res);
        }).catch(x => {
            console.log('this failed')
        })

    }


    render() {
        const classes = this.props.classes
        return (
            <div className="home-default-page">
                <Typography variant="display4" gutterBottom>
                    Users
                </Typography>
                <div className='content'>
                    {this.state.users.map(u => <UserFormWithStyles key={u._id} {...u} save={this.saveUser} remove={this.deleteUser}/>)}
                </div>
                <Button variant="raised" color="primary" className={classes.button} onClick={this.createNewUser}>
                    Add New User
                </Button>
            </div>
        );
    }
}


const ManagerUserPageWithStyles = withStyles(styles)(ManagerUserPage)

/* istanbul ignore next */
function mapStateToProps(state) {
    console.log(state);
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
)(ManagerUserPageWithStyles);
