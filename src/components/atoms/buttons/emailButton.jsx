import React, { Component } from 'react'
import {Button, withStyles} from '@material-ui/core'
import green from '@material-ui/core/colors/green'
import MailOutlineIcon from '@material-ui/icons/MailOutline';

const CustomButton = withStyles({
    root: {
        background: green[500],
        color: 'white',
        '&:hover': {
            backgroundColor: green[700],
        },
    }
})(Button);

class EmailButton extends Component{
    constructor(props){
        super(props);

    }

    render(){
        return (
            <CustomButton size={this.props.size} startIcon={<MailOutlineIcon/>} href={"mailto:" + this.props.email}>Email</CustomButton>
        );
    }

}
export default EmailButton