import React, {Component} from 'react'
import {Divider, Grid} from '@material-ui/core'
import EmailButton from './buttons/emailButton'
import GitHubButton from './buttons/githubButton'
import LinkedInButton from './buttons/linkedinButton'
import ResumeButton from './buttons/resumeButton'
import HeadShot from '../img/circle-cropped.png'

import {Header} from 'semantic-ui-react'


const styles = {
    img: {
        height: '20vh',
        width: 'auto',
        padding: "8vh 0vw 0vh",
    },
    
} 

const name = "Joshua Reisbord"
const welcomeMsg = "Welcome to my personal website!";

export default function render(){

    return (
        <div>
            <Grid container direction='column'justify='center' alignItems='center' spacing={2}>

                <Grid container item direction='column' justify='center' alignItems='center'spacing={5}>
                    <Grid item> <img src={HeadShot} style={styles.img} alt=""/> </Grid>
                </Grid>

                {/* This is the heading in a centered item */}
                <Grid container item direction='column' justify='center' alignItems='center'>
                    <Grid item> 
                        <Header as='h1'>{name}</Header>
                        <Header.Subheader as='h2'>{welcomeMsg}</Header.Subheader>
                    </Grid>
                </Grid>

                <Grid container item direction='column' justify='center' alignItems='center'spacing={2}>
                    <Grid item><b3>Connect with me...</b3></Grid>
                    {/* These are my coomminication buttons in a row wise grid */}
                    <Grid container direction='row' justify='center' alignItems='center' spacing={2}>
                    <Grid item><EmailButton size="large" email="joshuareisbord@gmail.com"/></Grid>
                    <Grid item><GitHubButton size="large" repo="joshuareisbord/"/></Grid>
                    <Grid item><LinkedInButton size="large" profile="joshua-reisbord-4b3a211a1/"/></Grid>
                    <Grid item><ResumeButton size="large"/></Grid>
                </Grid>
                </Grid>
                

            </Grid> 
        </div> 
    );
}