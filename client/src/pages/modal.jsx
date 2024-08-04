import React, { useState } from 'react';
import { Box, Button, Typography, Modal, Backdrop, Fade, TextField, Slider, Switch, FormControlLabel } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
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
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState(5);
  const [logical, setLogical] = useState(false);
  const [memory, setMemory] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleConfirm = () => {
    // Handle the final submit action here
    setOpen(false);
    console.log('Final submit confirmed', { prompt, numQuestions, difficulty, logical, memory });
  };

  return (
    <ThemeProvider theme={theme}>
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Open Confirmation Modal
      </Button>
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
            backdropFilter: 'blur(10px)', // Blur effect on the backdrop
            backgroundColor: 'rgba(255, 255, 255, 0.1)', // White overlay at 10% opacity
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
              label="Prompt"
              placeholder="Enter the topic for question generation"
              variant="outlined"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              InputLabelProps={{ style: { color: '#ffffff' } }}
              InputProps={{ style: { color: '#ffffff' } }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Number of Questions"
              type="number"
              inputProps={{ min: 1 }}
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
            />
            <FormControlLabel
              control={
                <Switch
                  checked={logical}
                  onChange={(e) => setLogical(e.target.checked)}
                  color="primary"
                />
              }
              label="Logical Based"
              sx={{ color: 'text.primary' }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={memory}
                  onChange={(e) => setMemory(e.target.checked)}
                  color="primary"
                />
              }
              label="Memory Based"
              sx={{ color: 'text.primary' }}
            />
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
    </ThemeProvider>
  );
};

export default ConfirmationModal;
