import React from "react";
import {Box, Container, IconButton, Typography} from "@material-ui/core";

import {constants} from "./constants";

import FacebookIcon from '@material-ui/icons/Facebook';
import TwitterIcon from '@material-ui/icons/Twitter';
import InstagramIcon from '@material-ui/icons/Instagram';
import LinkedInIcon from '@material-ui/icons/LinkedIn';
import GitHubIcon from '@material-ui/icons/GitHub';

function Footer() {

    return (
        // <footer>
        //     <Container maxWidth="lg">
        //         <hr/>
        //         <Box py={1} textAlign="center">
        //             <Box>
        //                 <IconButton target='_blank' color="inherit" aria-label="Facebook" href={constants.facebook}>
        //                     <FacebookIcon />
        //                 </IconButton>
        //                 <IconButton target='_blank' color="inherit" aria-label="Twitter" href={constants.twitter}>
        //                     <TwitterIcon />
        //                 </IconButton>
        //                 <IconButton target='_blank' color="inherit" aria-label="Instagram" href={constants.instagram}>
        //                     <InstagramIcon />
        //                 </IconButton>
        //                 <IconButton target='_blank' color="inherit" aria-label="LinkedIn" href={constants.linkedin}>
        //                     <LinkedInIcon />
        //                 </IconButton>
        //                 <IconButton target='_blank' color="inherit" aria-label="GitHub" href={constants.github}>
        //                     <GitHubIcon />
        //                 </IconButton>
        //             </Box>
        //             <Typography color="textSecondary" component="p" variant="caption" gutterBottom={false}>© Joshua Reisbord 2021.</Typography>
        //         </Box>
        //     </Container>
        // </footer>

        <footer>
            <Container maxWidth="lg">
                <hr/>
                    <Box>
                        <IconButton target='_blank' color="inherit" aria-label="Facebook" href={constants.facebook}>
                            <FacebookIcon />
                        </IconButton>
                        <IconButton target='_blank' color="inherit" aria-label="Twitter" href={constants.twitter}>
                            <TwitterIcon />
                        </IconButton>
                        <IconButton target='_blank' color="inherit" aria-label="Instagram" href={constants.instagram}>
                            <InstagramIcon />
                        </IconButton>
                        <IconButton target='_blank' color="inherit" aria-label="LinkedIn" href={constants.linkedin}>
                            <LinkedInIcon />
                        </IconButton>
                        <IconButton target='_blank' color="inherit" aria-label="GitHub" href={constants.github}>
                            <GitHubIcon />
                        </IconButton>
                    </Box>
                    <Typography color="textSecondary" component="p" variant="caption" gutterBottom={false}>© Joshua Reisbord 2021.</Typography>
            </Container>
        </footer>
    );
}

export default Footer;