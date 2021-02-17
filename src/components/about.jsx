import React, {Component} from 'react'
import {Grid} from '@material-ui/core'
import EmailButton from './buttons/emailButton'
import GitHubButton from './buttons/githubButton'
import LinkedInButton from './buttons/linkedinButton'
import ResumeButton from './buttons/resumeButton'
import HeadShot from '../img/circle-cropped.png'
import {
    Popup,
    Rating,
    Card,
    Header,
    Icon,
    Image,
    Divider,
    Container,
    Segment,
    Button,
  } from "semantic-ui-react";


const styles = {
    img: {
        height: '20vh',
        width: 'auto',
        padding: "1vh 1vw",
    },
} 

const aboutMsg = "My name is Joshua Reisbord, and I am an undergraduate student at Queen's University pursuing a bachelor's degree in Computer Science.\
                  In my leasure time I enjoy programing, carpentry, automotive work, surfing, and swimming!";


const headerMsg = "Welcome to my website!"



class About extends Component{

    render = () => {

        return (
            <div>
                <Grid container direction='column'justify='center' alignItems='center' spacing={2}>

                <Grid container item direction='column' justify='center' alignItems='center'spacing={5}>
                    <Grid item> <img src={HeadShot} style={styles.img} alt=""/> </Grid>
                </Grid>

                {/* This is the heading in a centered item */}
                <Grid container item direction='column' justify='center' alignItems='center'spacing={0}>
                    <Grid item> <h1 style={styles.h1}>{headerMsg}</h1> </Grid>
                    <Grid item xs={10}> <h2 style={styles.h2}>{aboutMsg}</h2> </Grid>
                    <Grid item> <h3>Links</h3> </Grid>
                </Grid>

                {/* These are my coomminication buttons in a row wise grid */}
                <Grid container direction='row' justify='center' alignItems='center' spacing={2}>
                    <Grid item><EmailButton size="large" email="joshuareisbord@gmail.com"/></Grid>
                    <Grid item><GitHubButton size="large" repo="joshuareisbord/"/></Grid>
                    <Grid item><LinkedInButton size="large" profile="joshua-reisbord-4b3a211a1/"/></Grid>
                    <Grid item><ResumeButton size="large" href="/resume"/></Grid>
                </Grid>

                </Grid> 
            </div>
            
            
        );
    }
}

export default About;