import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    fontWeightBold: 700,
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#212121',
          color: '#f5f5f5',
          fontWeight: 'bold',
          fontSize: '1rem',
          border: '1px solid #424242',
        },
        body: {
          backgroundColor: '#121212',
          color: '#e0e0e0',
          border: '1px solid #424242',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #424242',
        },
      },
    },
  },
});

const topicsData = [
  { slNo: 1, topic: 'React Basics', questions: 10 },
  { slNo: 2, topic: 'Material-UI', questions: 5 },
  { slNo: 3, topic: 'JavaScript', questions: 8 },
  // Add more topics as needed
];

const ProfessionalDarkModeTable = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Topics and Questions
        </Typography>
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sl No.</TableCell>
                <TableCell>Topic</TableCell>
                <TableCell>No. of Questions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topicsData.map((row) => (
                <TableRow key={row.slNo}>
                  <TableCell>{row.slNo}</TableCell>
                  <TableCell>{row.topic}</TableCell>
                  <TableCell>{row.questions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </ThemeProvider>
  );
};

export default ProfessionalDarkModeTable;
