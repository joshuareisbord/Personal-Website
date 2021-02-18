import React from 'react';
import { Grid, makeStyles, Paper } from '@material-ui/core'
import Divider from '@material-ui/core/Divider'
import './App.css';

import About from './components/about'
import Projects from './components/projects'

const useStyles = makeStyles((theme) => ({

  root: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'column',
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
  },

}));

  export default function App(){

    const classes = useStyles();

    return (
      <div className={classes.root}>
        <Grid container direction='column'justify='center' alignItems='center' spacing={6}>
          <Grid item>
            <About/>
          </Grid>
          <Grid item>
            <Projects/>
          </Grid>
        </Grid>
        
      </div>
      
        
    );

  }
