import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Paper, TextField, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom'; // Import useNavigate from React Router
import SearchIcon from '@mui/icons-material/Search';
import { InputAdornment } from '@mui/material';

import { lineSpinner } from 'ldrs'
lineSpinner.register()

import axios from 'axios';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const TestsCreated = () => {
  const [searchText, setSearchText] = useState('');
  const [testData, setTestData] = useState(null);
  const [filteredData, setFilteredData] = useState(testData);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate(); // Initialize useNavigate hook

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const response = await axios.post("/api/fetchcreatedtests", {}, {
          headers: {
            'Content-Type': 'application/json',
            withCredentials: true
          }
        });
        if (response) {
          setTestData(response.data);
          setFilteredData(response.data);
          setIsLoading(false);
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchTestData();
  }, []);

  // Handle the search/filtering
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchText(value);

    const filtered = testData.filter(
      (test) =>
        test.testID.toLowerCase().includes(value) ||
        test.testName.toLowerCase().includes(value) ||
        test.questionCount.toLowerCase().includes(value) ||
        test.status.toLowerCase().includes(value) ||
        test.difficulty.toLowerCase().includes(value) // Include difficulty in search
    );
    setFilteredData(filtered);
  };

  const columns = [
    { field: 'id', headerName: 'Sl.no', flex: 0.8 },
    { field: 'testID', headerName: 'Test ID', flex: 1 },
    { field: 'testName', headerName: 'Test Name', flex: 1.8 },
    { field: 'questionCount', headerName: 'No. of Questions', flex: 1 },
    { field: 'status', headerName: 'Generation', flex: 1 },
    { field: 'difficulty', headerName: 'Difficulty', flex: 1 },
    {
      field: 'action',
      headerName: 'Action',
      flex: 1,
      renderCell: (params) => (
        <strong>
          <button
            style={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'center',
              height: '80%',
              color: 'white',
              backgroundColor: 'rgba(0, 123, 255, 0.2)',
              padding: '0rem 1rem',
              border: '1px solid #007BFF',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '0.25rem',
              transition: 'background-color 0.3s ease, transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(0, 123, 255, 0.4)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(0, 123, 255, 0.2)';
              e.target.style.transform = 'scale(1)';
            }}
            onClick={() => {
              // Append the testID to the URL and refresh the page
              window.location.href = `/dashboard?TestID=${params.row.testID}`;
            }}
          >
            View
          </button>
        </strong>
      ),
    }
    
  ];

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <l-line-spinner size="50" stroke="3" speed="1" color="white"></l-line-spinner>
        </div>
      ) : (
        <Container style={{ height: '100%', width: '100%', marginTop: '1.5rem', marginBottom: '0.8rem' }}>
          <Box sx={{ marginBottom: '1rem' }}>
            <TextField
              label="Search Tests"
              variant="outlined"
              fullWidth
              value={searchText}
              onChange={handleSearch}
              autoComplete="off"
              spellCheck={false}
              sx={{
                backgroundColor: '#121212',
                input: { color: '#fff' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '' },
                  '&:hover fieldset': { borderColor: '#0056b3' },
                  '&.Mui-focused fieldset': { borderColor: '#0056b3' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon style={{ color: 'white' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Paper
            style={{
              height: "87%",
              width: '100%',
              marginTop: '1em',
              backgroundColor: 'transparent',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            <DataGrid
              rows={filteredData}
              columns={columns}
              pageSize={5}
              rowsPerPageOptions={[5]}
              disableSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': { borderBottom: '1px solid #333', backgroundColor: 'transparent', color: '#ffffff' },
                '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid #333', backgroundColor: 'transparent', color: '#ffffff' },
                '& .MuiDataGrid-footerContainer': { borderTop: '1px solid #333', backgroundColor: '#121212', color: '#ffffff' },
              }}
            />
          </Paper>
        </Container>
      )}
    </ThemeProvider>
  );
};

export default TestsCreated;
