import React, { useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Box, Button, Typography, Modal, Backdrop, Fade, TextField, Slider, Select, MenuItem } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Toaster, toast } from 'sonner'; // Updated import
import './modal.css';
import './Sidebar.css';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000000',
      paper: '#000000',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
    primary: {
      main: '#ffffff',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 8,
  boxShadow: 24,
  p: 4,
  outline: 'none',
};

const ConfirmationModal = () => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [testName, setTestName] = useState('');
  const [numQuestions, setNumQuestions] = useState(12);
  const [difficulty, setDifficulty] = useState(5);
  const [selectedModel, setSelectedModel] = useState('Gemini 1.5 Flash');

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleConfirm = async () => {
    setOpen(false);
    const testId = uuidv4().slice(0, 6);

    const url = 'http://localhost:4040/api/test/create';
    const data = {
      testId,
      testName,
      prompt,
      numQuestions,
      difficulty,
      selectedModel
    };

    const createTestPromise = () =>
      axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

    toast.promise(createTestPromise(), {
      loading: 'Creating...',
      success: (response) => {
        return `Test ${testName} created successfully!`;
      },
      error: 'Failed to create the test.',
    });
  };

  const getSliderColor = (value) => {
    if(value <= 3)
      return 'white';
    else if(value > 3 && value <= 6)
      return '#1976d2';
    else 
      return '#ff1744';
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="mainBox">
        <button onClick={handleOpen} className="specialBtn" style={{ transform: 'translate(0,-1.5rem)' }}>
          <AutoAwesomeIcon sx={{ marginRight: '1rem' }} /> Generate Test
        </button>
        <Modal
          aria-labelledby="transition-modal-title"
          aria-describedby="transition-modal-description"
          open={open}
          onClose={handleClose}
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{
            timeout: 500,
            style: {
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <Fade in={open}>
            <Box sx={modalStyle}>
              <Typography id="transition-modal-title" variant="h6" component="h2" color="textPrimary" gutterBottom>
                Generate Questions
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                label="Test Name"
                placeholder="Enter the name of the test"
                variant="outlined"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                InputLabelProps={{ style: { color: '#ffffff' } }}
                InputProps={{ style: { color: '#ffffff' } }}
                inputProps={{ autocomplete: 'off' }}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Prompt"
                placeholder="Enter the prompt for question generation"
                variant="outlined"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                InputLabelProps={{ style: { color: '#ffffff' } }}
                InputProps={{ style: { color: '#ffffff' } }}
                inputProps={{ autocomplete: 'off' }}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Number of Questions"
                type="number"
                inputProps={{ min: 1, autocomplete: 'off' }}
                variant="outlined"
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
                InputLabelProps={{ style: { color: '#ffffff' } }}
                InputProps={{ style: { color: '#ffffff' } }}
              />
              <Typography id="difficulty-slider" gutterBottom color="textPrimary">
                Difficulty Level
              </Typography>
              <Slider
                value={difficulty}
                onChange={(e, newValue) => setDifficulty(newValue)}
                aria-labelledby="difficulty-slider"
                valueLabelDisplay="auto"
                step={1}
                marks
                min={1}
                max={10}
                sx={{
                  color: getSliderColor(difficulty),
                }}
              />
              <Typography id="select-option" gutterBottom color="textPrimary">
                Select Model
              </Typography>
              <Select
                fullWidth
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                variant="outlined"
                sx={{
                  color: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#ffffff',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#ffffff',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#ffffff',
                  },
                }}
              >
                <MenuItem value="Gemini 1.5 Flash">Gemini 1.5 Flash</MenuItem>
                <MenuItem value="Gemini 1.5 Pro">Gemini 1.5 Pro</MenuItem>
              </Select>
              <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleClose}
                  sx={{
                    borderColor: '#ffffff',
                    color: '#ffffff',
                    '&:hover': {
                      borderColor: '#ffffff',
                      backgroundColor: '#333333',
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleConfirm}
                  sx={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    '&:hover': {
                      backgroundColor: '#e0e0e0',
                    },
                  }}
                >
                  Confirm
                </Button>
              </Box>
            </Box>
          </Fade>
        </Modal>
        <Toaster richColors /> {/* Updated to use Toaster for Sonner toasts */}
      </div>
    </ThemeProvider>
  );
};

export default ConfirmationModal;
