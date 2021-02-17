import React, { Component } from 'react'
import {Button, withStyles} from '@material-ui/core'
import red from '@material-ui/core/colors/red'
import DescriptionIcon from '@material-ui/icons/Description';


const CustomButton = withStyles({
    root: {
        background: red[500],
        color: 'white',
        '&:hover': {
            backgroundColor: red[700],
        },
    }
})(Button);

class ResumeButton extends Component{
    constructor(props){
        super(props);

    }

    render(){
        return (
            <CustomButton size={this.props.size} startIcon={<DescriptionIcon/>} href={this.props.href}>Resume</CustomButton>
        );
    }

}
export default ResumeButton