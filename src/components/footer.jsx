import React from "react";
import {Grid, IconButton, Typography} from "@material-ui/core";

import {constants} from "./constants";

import FacebookIcon from '@material-ui/icons/Facebook';
import TwitterIcon from '@material-ui/icons/Twitter';
import InstagramIcon from '@material-ui/icons/Instagram';
import LinkedInIcon from '@material-ui/icons/LinkedIn';
import GitHubIcon from '@material-ui/icons/GitHub';

function Footer() {

    return (

        <footer>

            <hr/>

            <Grid
                container
                direction="column"
                justifyContent="center"
                alignItems="center"
            >

                {/*Icon Buttons*/}
                <Grid
                    container
                    item
                    direction="row"
                    justifyContent="center"
                    alignItems="center"
                >
                    <Grid item>
                        <IconButton target='_blank' color="inherit" aria-label="Facebook" href={constants.facebook}>
                            <FacebookIcon />
                        </IconButton>
                    </Grid>
                    <Grid item>
                        <IconButton target='_blank' color="inherit" aria-label="Twitter" href={constants.twitter}>
                            <TwitterIcon />
                        </IconButton>
                    </Grid>
                    <Grid item>
                        <IconButton target='_blank' color="inherit" aria-label="Instagram" href={constants.instagram}>
                            <InstagramIcon />
                        </IconButton>
                    </Grid>
                    <Grid item>
                        <IconButton target='_blank' color="inherit" aria-label="LinkedIn" href={constants.linkedin}>
                            <LinkedInIcon />
                        </IconButton>
                    </Grid>
                    <Grid item>
                        <IconButton target='_blank' color="inherit" aria-label="GitHub" href={constants.github}>
                            <GitHubIcon />
                        </IconButton>
                    </Grid>
                </Grid>

                {/*Copyright*/}
                <Grid item>
                    <Typography variant="body2" color="textSecondary" align="center">
                        {constants.copyright}
                    </Typography>
                </Grid>

            </Grid>

        </footer>
    );
}

export default Footer;