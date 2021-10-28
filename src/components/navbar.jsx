import React from "react";
import {Grid, makeStyles, Paper, Typography, useTheme, Link} from "@material-ui/core";

import "./test.css"

const useStyles = makeStyles(theme => ({
    link: {
        color: theme.palette.text.primary,
        position: 'relative',
        // textDecoration: 'none',

        '&:before': {
            content: "''",
            position: 'absolute',
            width: '0',
            height: '2px',
            bottom: '-3px',
            left: '0%',
            transform: 'translate(0%)',
            backgroundColor: theme.palette.text.primary,
            transformOrigin: 'center',
            visibility: 'hidden',
            transition: 'all 0.2s ease-in-out',
        },
        '&:hover:before': {
            visibility: 'visible',
            width: '100%',
        },
    },
}));

function NavButton(props){

    const theme = useTheme();
    const classes = useStyles(theme);

    return (
            <Link className={classes.link} href={`/#${props.text}`} underline={"none"}>
                <Typography component="span">{props.text}</Typography>
            </Link>
    );
}

function Navbar(){

    const menuItems = ["Home", "About", "Portfolio", "Resume", "Contact"]

    const style = {
        paper: {
            paddingRight: "1em",
            paddingTop: "1em",
            paddingBottom: "1em",
        }
    }

    return (

        <header>

            <Paper style={style.paper} elevation={0}>

                <Grid
                    container
                    direction="row"
                    justifyContent="flex-end"
                    alignItems="center"
                    spacing={3}
                >

                    {menuItems.map((item) => (
                        <Grid item key={menuItems.indexOf(item)}>
                            <NavButton text={item}/>
                        </Grid>
                    ))
                    }

                </Grid>
            </Paper>
        </header>

    );
}

export default Navbar;