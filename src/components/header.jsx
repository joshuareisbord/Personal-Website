import React from "react";
import {Box, Grid} from "@material-ui/core";

import "./test.css"

// const useStyles = makeStyles(theme => ({
//
//     root: {
//         fontSize: "1.2rem",
//         fontWeight: "bold",
//         textTransform: "none",
//         "&:hover":{
//             backgroundColor: "transparent",
//             color: theme.palette.primary.main
//
//         }
//     }
//
// }))

function NavButton(props){

    // const theme = useTheme();
    // const classes = useStyles(theme);

    return (
        <a href={`/#${props.text}`}>
            <p className={"hover-underline-animation"}>
                {props.text}
            </p>
        </a>
    );
}

function Header(){

    const menuItems = ["Home", "About", "Portfolio", "Resume", "Contact"]

    return (

        <header>
            <Box sx={{p:3}}>

                <Grid
                    container
                    direction="row"
                    justifyContent="flex-end"
                    alignItems="center"
                    spacing={2}
                >

                    {menuItems.map((item) => (
                        <Grid item>
                            <NavButton text={item}/>
                        </Grid>
                    ))
                    }

                </Grid>
            </Box>
        </header>

    );
}

export default Header;