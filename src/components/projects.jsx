import React, {Component} from 'react';
import {Grid, makeStyles} from '@material-ui/core';

import ProjectCard from './projectsLayout/project';

import PlaceHolder from '../img/placeholder.png'


class Projects extends Component{

    constructor(props){
        super(props)
    }

    render = () => {


        return (
                <Grid container direction='column'justify='center' alignItems='center' spacing={3}>


                    {/* container w/ two projects next to eachother */}
                    <Grid container item direction='row'justify='center' alignItems='center' spacing={3}>
                    <Grid item> <ProjectCard images={PlaceHolder} title="Crowd Pleaser" repo="joshuareisbord/CrowdPleaser" demoLink="https://crowdpleaser.io/" description="Music Voting App"></ProjectCard> </Grid>
                    <Grid item> <ProjectCard images={PlaceHolder} title="Crowd Pleaser" repo="" demoLink="" description=""></ProjectCard> </Grid>
                    </Grid>

                    {/* container w/ two projects next to eachother */}
                    <Grid container item direction='row'justify='center' alignItems='center' spacing={3}>
                    <Grid item> <ProjectCard images={PlaceHolder} title="" repo="" demoLink="" description=""></ProjectCard> </Grid>
                    <Grid item> <ProjectCard images={PlaceHolder} title="" repo="" demoLink="" description=""></ProjectCard> </Grid>
                    </Grid>

                </Grid>
        );
    }
}

export default Projects;