import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Paper, Divider, Box, Grid, Link, Avatar, InputAdornment, IconButton, LinearProgress } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import brandIcon from '../../public/robotics.svg';
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
      paper: 'rgba(0,0,0,1)',
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

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[@$!%*?&#]/.test(password)) strength += 25;
    return strength;
  };

  const validateForm = () => {
    let formErrors = {};
    if (!username) formErrors.username = 'Username is required';
    if (!email) formErrors.email = 'Email is required';
    else if (!validateEmail(email)) formErrors.email = 'Invalid email address';
    if (!password) formErrors.password = 'Password is required';
    else if (validatePasswordStrength(password) < 50) formErrors.password = 'Password is too weak';
    if (password !== confirmPassword) formErrors.confirmPassword = 'Passwords do not match';
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleRegister = () => {
    if (validateForm()) {
        const data = { username, email, password };
        const url = '/api/register'; // Replace with your actual API endpoint
  
        try {
          toast.promise(
            axios.post(url, data, {
              headers: {
                'Content-Type': 'application/json',
              },
            }),
            {
              loading: 'Registering...',
              success: () => {
              'Registration Successful!';
              navigate('/dashboard'); // Redirect to the dashboard or another page after successful registration
              },
              error: (error) => {
                if (error.response && error.response.status === 401) {
                  return 'Unauthorized!';
                }
                return 'Registration Failed!';
              },
            }
          );
        } catch (error) {
          console.error('Registration error:', error);
          toast.error('Registration failed!');
        }
      
    }
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(validatePasswordStrength(newPassword));
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
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={!!errors.username}
                helperText={errors.username}
                autoComplete="off"
              />
              <TextField
                fullWidth
                variant="outlined"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
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
                error={!!errors.password}
                helperText={errors.password}
                autoComplete="new-password"
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
                        
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={passwordStrength} sx={{ height: 10, borderRadius: 5 }} />
              </Box>
              <TextField
                fullWidth
                variant="outlined"
                type={showPassword ? 'text' : 'password'}
                label="Re-enter Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                autoComplete="new-password"
                name="confirmPassword"
                id="confirmPassword"
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
                sx={{ mt: 2, mb: 2, height: '50px', borderRadius: '8px' , fontSize:'1rem'}}
                onClick={handleRegister}
              >
                Sign Up
              </Button>
              <Divider sx={{ marginBottom: 2, backgroundColor: '#000000' }} />
              <Typography variant="body2" align="center" sx={{ color: '#b0bec5' }}>
                Already have an account?{' '}
                <Link href="/login" variant="body2">
                  Sign in
                </Link>
              </Typography>
            </Paper>
          </Container>
        </Grid>
      </div>
      <Toaster richColors /> 
    </ThemeProvider>
  );
};

export default RegisterPage;
