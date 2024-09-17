import React, { useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  Box, Button, Typography, Modal, Backdrop, Fade, Divider, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TabIcon from '@mui/icons-material/Tab';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FocusIcon from '@mui/icons-material/Visibility';
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo';
import LightbulbCircleIcon from '@mui/icons-material/LightbulbCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000000',
      paper: '#000000', // Slightly lighter background for the modal
    },
    text: {
      primary: '#d4d5d6',
      secondary: '#b0b0b0',
    },
    primary: {
      main: '#ffffff',
    },
    secondary: {
      main: '#33A6FF', // Professional blue tone
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
  width: 500, // Increased width for better layout
  bgcolor: 'background.paper',
  borderRadius: 6, // Smoother rounded corners
  boxShadow: 24,
  p: 4,
  outline: 'none',
};

const TestInstructionModal = (props) => {
  const testID = props.testID;
  const [open, setOpen] = useState(false); // Modal open state

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleBeginTest = () => {
    handleClose();  // Close the current modal or perform the necessary action
    const testUrl = `http://localhost:5173/test?testID=${testID}`;  // Replace with your desired URL
    window.open(testUrl, '_blank');  // Opens the URL in a new tab
  };

  return (
    <ThemeProvider theme={theme}>
      <>
        <button className="button" onClick={handleOpen}>
          Take Test
          <svg fill="currentColor" viewBox="0 0 24 24" className="icon">
            <path
              clipRule="evenodd"
              d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72H8.25a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3z"
              fillRule="evenodd"
            />
          </svg>
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
                backgroundColor: 'rgba(255, 255, 255, 0.1)', // Original backdrop
            },
          }}
        >
          <Fade in={open}>
            <Box sx={modalStyle}>
              <Typography id="transition-modal-title" variant="h5" component="h2" color="primary" gutterBottom>
                <LightbulbCircleIcon fontSize="large" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                <b>Test Instructions</b>
              </Typography>

              <Divider sx={{ my: 2, bgcolor: 'secondary.main' }} />

              {/* Accordion for Instruction 1 */}
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: 'secondary.main' }} />}
                  aria-controls="panel1a-content"
                  id="panel1a-header"
                >
                  <TabIcon sx={{ color: 'secondary.main', mr: 1 }} />
                  <Typography color="secondary" variant="subtitle1">
                    Do Not Shift Tabs
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.primary">
                    Shifting between tabs or windows during the test will trigger warnings. Multiple warnings may result in disqualification.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Accordion for Instruction 2 */}
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: 'secondary.main' }} />}
                  aria-controls="panel2a-content"
                  id="panel2a-header"
                >
                  <AccessTimeIcon sx={{ color: 'secondary.main', mr: 1 }} />
                  <Typography color="secondary" variant="subtitle1">
                    Complete the Test Within the Specified Time
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.primary">
                    Ensure that you finish the test within the allotted time. Once the time is up, your answers will be automatically submitted.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Accordion for Instruction 3 */}
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: 'secondary.main' }} />}
                  aria-controls="panel3a-content"
                  id="panel3a-header"
                >
                  <FocusIcon sx={{ color: 'secondary.main', mr: 1 }} />
                  <Typography color="secondary" variant="subtitle1">
                    Stay Focused
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.primary">
                    Remain focused and avoid distractions. Once you start the test, it's recommended not to leave the test screen.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Divider sx={{ my: 2, bgcolor: 'secondary.main' }} />

              <Button
                variant="contained"
                onClick={handleBeginTest}
                fullWidth
                sx={{ mt: 3, bgcolor: 'white', borderRadius: '0.6rem', height: '3rem' }}
              >
                <b>Begin Test  </b> <ContentPasteGoIcon sx={{ml:'0.7rem'}}/>
              </Button>
            </Box>
          </Fade>
        </Modal>
      </>
    </ThemeProvider>
  );
};

export default TestInstructionModal;
