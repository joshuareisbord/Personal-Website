import React, {Component} from 'react';
import {Grid, makeStyles, Paper} from '@material-ui/core';

import ProjectCard from './projectcard';


class Projects extends Component{

    constructor(props){
        super(props)
    }

    render = () => {


        return (
                <Grid container direction='column'justify='center' alignItems='center' spacing={3}>

                    <Grid container item direction='row' justify='center' alignItems='center' spacing={3}>
                        <Grid item xs={6}> <Paper elevation={10}><ProjectCard images="" title="Crowd Pleaser" repo="joshuareisbord/CrowdPleaser" demoLink="https://crowdpleaser.io/" description="Music Voting App"/></Paper> </Grid>
                        <Grid item xs={6}> <Paper elevation={10}><ProjectCard images="" title="" repo="" demoLink="" description=""/></Paper> </Grid>
                    </Grid>

                </Grid>
        );
    }
}

// {/* container w/ two projects next to eachother */}
// <Grid container item direction='row'justify='center' alignItems='center' spacing={3}>
// <Grid item> <ProjectCard images={PlaceHolder} title="Crowd Pleaser" repo="joshuareisbord/CrowdPleaser" demoLink="https://crowdpleaser.io/" description="Music Voting App"></ProjectCard> </Grid>
// <Grid item> <ProjectCard images={PlaceHolder} title="Crowd Pleaser" repo="" demoLink="" description=""></ProjectCard> </Grid>
// </Grid>

// {/* container w/ two projects next to eachother */}
// <Grid container item direction='row'justify='center' alignItems='center' spacing={3}>
// <Grid item> <ProjectCard images={PlaceHolder} title="" repo="" demoLink="" description=""></ProjectCard> </Grid>
// <Grid item> <ProjectCard images={PlaceHolder} title="" repo="" demoLink="" description=""></ProjectCard> </Grid>
// </Grid>

export default Projects;