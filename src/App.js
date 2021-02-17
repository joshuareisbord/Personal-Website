import React, { Component } from 'react';
import { Grid, makeStyles, Divider } from '@material-ui/core'
import './App.css';

import About from './components/about'
import Projects from './components/projects'

class App extends Component{

  render = () => {

    return (

        <div>
          <Grid container direction='column'justify='center' alignItems='center' classes={{root: {width: '100%'}}} spacing={6}>

            <Grid item xs={8}>
              <About></About>
            </Grid>

            <Grid item xs={10}>
                <Projects></Projects>
            </Grid>

          </Grid>
        </div>
  
        
    );

  }



}

export default App;
