import React, { Component } from 'react'
import {Button, withStyles} from '@material-ui/core'
import grey from '@material-ui/core/colors/grey'
import GitHubIcon from '@material-ui/icons/GitHub';

const CustomButton = withStyles({
    root: {
        background: grey[500],
        color: 'white',
        '&:hover': {
            backgroundColor: grey[700],
        },
    }
})(Button);

class GitHubButton extends Component{
    constructor(props){
        super(props);

    }

    render(){

        if (this.props.repo == ""){
            return (
                <CustomButton disabled size={this.props.size} startIcon={<GitHubIcon/>} href={"https://github.com/" + this.props.repo}>GitHub</CustomButton>
            );
        }

        return (
            <CustomButton size={this.props.size} startIcon={<GitHubIcon/>} href={"https://github.com/" + this.props.repo}>GitHub</CustomButton>
        );
    }

}

export default GitHubButton
    
    


