import * as React from 'react';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import {Box, Button, ButtonGroup, ListItem, List, ListItemAvatar, Avatar, ListItemText} from "@mui/material";
import {CreditCard} from "@mui/icons-material";

const ActionButton = ({children}) => (
    <Button size="large" color="primary" style={{flexGrow: 1, fontWeight: 700, textTransform: "capitalize"}} variant="outlined">
        {children}
    </Button>
)

const CardItem = ({name, details}) => (
    <ListItem sx={{borderBottom: "2px solid #F6F8FC"}}>
        <ListItemAvatar>
            <Avatar sx={{bgcolor: "#455154", width: 44, height: 44}}>
                <CreditCard/>
            </Avatar>
        </ListItemAvatar>
        <ListItemText
            primary={
                <Typography fontWeight={500}>
                    {name}
                </Typography>
            }
            secondary={
                <Typography fontSize="14px" color="#6B6E75">
                    {details}
                </Typography>
            }
        />
    </ListItem>
)


export default function App() {
    return (
        <Container maxWidth="sm">
            <Typography
                fontWeight="500"
                variant="h6" component="h1" color="text.main">
                My Money Account
            </Typography>
            <Typography pt={1} fontWeight="600" variant="h4" component="h1">€ 250</Typography>
            <Box mt={2} sx={{display: 'flex'}} gap="12px">
                <ActionButton>Add Card</ActionButton>
                <ActionButton>Details</ActionButton>
            </Box>
            <Box sx={{height: "18px", bgcolor: "#F6F8FC", my: 3}}/>
            <List sx={{width: '100%', borderTop: "2px solid #F6F8FC"}}>
                <CardItem name="Visa Debit" details="*6645 | Exp. 12/2015"/>
                <CardItem name="Expanses" details="*3584 | Exp. 12/2015"/>
                <CardItem name="Sword Business Card | Gold" details="*3445 | Exp. 12/2015"/>
            </List>
        </Container>
    );
}
