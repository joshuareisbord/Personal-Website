import React, { Component } from 'react'
import {Button, withStyles} from '@material-ui/core'
import blue from '@material-ui/core/colors/blue'
import LinkedInIcon from '@material-ui/icons/LinkedIn';


const CustomButton = withStyles({
    root: {
        background: blue[500],
        color: 'white',
        '&:hover': {
            backgroundColor: blue[700],
        },
    }
})(Button);


class EmailButton extends Component{
    constructor(props){
        super(props);

    }

    render(){
        return (
            <CustomButton size={this.props.size} startIcon={<LinkedInIcon/>} href={"https://www.linkedin.com/in/" + this.props.profile}>LinkedIn</CustomButton>
        );
    }

}
export default EmailButton