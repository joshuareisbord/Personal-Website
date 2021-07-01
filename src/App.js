import React from 'react';

import {
    BrowserRouter as Router,
    Switch,
    Route
       } from 'react-router-dom';

import {Box} from '@material-ui/core'

import Home from './components/pages/home'
import About from './components/pages/about';
import Projects from './components/pages/projects';
import Resume from './components/pages/resume';

import Footer from './components/organisms/footer'

function App(){

  const styles = {
    exteriorBox: {
        display: 'flex',
        width: '100vw',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
    },
    interiorBox: {
        display: 'flex',
        minHeight: '90vh',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
    },
    footerBox: {
        display: 'flex',
        width: '100vw',
        height: '10vh',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexDirection: 'column',
    },
}

    return (
      <div>
      {/* This box bounds the entire page */}
      <Box style={styles.exteriorBox}>

          {/* Page renders in this box */}
          <Box style={styles.interiorBox} justifyContent='center'>
              <Router>
                  <Switch>


                      <Route exact path="/">
                          <Home/>
                      </Route>

                      <Route exact path="/about">
                          <About/>
                      </Route>

                      <Route exact path="/projects">
                          <Projects/>
                      </Route>

                      <Route exact path="/resume">
                          <Resume/>
                      </Route>


                  </Switch>
              </Router>
          </Box>

          {/* Footer renders in this page */}
          <Box style={styles.footerBox}>
              <Footer/>
          </Box>
      </Box>

  </div>
    );

}

export default App;
