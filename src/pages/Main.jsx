import React from "react";

import Navbar from "../components/navbar"
import Home from "../components/home";
import About from "../components/about";
import Portfolio from "../components/portfolio";
import Resume from "../components/resume";
import Contact from "../components/contact";
import Footer from "../components/footer"


import {createTheme, Grid, Paper, ThemeProvider} from "@material-ui/core";

function Component(props){

    const styles = {
        paper: {
            textAlign: "center",
            minHeight: props.height,
            alignItems: props.alignment,
        },
    }

    return (
        <Grid item>
            <section title={props.title}>
                <Paper style={styles.box} variant={"outlined"}>
                    {props.component}
                </Paper>
            </section>
        </Grid>
    );
}


function Main() {

    const theme = createTheme({

        palette: {
            type: "light",
        },
        typography: {
            fontFamily: [
                'Montserrat', "sans-serif"
            ].join(","),
        }
    });

    const styles = {
        paper: {
            backgroundColor: theme.palette.background.paper,
            borderRadius: 0,
            minWidth: "100vw",
            minHeight: "100vh",
            paddingLeft: "2em",
            paddingRight: "2em",
        },
    }


    return (

        <div>
            <ThemeProvider theme={theme}>
                <Paper style={styles.paper}>
                    <Grid
                        container
                        direction="column"
                        justifyContent="center"
                        spacing={0}
                    >
                            <Component component={<Navbar/>} title={"Navbar"} height={"5vh"} alignment={"flex-end"}/>
                            <Component component={<Home/>} title={"Home"} height={"30vh"} alignment={"center"}/>
                            <Component component={<About/>} title={"About"} height={"30vh"} alignment={"center"}/>
                            <Component component={<Portfolio/>} title={"Portfolio"} height={"30vh"} alignment={"center"}/>
                            <Component component={<Resume/>} title={"Resume"} height={"30vh"} alignment={"center"}/>
                            <Component component={<Contact/>} title={"Contact"} height={"30vh"} alignment={"center"}/>
                            <Component component={<Footer/>} title={"Footer"} height={"5vh"} alignment={"center"}/>

                    </Grid>
                </Paper>
            </ThemeProvider>
        </div>
    );

}

export default Main;