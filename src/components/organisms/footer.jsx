import React from 'react';

import Container from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';

import FacebookIcon from '@material-ui/icons/Facebook';
import TwitterIcon from '@material-ui/icons/Twitter';
import InstagramIcon from '@material-ui/icons/Instagram';
import LinkedInIcon from '@material-ui/icons/LinkedIn';
import GitHubIcon from '@material-ui/icons/GitHub';
import AccountBoxIcon from '@material-ui/icons/AccountBox';

export default function Component(props) {

    const links = {
        facebook: 'https://www.facebook.com/joshuareisbord/',
        twitter: 'https://twitter.com/JoshuaReisbord',
        instagram: 'https://www.instagram.com/joshuareisbord/',
        linkedin: 'https://www.linkedin.com/in/joshua-reisbord-4b3a211a1/',
        github: 'https://github.com/joshuareisbord',
        resume: 'https://joshuareisbord.com/resume'
    }

  return (
    <footer>
      <Container maxWidth="lg">
        <Box py={1} textAlign="center">
          <Box>

            <IconButton target='_blank' href={links.facebook} color="inherit" aria-label="Facebook">
              <FacebookIcon />
            </IconButton>

            <IconButton target='_blank' href={links.twitter} color="inherit" aria-label="Twitter">
              <TwitterIcon />
            </IconButton>

            <IconButton target='_blank' href={links.instagram} color="inherit" aria-label="Instagram">
              <InstagramIcon />
            </IconButton>

            <IconButton target='_blank' href={links.linkedin} color="inherit" aria-label="LinkedIn">
              <LinkedInIcon />
            </IconButton>

            <IconButton target='_blank' href={links.github} color="inherit" aria-label="GitHub">
              <GitHubIcon />
            </IconButton>

            <IconButton target='_blank' href={links.resume} color="inherit" aria-label="Resume">
              <AccountBoxIcon />
            </IconButton>

          </Box>

          <hr/>

          <Typography color="textSecondary" component="p" variant="caption" gutterBottom={false}>© 2021 Joshua Reisbord. All rights reserved.</Typography>
        
        </Box>
      </Container>
    </footer>
  );
}