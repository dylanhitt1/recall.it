import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {getMappings, setSnack} from '../actions';
import {withStyles} from 'material-ui/styles';
import Typography from 'material-ui/Typography';
import 'react-table/react-table.css'
import ReactTable from 'react-table'
import Grid from 'material-ui/Grid';
import Button from 'material-ui/Button';
import DeleteIcon from 'material-ui-icons/Delete';
import IconButton from 'material-ui/IconButton';
import axios from '../util/axios';
import Input from 'material-ui/Input';
import Save from 'material-ui-icons/Save';
import Edit from 'material-ui-icons/Edit';
import TextField from 'material-ui/TextField';

import Dialog, {DialogActions, DialogContent, DialogContentText, DialogTitle,} from 'material-ui/Dialog';

const $ = require('jquery');
const _ = require('lodash');

const styles = theme => ({
    textField: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        width: '80%'
    },
    rightIcon: {
        marginLeft: theme.spacing.unit,
    },
    marginTop: {
        marginTop: theme.spacing.unit * 3
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    }

});

const amazonListStyles = theme => ({
    row: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    }
});

class AmazonItemsList extends Component {

    static propTypes = {
        cpscNumber: PropTypes.number,
        amazonCategories: PropTypes.array,
        removeCategory: PropTypes.func,
        saveCategory: PropTypes.func.isRequired,
        addNew: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            data: [],
            loading: false
        }
    }

    componentWillReceiveProps(nextProps) {


        let data = nextProps.amazonCategories;

        if (nextProps.cpscNumber) {
            data = _.filter(data, {'cpscNumber': nextProps.cpscNumber})
        } else {
            data = [];
        }

        //hack: this is to force the table to update.
        this.setState({
            loading: true,
            data: []
        }, () => {
            this.setState({
                data: data,
                loading: false,
                cpscNumber: nextProps['cpscNumber']
            })
        });


    }

    addNew = () => {
        this.props.addNew(this.props.cpscNumber)
    };

    deleteRow = (row) => () => {
        this.props.removeCategory(row)
    };

    saveRow = (index) => () => {
        let text = $('#input-' + index).val();
        let data = this.state.data[index];
        if (data.amazonItem === text)
            return;

        this.props.saveCategory(data, text);
    };

    getCell = (row) => {
        return (
            <div className={this.props.classes.row}>
                <Input
                    id={`input-${row.index}`}
                    disableUnderline={true}
                    placeholder={'Enter Amazon Category'}
                    style={{width: '70%'}}
                    defaultValue={row.original.amazonItem}
                    inputProps={{
                        'aria-label': 'Description',
                    }}
                />
                <IconButton aria-label="Save" onClick={this.saveRow(row.index)}>
                    <Save/>
                </IconButton>
                <IconButton aria-label="Delete" color="secondary" onClick={this.deleteRow(row.original)}>
                    <DeleteIcon/>
                </IconButton>
            </div>
        );
    };

    get columns() {
        return [{
            Header: 'Amazon Category',
            accessor: 'amazonItem',
            filterable: true,
            filterMethod: MapDataPage.filterMethod,
            Cell: this.getCell,
            Footer: (
                <div>
                    <Button color="primary" onClick={this.addNew} size='small' fullWidth
                            disabled={this.props.cpscNumber == undefined}>
                        Add New
                    </Button>
                </div>
            )
        }];
    }

    render() {

        if (this.state == undefined) {
            return 'Select CPSC Category'
        }

        return (
            <ReactTable
                loading={this.state.loading}
                // style={{maxWidth: '500px'}}
                ref={(ref) => this.table = ref}
                className={'-striped -highlight'}
                defaultPageSize={10}
                data={this.state.data}
                columns={this.columns}
            />
        )

    }
}


const AmazonItemsListWithStyles = withStyles(amazonListStyles)(AmazonItemsList);


class MapDataPage extends Component {
    static propTypes = {
        app: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired,
        classes: PropTypes.object.isRequired,
    };

    state = {
        data: [],
        amazonCategories: [],
        activeCategory: undefined,
        dialogOpen: false
    };

