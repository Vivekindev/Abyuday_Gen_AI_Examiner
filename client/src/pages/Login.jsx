import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Paper, Divider, Box, Grid, Link, Avatar, InputAdornment, IconButton } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import GoogleIcon from '@mui/icons-material/Google';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import brandIcon from '../../public/robotics.svg';
import './login.css'
import { Toaster, toast } from 'sonner';
import axios from 'axios';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffffff',
    },
    background: {
      default: 'transparent',
      paper: 'rgba(0,0,0,0.1)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h4: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: '16px',
          backgroundColor: '#1e1e1e',
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'transparent',
            },
            '&:hover fieldset': {
              borderColor: '#ffffff',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ffffff',
            },
          },
          '& .MuiFilledInput-root': {
            backgroundColor: '#1e1e1e',
            borderRadius: 8,
            '&:before, &:after': {
              borderBottom: 'none',
            },
            '&:hover:not(.Mui-disabled):before': {
              borderBottom: 'none',
            },
          },
          '& .MuiInputBase-input': {
            color: '#ffffff',
          },
          '& .MuiInputLabel-root': {
            color: '#ffffff',
          },
          // Autofill background color override
          '&:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 1000px #1e1e1e inset',
            WebkitTextFillColor: '#ffffff',
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#82b1ff',
          '&:hover': {
            color: '#ffffff',
            textDecoration: 'underline',
          },
        },
      },
    },
  },
});

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleEmailChange = (e) => setEmail(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Email and password are required!');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('Invalid email format!');
      return;
    }

    const url = "http://localhost:4040/api/login";
    const data = { email, password };

    try {
      toast.promise(
        axios.post(url, data, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        {
          loading: 'Authenticating...',
          success: () => {
               'Login Successful!';
                navigate('/dashboard');         
          },
          error: (error) => {
            if (error.response && error.response.status === 401) {
              return 'Unauthorized!';
            }
            return 'Login Failed!';
          },
        }
      );
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed!');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/auth/google';
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);

  return (
    <ThemeProvider theme={darkTheme}>
        
      <div className='authBg'>
        <Grid
          container
          justifyContent="center"
          alignItems="center"
          style={{ minHeight: '100vh', padding: '16px' }}
        >
          <Container maxWidth="xs">
            <Paper elevation={0} sx={{ padding: 4, borderRadius: 4 , backgroundColor: 'transparent', transform: 'translate(0px,-3rem)',}}>
              <Box textAlign="center" sx={{ mb: 3 }}>
                <Avatar sx={{ backgroundColor:'#1E1E1E',width: 56, height: 56, margin: 'auto',padding:'0.2rem',paddingBottom:'0.5rem' }}>
                  <img src={brandIcon} alt="Brand Icon" />
                </Avatar>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 600, color: '#ffffff' }}>
                  <div className="brandFont">ABYUDAY</div>  
                  <center>
                    <div style={{fontWeight:'800',borderRadius:'0.2rem',display:'flex',justifyContent:'center',alignItems:'center',paddingTop:'0.05rem',fontSize:'0.44rem',width:'fit-content',background:'white',color:'black',paddingRight:'0.4rem',paddingLeft:'0.4rem'}}>A Generative-AI Examiner Platform</div>
                  </center>
                </Typography>
              </Box>
              <Divider sx={{ marginBottom: 3, backgroundColor: '#000000' }} />
              <TextField
                fullWidth
                variant="outlined"
                label="Email"
                value={email}
                onChange={handleEmailChange}
                autoComplete="off"
                name="email"
                id="email"
              />
              <TextField
                fullWidth
                variant="outlined"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={password}
                onChange={handlePasswordChange}
                autoComplete="new-password" // Preventing autofill
                name="password"
                id="password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 2, mb: 2 ,height:'3rem',fontSize:'1rem'}}
                onClick={handleLogin}
              >
                Login
              </Button>
              <Box textAlign="center">
                <Typography variant="body2" sx={{ color: '#b0bec5', mb: 2 }}>
                  Or
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<GoogleIcon fontSize='large'/>}
                  onClick={handleGoogleLogin}
                  sx={{
                    fontSize:'1rem',
                    borderColor: '#ffffff',
                    height:'3rem',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  Continue with Google
                </Button>
              </Box>
              <Box textAlign="center" sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ color: '#b0bec5', mb: 1 }}>
                  Don’t have an account? <Link href="/register" variant="body2">
                  Register Here
                </Link>
                </Typography>
              </Box>
            </Paper>
          </Container>
        </Grid>
      </div>
      <Toaster richColors /> 
    </ThemeProvider>
  );
};

export default LoginPage;
