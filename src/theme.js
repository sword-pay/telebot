import { red } from '@mui/material/colors';
import { createTheme } from '@mui/material/styles';

// A custom theme for this app
const theme = createTheme({
  typography: {
    fontFamily: 'Poppins, sans-serif', // Set your desired font family
  },
  palette: {
    primary: {
      main: '#008CFF',
    },
    secondary: {
      main: '#19857b',
    },
    text:{
      main:'#6B6E75'
    },
    error: {
      main: red.A400,
    },
  },
});

export default theme;