    get columns() {
        return [{
            Header: 'Id',
            accessor: 'cpscNumber',
            width: 100,
            filterable: true,
            filterMethod: MapDataPage.filterMethodNumber
        }, {
            Header: 'CPSC Category',
            accessor: 'cpscName',
            filterable: true,
            filterMethod: MapDataPage.filterMethod,
            Footer: (
                <div>
                    <Button color="primary" onClick={this.addNewCpscCategory} size='small' fullWidth>
                        Create New
                    </Button>
                </div>
            ),
            Cell: (row) => {
                return (
                    <div className={this.props.classes.row}>
                        <span>{row.original.cpscName}</span>
                        <IconButton aria-label="Edit" onClick={this.editCell(row.original, row.index)}>
                            <Edit/>
                        </IconButton>
                    </div>
                )
            }
        }];
    }

    editCell = (cpscCategory, index) => () => {
        this.setState({
            dialogOpen: true,
            activeCategoryData: cpscCategory,
            activeCategoryIndex: index
        });
    };

    addNewCpscCategory = () => {
        let data = _.cloneDeep(this.state.data);
        let newC = {
            cpscName: '',
            cpscNumber: 0,
            amazonItems: []
        };
        data.push(newC);

        this.setState({
            data: data,
            dialogOpen: true,
            activeCategoryData: newC,
            activeCategoryIndex: data.length - 1
        })
    };

    componentDidMount() {
        getMappings()
            .then(data => {
                this.setState({data: data, amazonCategories: this.getCategories(data)})
            })
    }

    getCategories(data) {
        //convert categories
        let amazonItems = data.map(c => {
            return c.amazonItems.map(i => {
                return {
                    cpscNumber: c.cpscNumber,
                    amazonItem: i
                }
            });
        });
        return _.flatten(amazonItems);
    }

    static filterMethod = (filter, row) => {
        return row[filter.id].toLowerCase().indexOf(filter.value.toLowerCase()) > -1;
    };

    static filterMethodNumber = (filter, row) => {
        return row[filter.id].toString().indexOf(filter.value.toString());
    };

    getTdProps = (state, rowInfo, column, instance) => {
        return {
            onClick: (e, handleOriginal) => {

                let id = _.get(rowInfo, 'row.cpscNumber', false);
                if (id) {
                    this.setState({
                        cpscNumber: id
                    });
                }

                if (handleOriginal) {
                    handleOriginal()
                }
            }
        }
    };

    getTrProps = (state, rowInfo, column) => {
        if (rowInfo) {
            let id = _.get(rowInfo, 'row.cpscNumber', false);
            if (id === _.get(this.state, 'cpscNumber', -1)) {
                return {
                    style: {
                        background: '#65b13e',
                        color: 'white'
                    }
                }
            }

        }
        return {}
    };

    removeCategory = (category) => {
        let data = _.cloneDeep(this.state.data);
        let cpscCategory = _.find(data, {'cpscNumber': category.cpscNumber});
        _.pull(cpscCategory.amazonItems, category.amazonItem);
        this.setState({
            data: data,
            amazonCategories: this.getCategories(data)
        });

        this.updateCategory(cpscCategory);
    };

    updateAmazonCategory = (category, newText) => {
        console.log('Updating amazon category to: ', newText);

        //Checking for duplicated amazon categories
        newText = newText.trim();
        let otherItem = this.state.amazonCategories.findIndex(x => x.amazonItem.toLowerCase() === newText.toLowerCase());
        if (otherItem > -1) {
            //Get the real object
            let cpscCategory = _.find(this.state.data, {'cpscNumber': this.state.amazonCategories[otherItem].cpscNumber});
            alert(`The entered Amazon Category maps to: \n\n\tId: ${cpscCategory.cpscNumber}\n\tName: ${cpscCategory.cpscName}\n\nDuplicates are not allowed`);
            return;
        }


        let data = _.cloneDeep(this.state.data);
        let cpscCategory = _.find(data, {'cpscNumber': category.cpscNumber});
        let i = cpscCategory.amazonItems.findIndex(x => x === category.amazonItem);
        cpscCategory.amazonItems[i] = newText;
        this.setState({
            data: data,
            amazonCategories: this.getCategories(data)
        });
        this.updateCategory(cpscCategory)
    };

    addNewAmazonCategory = (cpscNumber) => {
        let data = _.cloneDeep(this.state.data);
        let cpscCategory = _.find(data, {'cpscNumber': cpscNumber});
        cpscCategory.amazonItems.push('');
        this.setState({
            data: data,
            amazonCategories: this.getCategories(data)
        });
    };

