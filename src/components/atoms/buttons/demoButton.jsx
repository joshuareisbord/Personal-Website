import React, { Component } from 'react';
import {Button, withStyles} from '@material-ui/core';
import grey from '@material-ui/core/colors/grey';
import DashboardIcon from '@material-ui/icons/Dashboard';

const CustomButton = withStyles({
    root: {
        background: grey[500],
        color: 'white',
        '&:hover': {
            backgroundColor: grey[700],
        },
    }
})(Button);

class DemoButton extends Component{
    constructor(props){
        super(props);

    }

    render(){

        if (this.props.disabled){
            return(
                <CustomButton disabled size={this.props.size} startIcon={<DashboardIcon/>} href={this.props.href}>Live Demo</CustomButton>
            );
        }
        return (
            <CustomButton size={this.props.size} startIcon={<DashboardIcon/>} href={this.props.link}>Live Demo</CustomButton>
        );
    }

}

export default DemoButton
    
    


