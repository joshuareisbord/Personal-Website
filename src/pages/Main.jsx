import React from "react";

import Footer from "../components/footer"
import Header from "../components/header"


import {createTheme, Paper, ThemeProvider} from "@material-ui/core";

function Main(){

    const theme = createTheme({

        palette: {
            type: "dark",
        },

    });

    return (

        <ThemeProvider theme={theme}>

            <Paper elevation={0} square={true}>

                <Header/>

                <Footer/>

            </Paper>

        </ThemeProvider>


    );
}

export default Main;