    updateCategory(data) {
        console.log(data);
        axios.post('/admin/update-mapping', data).then(response => {
            this.props.actions.setSnack('Mapping successfully updated')
        }).catch(reason => {
            this.props.actions.setSnack('Failed updating mapping, try reloading page.');
            console.log(JSON.stringify(reason));
        })
    }

    handleClose = () => {
        this.setState({dialogOpen: false});
    };

    handleDialogSave = () => {
        let {activeCategoryIndex} = this.state;
        let id = +$('#cpsc-id').val(), name = $('#cpsc-name').val().trim();
        console.log(id, name);
        let found = false;

        this.state.data.forEach((c, index) => {
            //check different categories and equal numbers
            if (found === false && index !== activeCategoryIndex) {
                if (c.cpscNumber === id) {
                    alert(`Duplicate Category Number: ${c.cpscNumber}`);
                    found = true;
                }
                if (c.cpscName === name) {
                    alert(`Duplicate Category Name: ${c.cpscName}`);
                    found = true;
                }
            }
        });

        if (found === false) {
            let data = _.cloneDeep(this.state.data);
            data[activeCategoryIndex].cpscName = name;
            data[activeCategoryIndex].cpscNumber = id;
            this.updateCategory(data[activeCategoryIndex]);
            this.setState({
                data: data,
                dialogOpen: false
            })
        }
    };

    render() {
        const classes = this.props.classes;

        return (
            <div className="home-default-page">
                <Typography variant="display4" gutterBottom>
                    Map Data
                </Typography>
                <Typography variant='title' gutterBottom>
                    In order to better match Amazon users with CPSC data we have to map CPSC categories directly to
                    Amazon categories
                </Typography>
                <div className='content'>
                    <section>
                        <Grid container spacing={40} justify='flex-start'>
                            <Grid item md={6} lg={5}>
                                <ReactTable
                                    // style={{maxWidth: '500px'}}
                                    className={'-striped -highlight -linked'}
                                    defaultPageSize={10}
                                    data={this.state.data}
                                    columns={this.columns}
                                    getTdProps={this.getTdProps}
                                    getTrProps={this.getTrProps}
                                />
                            </Grid>
                            <Grid item md={6} lg={5}>
                                <AmazonItemsListWithStyles
                                    removeCategory={this.removeCategory}
                                    saveCategory={this.updateAmazonCategory}
                                    addNew={this.addNewAmazonCategory}
                                    cpscNumber={this.state.cpscNumber}
                                    amazonCategories={this.state.amazonCategories}/>
                            </Grid>
                        </Grid>
                    </section>
                </div>
                {
                    this.state.dialogOpen ? (
                        <Dialog
                            open={this.state.dialogOpen}
                            onClose={this.handleClose}
                            aria-labelledby="form-dialog-title"
                        >
                            <DialogTitle variant={'headline'} id="form-dialog-title">Modify
                                Category</DialogTitle>
                            <DialogContent>
                                <DialogContentText>
                                    Enter a unique id and category name
                                </DialogContentText>
                                <TextField
                                    defaultValue={this.state.activeCategoryData.cpscNumber}
                                    autoFocus
                                    margin="normal"
                                    id="cpsc-id"
                                    label="Id"
                                    type='number'
                                    inputProps={{
                                        type: 'number'
                                    }}
                                    fullWidth
                                />
                                <TextField
                                    defaultValue={this.state.activeCategoryData.cpscName}
                                    margin="normal"
                                    id="cpsc-name"
                                    label="Category Name"
                                    fullWidth
                                />
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={this.handleClose} color="primary">
                                    Close
                                </Button>
                                <Button onClick={this.handleDialogSave} color="primary">
                                    Save
                                </Button>
                            </DialogActions>
                        </Dialog>
                    ) : null
                }
            </div>
        );
    }
}


const MapDataPageWithStyles = withStyles(styles)(MapDataPage);

/* istanbul ignore next */
function mapStateToProps(state) {
    return {
        app: state.app,
    };
}

/* istanbul ignore next */
function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({setSnack}, dispatch)
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(MapDataPageWithStyles);
