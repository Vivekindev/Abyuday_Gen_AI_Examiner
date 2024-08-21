import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { SearchOff, ErrorOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#121212',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        p: 3,
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <ErrorOutline sx={{ fontSize: 120, color: '#1e88e5' }} />
          <SearchOff sx={{ fontSize: 120, color: '#1e88e5', ml: -2 }} />
        </Box>
        <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '4.5rem', mb: 2 }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 500, mb: 4 }}>
          We couldn't find the page you were looking for.
        </Typography>
      </Box>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        sx={{
          textTransform: 'none',
          fontSize: '1.2rem',
          p: '12px 36px',
          borderRadius: '50px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
          backgroundColor: '#1e88e5',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        }}
      >
        Return to Home
      </Button>
    </Box>
  );
};

export default NotFoundPage;
