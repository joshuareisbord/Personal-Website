import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import Typography from '@material-ui/core/Typography';

// import SlideImages from './slide'

import GitHubButton from './buttons/githubButton'
import DemoButton from './buttons/demoButton'
import { Paper } from '@material-ui/core';

const useStyles = makeStyles({
  root: {
    maxWidth: "45vw",
    minWidth: "20vw"
  },
  media: {
    maxWidth: "500px",
    minWidth: "500px",

    maxHeight: "500px",
    minHeight: "500px",

    height: "30vh",
    width: "35vw",
  },
});

export default function ProjectCard(props) {

  const classes = useStyles();

  // const img = require.context('../../img', true);

  return (
    <Paper elevation={10}>
      <Card className={classes.root}>
        <CardActionArea>
          <CardMedia
            className={classes.media}
            image={props.images}
            title={props.title}
          />
          {/* <CardContent>
            <Typography gutterBottom variant="h5" component="h2">
              {props.title}
            </Typography>
            <Typography variant="body2" color="textSecondary" component="p"> {props.discription} </Typography>
          </CardContent> */}
        </CardActionArea>
        <CardActions>
          <GitHubButton size="small" repo={props.repo}/>
          <DemoButton disabled={props.demoLink===""} size="small" link={props.demoLink}></DemoButton>
        </CardActions>
      </Card>
    </Paper>
    
  );
}