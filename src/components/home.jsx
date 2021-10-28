import React from "react";

import {Grid, Paper, Typography} from "@material-ui/core";

function GreetingItem(props){

    const style = {
        name: {
            fontSize: "5vh",
            fontWeight: "bold",
            textAlign: "left",
            // margin: "0.5rem"
        },
        about: {
            fontSize: "2.5vh",
            // fontWeight: "bold",
            textAlign: "left",
            // margin: "0.5rem"
        },
    }

    const messages = {
        greeting: "Hi, I'm Joshua Reisbord",
        about: "I am a fourth year student at Queen's University perusing a Bachelors in Computer Science."
    }

    return (
        <Grid item>
                {/*Typography elements*/}
                <Grid
                    container
                    item
                    direction="column"
                    justifyContent="flex-start"
                    alignItems="flex-start"
                >
                    <Grid item>
                        <Typography color={"textPrimary"} style={style.name}>
                            {messages.greeting}
                        </Typography>
                        <Typography color={"textSecondary"} style={style.about}>
                            {messages.about}
                        </Typography>
                    </Grid>

                </Grid>
        </Grid>
    );
}
// end greeting item

function Home(){

    const styles = {
        paper: {
            display: 'flex',
            maxWidth: "75vw",
            minHeight: "50vh",
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
        },
    }

    return (
        <div>
            <Grid
                container
                direction="row"
                justifyContent="center"
                alignItems="center"
            >
                <Grid item>
                    <Paper style={styles.paper} elevation={0}>
                        <GreetingItem/>
                    </Paper>
                </Grid>
            </Grid>
        </div>
    );

}

export default Home;