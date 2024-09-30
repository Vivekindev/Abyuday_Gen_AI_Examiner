import React, { useState, useEffect, useRef} from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import {  Modal, Backdrop, Fade, CssBaseline, Container, Typography, Button, Radio, FormControlLabel, Paper, Box, Grid, IconButton, Chip, useTheme, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow  } from '@mui/material';
import { Timer } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import './Quizpage.css';
import axios from 'axios';
import { lineSpinner } from 'ldrs'
lineSpinner.register()


import HomeIcon from '@mui/icons-material/Home';
import { styled } from '@mui/system';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DataGrid } from '@mui/x-data-grid';
import Confetti from 'react-confetti'
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import InsightsIcon from '@mui/icons-material/Insights';
import GppGoodIcon from '@mui/icons-material/GppGood';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { Card, CardContent, List, ListItem, SvgIcon } from '@mui/material';
//-----------------------------infoUser btn ------------------------------------------
// Custom Styled Components
const UserBox = styled('div')(({ theme }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
 
  backgroundColor: 'rgba(0, 0, 0, 1)', // Neutral transparent background
  borderRadius: '1.6rem', // More curved corners
  border:'1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: theme.shadows[2],
  color: theme.palette.common.white,
  cursor: 'pointer',
  '&:hover': {
            backgroundColor: 'rgba(0, 123, 255, 0.1)', // Slightly darker on hover
          },
}));

const UsernameText = styled('div')(({ theme }) => ({
  marginLeft: theme.spacing(1),
  fontSize: '1.1rem', // Smaller text
  fontWeight: theme.typography.fontWeightMedium,
}));
//-------------------------------------------------------------------------------------


// ----------------------------resultCard-----------------------------------------------

const StyledCard = styled(Card)({
  width: '90%', // Adjust width to fit within the parent, capped at 500px
  maxWidth: '500px', // Prevent card from exceeding a certain width
  borderRadius: '12px', // Slightly reduce the border radius for a compact look
  backgroundColor: 'rgba(255, 255, 255, 0.08)', // Slightly darker for better contrast
  backdropFilter: 'blur(8px)', // Reduce blur to keep text readable
  boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.2)', // Lighter shadow for less visual weight
  color: 'white',
  padding: '16px', // Standard padding for good spacing without adding bulk
  margin: '0px auto', // Reduced margin for more compact layout
  border: '1px solid rgba(255, 255, 255, 0.1)', // Keep a soft border
  transition: 'transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)', // Subtle lift on hover for interaction feedback
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Slightly brighter on hover
    boxShadow: '0 8px 24px 0 rgba(0, 0, 0, 0.3)', // Enhanced shadow on hover
  },
  
});

//---------------------------------------------------------------------------------

const Tcolumns = [
  { field: 'key', headerName: 'Details', width: 450 },
  { field: 'value', headerName: 'Value', width: 400 },
];

const Trows = [
  { id: 1, key: 'Test ID', value: '528231' },
  { id: 2, key: 'Created by', value: 'Vivek M' },
  { id: 3, key: 'No. of Students taken the test', value: '28' },
  { id: 4, key: 'Highest Marks', value: '34' },
  { id: 5, key: 'Lowest Marks', value: '10' },
  { id: 6, key: 'Average Marks', value: '24' },
];
//---------------------------------modal------------------------------------------//
const themeModal = createTheme({
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
    fontFamily: 'oswald, sans-serif',
  },
});

const style = {
  fontFamily: 'oswald, sans-serif',
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: '#000000',
  borderRadius: 4,
  boxShadow: 24,
  p: 4,
  outline: 'none',
  backdropFilter: 'blur(10px)', // Blurred background
  background: 'rgba(0, 0, 0, 1)', // White overlay at 10% opacity
};
 //----------------------------------------------------------------------//


const MainMenuButton = styled(Button)({
  backgroundColor: '#1B222C',
  color: 'white',
  fontWeight: 'bold',
  width:'100%',
  height:'100%',
  '&:hover': {
    backgroundColor: 'white',
    color: '#1B222C',
    transition: 'all 0.3s ease-in-out', // Optional: add transition for smooth effect
  },
});


const Quizpage = (props) => {
  const questions = props.questions;
  const ID = props.testID;
  const [remTime, setRemTime] = useState(props.remTime);
  const [currentQuestion, setCurrentQuestion] = useState(parseInt(localStorage.getItem('currentQuestion')) || 0);
  const [selectedOptions, setSelectedOptions] = useState(props.selectedOptions);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(null);
  const [confettiNeeded, setConfettiNeeded] = useState(null);
  const [timeLeft, setTimeLeft] = useState(remTime);
  const [scrollPos, setScrollPos] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(Array(questions.length).fill(false));
  const [incorrectAnswers, setIncorrectAnswers] = useState(Array(questions.length).fill(false));

  const [username, setUsername] = useState('');
  useEffect(() => {
    const usernameFromCookie = Cookies.get('username');
    setUsername(usernameFromCookie);
    setShowScore(props.showResults);
    setConfettiNeeded(props.showResults);
  }, []);



//Short Polling for Fetching Rem Time of Test
  useEffect(() => {
    let intervalId;

    const fetchRemainingTime = async () => {
      try {
        if(!showScore){
        const response = await axios.post('/api/test/remtime', {
          testID: props.testID,
        },
        {
          headers: { 'Content-Type': 'application/json' },
           withCredentials: true, 
        });
      
        const data = response.data;
        setTimeLeft(data.remTime);
        console.log(data.remTime);

        if (data.isEnded) {
          clearInterval(intervalId);
        }
      }
      } catch (err) {
        console.error('Polling failed:', err);
        clearInterval(intervalId);
        window.location.reload();
      }
    };

 
    fetchRemainingTime();
    intervalId = setInterval(fetchRemainingTime, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [props.testID]);


//update selected option on server side
useEffect(()=>{

const saveOptionsOnServer = async()=>{
try{
  const url = '/api/test/saveoptions';
  const data = { testID: ID , selectedOptions: selectedOptions};
  const response = await axios.post(url, data, {
    headers: { 'Content-Type': 'application/json' },
     withCredentials: true, 
  });
}
catch(err){
  console.log(err);
}

}

  saveOptionsOnServer();
},
[selectedOptions])


//Storing Current question in Local storage
useEffect(()=>{
  localStorage.setItem('currentQuestion', currentQuestion);
}
,[currentQuestion]);



  useEffect(() => {
    setSelectedOptions(props.selectedOptions || Array(questions.length).fill(''));
  }, [props.selectedOptions, questions.length]);
  useEffect(() => {
  calculateScore();
}, [selectedOptions]);

  // Count the number of questions for each tag
  const tagCount = {};
  questions.forEach((question) => {
    question.tag.forEach((tag) => {
      if (tagCount[tag]) {
        tagCount[tag].count++;
      } else {
        tagCount[tag] = { count: 1, correct: 0, incorrect: 0, notAttended: 0 };
      }
    });
  });
  
  const calculateTagCounts = (selectedOptions) => {
    const counts = JSON.parse(JSON.stringify(tagCount)); // Deep copy
    questions.forEach((question, index) => {
      question.tag.forEach((tag) => {
        if (selectedOptions[index] === question.answer) {
          counts[tag].correct++;
        } else if (selectedOptions[index] === '') {
          counts[tag].notAttended++;
        } else {
          counts[tag].incorrect++;
        }
      });
    });
    return counts;
  };
  
  const columns = [
    { field: 'id', headerName: 'Sl. No.', width: 90 },
    { field: 'topic', headerName: 'Topic', width: 200 },
    { field: 'questionCount', headerName: 'Question Count', width: 150 },
    { field: 'correct', headerName: 'Correct', width: 150 },
    { field: 'incorrect', headerName: 'Incorrect', width: 150 },
    { field: 'notAttended', headerName: 'Not Attended', width: 150 },
  ];

const counts = calculateTagCounts(selectedOptions);

  const rows = Object.keys(counts).map((tag, index) => ({
    id: index + 1,
    topic: tag,
    questionCount: counts[tag].count,
    correct: counts[tag].correct,
    incorrect: counts[tag].incorrect,
    notAttended: counts[tag].notAttended,
  }));


  const theme = createTheme({
    palette: {
      mode: 'dark',
      background: {
        paper: '#080F1A',
      },
      text: {
        primary: '#ffffff',
      },
      primary: {
        main: '#1C253A',
      },
      secondary: {
        main: '#ffffff',
      },
      success: {
        main: '#0b6e3b', // green
        contrastText: '#ffffff',
      },
      error: {
        main: '#8b0000', // red
        contrastText: '#ffffff',
      },
    },
    typography: {
      fontFamily: ', Arial, sans-serif',
    },
    components: {
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: '1px solid #333',
            '& .MuiDataGrid-cell': {
              color: '#ffffff',
              borderBottom: '1px solid #333',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#1C253A',
              color: '#ffffff',
              borderBottom: '1px solid #333',
            },
            '& .MuiDataGrid-footerContainer': {
              backgroundColor: '#1C253A',
              color: '#ffffff',
              borderTop: '1px solid #333',
            },
          },
        },
      },
    },
  });

  useEffect(() => {
    if (timeLeft > 0 && !showScore) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setShowScore(true);
      calculateScore();
    }
  }, [timeLeft, showScore]);

  const handleOptionChange = (event) => {
    const newSelectedOptions = [...selectedOptions];
    newSelectedOptions[currentQuestion] = event.target.value;
    setSelectedOptions(newSelectedOptions);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      
    } else {
      setShowScore(true);
      calculateScore();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      
    }
  };

  const calculateScore = () => {
    let newScore = 0;
    const newCorrectAnswers = [...correctAnswers];
    const newIncorrectAnswers = [...incorrectAnswers];
    selectedOptions.forEach((option, index) => {
      if (option === questions[index].answer) {
        newScore += 1;
        newCorrectAnswers[index] = true;
      } else if (option) {
        newIncorrectAnswers[index] = true;
      }
    });
    setScore(newScore);
    setCorrectAnswers(newCorrectAnswers);
    setIncorrectAnswers(newIncorrectAnswers);
  };


//submitAndEnd Server Side
const submitAndEnd = async()=>{
  try {
    const url = '/api/test/submit';
    const data = { testID: ID };
    const response = await axios.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
       withCredentials: true, 
    });
  } catch(err){
    console.error(err);
  }
}


  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;
  };
  

  const handleQuestionClick = (index) => {
    setCurrentQuestion(index);
    
  };


  const correctCount = correctAnswers.filter(Boolean).length;
  const incorrectCount = incorrectAnswers.filter(Boolean).length;
  const unansweredCount = questions.length - correctCount - incorrectCount;

  const data = [
    { name: 'Correct', Score: correctCount, fill: theme.palette.success.main },
    { name: 'Incorrect', Score: incorrectCount, fill: theme.palette.error.main },
    { name: 'Unanswered', Score: unansweredCount, fill: '#808080' }, // gray for unanswered
  ];

  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'black',
            borderRadius: '4px',
            padding: '5px',
            boxShadow: 3,
            color: 'white'
          }}
        >
          <Typography variant="body2" color="textPrimary">
            {`${payload[0].name}: ${payload[0].value} (${((payload[0].value / questions.length) * 100).toFixed(2)}%)`}
          </Typography>
        </Box>
      );
    }
  
    return null;
  };
  
  // Debugging Custom Tooltip Component
  const CustomTooltip = ({ active, payload }) => {
    console.log('Tooltip Payload:', payload); // Debugging line

    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'black',
            borderRadius: '4px',
            padding: '5px',
            boxShadow: 3,
            color: 'black'
          }}
        >
          <Typography variant="body2" color="textPrimary">
            {`${payload[0].name}: ${payload[0].value} (${((payload[0].value / questions.length) * 100).toFixed(2)}%)`}
          </Typography>
        </Box>
      );
    }

    return null;
  };

   // Get tags for the current question
   const currentQuestionTags = questions[currentQuestion]?.tag || [];
   
   // Extract unique tags from questions
  const uniqueTags = Array.from(new Set(questions.flatMap(question => question.tag)));
 

  //------------------------Modals---------------------------------------//
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleConfirm = () => {
    // Handle the final submit action here
    setOpen(false);
    console.log('Final submit confirmed');
  };
  //----------------------------------------------------------------------//
 

    const [confettiPieces, setConfettiPieces] = useState(0);
    useEffect(() => {
      if (showScore != confettiNeeded) {
        setConfettiPieces(200); // Start with 200 pieces
        setTimeout(() => {
          setConfettiPieces(0); // Stop generating new confetti pieces after 3 seconds
        }, 3000);
      }
    }, [showScore]);

    

    const navigate = useNavigate();


  return (
    <>
    <ThemeProvider theme={theme}>

      <CssBaseline />
      <div className="mainBox" >
        <div className="leftBox">

        <div className="leftTop">
         <div class='jaro' style={{color:'#bfbfbf'}}>ABYUDAY</div>
       <center>  <div style={{borderRadius:'0.4rem',display:'flex',justifyContent:'center',alignItems:'center',paddingTop:'0.05rem',fontSize:'0.5rem',width:'fit-content',background:'#bfbfbf',color:'black',paddingRight:'0.5rem',paddingLeft:'0.5rem'}}>A Generative-AI Examiner Platform</div> 
       </center>
      
         </div>

        <div className="leftMid">
        <Box display="flex" justifyContent="center" sx={{ mt: 0, mr: 2.3, ml: 2.3 }}>
  <Box sx={{ overflowX: 'auto', whiteSpace: 'nowrap', maxWidth: '100%' }}>
    <Grid
      container
      spacing={2}
      justifyContent="center"
      sx={{ 
        transform: `translateX(-${scrollPos}px)`, 
        transition: 'transform 0.3s',
        // Ensures that the container width is set to accommodate exactly 4 boxes
        maxWidth: `calc(4 * 10rem + 6rem)`,  // 4 * boxWidth + 3 * spacing
      }}
    >
      {questions.map((_, index) => (
        <Grid item key={index} xs={3} sm={3} md={3} lg={3}>
          <Button
            variant="contained"
            color={showScore ? (correctAnswers[index] ? 'success' : incorrectAnswers[index] ? 'error' : 'primary') : (currentQuestion === index ? 'secondary' : 'primary')}
            onClick={() => handleQuestionClick(index)}
            sx={{
              minWidth: currentQuestion === index ? '3rem' : '3rem', // Increase width slightly for the selected box
              minHeight: '3rem',
              width: currentQuestion === index ? 'calc(100%)' : '100%', // Make the selected box slightly larger
              backgroundColor: showScore
                ? correctAnswers[index]
                  ? theme.palette.success.main
                  : incorrectAnswers[index]
                  ? theme.palette.error.main
                  : '#1B222C'
                : currentQuestion === index
                ? '#ffffff'
                : '#1B222C',
              color: showScore
                ? '#ffffff'
                : currentQuestion === index
                ? '#000000'
                : '#ffffff',
              border: selectedOptions[index]
                ? '1px solid #7a7a7a'
                : showScore
                ? correctAnswers[index]
                  ? `2px solid ${theme.palette.success.main}`
                  : incorrectAnswers[index]
                  ? `2px solid ${theme.palette.error.main}`
                  : 'none'
                : 'none',
              '&:hover': {
                backgroundColor: showScore
                  ? correctAnswers[index]
                    ? theme.palette.success.main
                    : incorrectAnswers[index]
                    ? theme.palette.error.main
                    : '#2A3B5A'
                  : currentQuestion === index
                  ? '#ffffff'
                  : '#2A3B5A',
                color: showScore ? '#ffffff' : currentQuestion === index ? '#000000' : '#ffffff',
              },
            }}
          >
            {index + 1}
          </Button>
        </Grid>
      ))}
    </Grid>
  </Box>
</Box>

          </div>

<div className="leftBottom">
<UserBox
  onClick={()=>{navigate('/dashboard');}}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = '#bfbfbf';
    e.currentTarget.style.color = 'black';
    e.currentTarget.children[0].style.display = 'none'; // Hide the account icon
    e.currentTarget.children[1].style.display = 'none'; // Hide the username text
    e.currentTarget.children[2].style.display = 'flex'; // Show the logout icon and text
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.color = '#bfbfbf';
    e.currentTarget.children[0].style.display = 'block'; // Show the account icon
    e.currentTarget.children[1].style.display = 'block'; // Show the username text
    e.currentTarget.children[2].style.display = 'none'; // Hide the logout icon and text
  }}
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    
    padding: '8px 16px',
    transition: 'all 0.3s ease',
    color: '#bfbfbf',
  }}
>
  <AccountCircleIcon fontSize="large" sx={{ color: 'white', fontSize: '28px' }} />
  <UsernameText>{username || 'User'}</UsernameText>
  <Box sx={{ display: 'none', alignItems: 'center' }}> {/* Hidden initially */}
    <SpaceDashboardIcon sx={{ fontSize: '28px', marginRight: '8px' }} />
    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
      Dashboard
    </Typography>
  </Box>
</UserBox>
</div>

        </div>

        
        <div className="quizBox">
  {(showScore==null)?(<div style={{width:'100%',height:'100vh',display:'flex',justifyContent:'center',alignItems:'center'}}> 
<l-line-spinner
  size="50"
  stroke="3"
  speed="1"
  color="white" 
></l-line-spinner>
  </div>):('')} 

          <Container component={Paper} elevation={3} sx={{ p: 4, mt: 4, background: 'transparent',boxShadow:'none'}}>
            <div style={{display:'flex',flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
           
              {(showScore==true)? (
            <></>

              ):(showScore==false)?(
                <div>           
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
  
  <button style={{ minWidth: '5rem', marginRight: '0.2rem', marginLeft: '0.3rem', borderRadius:'3rem',paddingLeft:'0.8rem',paddingRight:'0.8rem' ,backgroundColor:'white', color:'black'}}>Question Tags</button>
    {currentQuestionTags.map((tag, index) => (
      <Chip key={index} label={tag} sx={{ minWidth: '5rem', marginRight: '0.2rem', marginLeft: '0.3rem',marginTop:'0.2rem',}} />
    ))}
  </Box>
</div>
              ):('')}
               {(showScore==true)? (<></>):(showScore==false)?(
                <Box
      display="flex"
      justifyContent="flex-end"
      alignItems="center"
      sx={{
        
        minWidth:'8.79rem',
        mt: -2,
        p: 1,
        borderRadius: 2,
        backgroundColor: 'white',
        boxShadow: 1,  // Assuming the default shadow for slight elevation
      }}
    >
      <IconButton
      sx={{padding:'0px'}}
      >
        <Timer style={{ color: 'black'}} />
      </IconButton>
      <Typography
        variant="h6"
        component="span"
        sx={{ ml: 1, color: 'black', fontWeight: 'bold' }}
      >
        {formatTime(timeLeft)}
      </Typography>
    </Box>
               ):('')}
               

            </div>
            {(showScore==true) ? (
              <Box sx={{ mt: '0' }}>
                
                <div style={{ marginBottom: '1rem' }}>
  <Accordion
    style={{
      backgroundColor: 'transparent',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
      borderRadius: '0.5rem',
      border: '1px solid #4B4E55',
      overflow: 'hidden',
    }}
    sx={{
      '&:before': {
        display: 'none', // Remove the default border line
      },
    }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon style={{ color: '#5381ED' }} />} 
      aria-controls="panel1a-content"
      id="panel1a-header"
      style={{
        padding: '0 1rem',
        minHeight: '3rem', 
        alignItems: 'center',
      }}
    >
      <button
        style={{
          minWidth: '8rem',
          fontSize: '1rem', 
          fontWeight: '500', 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: '0.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          color: '#5381ED',
          border: '1px solid #5381ED',
          cursor: 'pointer',
          transition: 'background-color 0.3s',
          height: '2.5rem',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 200, 200, 0.3)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
        onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(180, 180, 180, 0.3)'}
        onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 200, 200, 0.3)'}
      >
      <GppGoodIcon sx={{marginRight:'0.5rem'}}/>  Test on Computer Fundamentals
      </button>
    </AccordionSummary>
    <AccordionDetails style={{ paddingBottom: '1.9rem', borderTop: '1px solid #4B4E55' }}>
      <Container>
      <Paper
        style={{
          height: 380,
          width: '100%',
          marginTop: '1em',
          backgroundColor: 'transparent', // transparent background
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)', // drop shadow
          
        }}
      >
      <DataGrid
       rows={Trows}
          columns={Tcolumns}
          pageSize={5}
          disableSelectionOnClick
          disableRowSelectionOnClick
          hideFooter={true} // hide the footer row

          sx={{
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #333',
              backgroundColor: 'transparent', // transparent background
              color: '#ffffff',
            },
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: '1px solid #333',
              backgroundColor: 'transparent', // transparent background
              color: '#ffffff',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid #333',
              backgroundColor: '#121212', // transparent background
              color: '#ffffff',
            },
          }}
      />
   </Paper>
      </Container>
    </AccordionDetails>
  </Accordion>
</div>


                <Box sx={{ mb: '0' ,justifyContent:'flex-start', alignItems:'flex-start',display:'flex',flexDirection:'row'}}>
                <StyledCard sx={{width:'48.5%'}}>  
      <CardContent >
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
          Results  <CelebrationIcon fontSize="large"/> 
        </Typography>
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mt: 1 }}>
         Score :  {((score/questions.length)*100).toFixed(2)}%
        </Typography>
        
       
      </CardContent>
    </StyledCard>

    <StyledCard sx={{width:'48.5%'}}>  
      <CardContent >
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
          Comparative Analysis  <InsightsIcon fontSize="large" sx={{ml:'rem'}}/> 
        </Typography>
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mt: 1 }}>
         Rank : #1/28
        </Typography>
        
       
      </CardContent>
    </StyledCard>
    </Box>

    <Box sx={{ mb: 3 ,justifyContent:'flex-start', alignItems:'flex-start',display:'flex',flexDirection:'row'}}>
    <StyledCard
  sx={{
    width: '32%',
    backgroundColor: 'rgba(0, 150, 0, 0.1)', // Light green tint for correct answer feedback
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    margin: '16px auto',
    marginBottom:'0px',
    border: '1px solid rgba(0, 255, 0, 0.3)',
    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
      backgroundColor: 'rgba(0, 150, 0, 0.15)',
    },
  }}
>
  <CardContent
    sx={{
      padding: '16px',
      textAlign: 'center',
    }}
  >
    <Typography
      variant="h5"
      component="div"
      sx={{
        fontWeight: 'bold',
        color: '#0f0', // Bright green color to emphasize the correctness
      }}
    >
      Correct <CheckIcon fontSize="medium" />
    </Typography>
    <Typography
      variant="h3"
      component="div"
      sx={{
        fontWeight: 'bold',
        marginTop: '8px',
        color: '#0f0', // Keeping the same color for consistency
      }}
    >
      {correctCount}
    </Typography>
  </CardContent>
</StyledCard>

<StyledCard
  sx={{
    width: '32%',
    boxShadow: 'none',
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Light red tint for incorrect answer feedback
    borderRadius: '12px',
    margin: '16px auto',
    marginBottom:'0px',
    border: '1px solid rgba(255, 0, 0, 0.3)', // Red border to emphasize incorrectness
    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)', // Slightly scales the card on hover
      boxShadow: '0 8px 16px rgba(255, 0, 0, 0.2)', // Enhanced shadow with a red tint
      backgroundColor: 'rgba(255, 0, 0, 0.15)'
    },
  }}
>  
  <CardContent
    sx={{
      padding: '16px',
      textAlign: 'center',
    }}
  >
    <Typography
      variant="h5"
      component="div"
      sx={{
        fontWeight: 'bold',
        color: '#f00', // Bright red color to highlight incorrectness
      }}
    >
      Incorrect  <ClearIcon fontSize="medium" />
    </Typography>
    <Typography
      variant="h3"
      component="div"
      sx={{
        fontWeight: 'bold',
        marginTop: '8px',
        color: '#f00', // Keeping the same color for consistency
      }}
    >
      {incorrectCount}
    </Typography>
  </CardContent>
</StyledCard>

<StyledCard
  sx={{
    width: '32%',
    backgroundColor: 'rgba(0, 120, 255, 0.1)', // Light blue tint for unanswered feedback
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    margin: '16px auto',
    marginBottom:'0px',
    border: '1px solid rgba(0, 120, 255, 0.3)', // Blue border to emphasize unanswered
    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)', // Lift the card on hover
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)', // Enhanced shadow on hover
      backgroundColor: 'rgba(0, 120, 255, 0.15)', // Slightly darker blue on hover
    },
  }}
>
  <CardContent
    sx={{
      padding: '16px',
      textAlign: 'center',
    }}
  >
    <Typography
      variant="h5"
      component="div"
      sx={{
        fontWeight: 'bold',
        color: '#007AFF', // Bright blue color to highlight the theme
      }}
    >
      Unanswered <DoNotDisturbIcon fontSize="medium" />
    </Typography>
    <Typography
      variant="h3"
      component="div"
      sx={{
        fontWeight: 'bold',
        marginTop: '8px',
        color: '#007AFF', // Consistent bright blue for the score
      }}
    >
      {unansweredCount}
    </Typography>
  </CardContent>
</StyledCard>


</Box>
            {showScore? (
              
              <Accordion
  style={{
   
    backgroundColor: 'transparent',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)', // drop shadow
    borderRadius: '0.5rem', // optional: add border radius for a smoother look
    border:'1px solid #4B4E55',
  }}
  sx={{
    '&:before': {
      display: 'none', // remove the default border line
    },
  }}
>
  <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    aria-controls="panel1a-content"
    id="panel1a-header"
  >
    <button
      style={{
        minWidth: '9rem',
        fontSize: '1.1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '0.6rem',
        padding: '0.2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // light transparent white
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.3s',
        height: '3rem',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 200, 200, 0.4)'} // hover color
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'} // default color
      onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(180, 180, 180, 0.4)'} // active color
      onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 200, 200, 0.4)'} // hover color after click
    >
      Question Tags
    </button>
  </AccordionSummary>
  <AccordionDetails style={{ paddingBottom: '1.9rem', borderTop: '1px solid #4B4E55' }}>
    <Typography variant="subtitle1" sx={{ mb: 2 }}>
      {/* Additional content can go here if needed */}
    </Typography>
    <Container>
      <Paper
        style={{
          height: 400,
          width: '100%',
          marginTop: '1em',
          backgroundColor: 'transparent', // transparent background
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)', // drop shadow
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={5}
          disableSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #333',
              backgroundColor: 'transparent', // transparent background
              color: '#ffffff',
            },
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: '1px solid #333',
              backgroundColor: 'transparent', // transparent background
              color: '#ffffff',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid #333',
              backgroundColor: '#121212', // transparent background
              color: '#ffffff',
            },
          }}
        />
      </Paper>
    </Container>
  </AccordionDetails>
</Accordion>


              ):(
                <></>
              )}


            <Box sx={{ mt: 1 }}>
            <Accordion
  style={{
   
    backgroundColor: 'transparent',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)', // drop shadow
    borderRadius: '0.5rem', // optional: add border radius for a smoother look
    border:'1px solid #4B4E55',
  }}
  sx={{
    '&:before': {
      display: 'none', // remove the default border line
    },
  }}
>
  <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    aria-controls="panel1a-content"
    id="panel1a-header"
  >
    <button
      style={{
        minWidth: '9rem',
        fontSize: '1.1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '0.6rem',
        padding: '0.2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // light transparent white
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.3s',
        height: '3rem',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 200, 200, 0.4)'} // hover color
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'} // default color
      onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(180, 180, 180, 0.4)'} // active color
      onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 200, 200, 0.4)'} // hover color after click
    >
      Analysis
    </button>
  </AccordionSummary>
  <AccordionDetails style={{ paddingBottom: '1.9rem', borderTop: '1px solid #4B4E55' }}>
    <Typography variant="subtitle1" sx={{ mb: 2 }}>
      {/* Additional content can go here if needed */}
    </Typography>
    <Container>
      
    <div className="charts" style={{display:'flex',flexDirection:'row',justifyContent:'space-evenly',alignItems:'center'}}> 
            <BarChart width={600} height={360} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip content={<CustomBarTooltip />} />
  <Legend />
  <Bar dataKey="Score" fill="#8884d8" />
</BarChart>

                  <PieChart width={400} height={360}>
                    <Pie data={data} dataKey="Score" nameKey="name" cx="50%" cy="50%" outerRadius={150} fill="#8884d8" label>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                  </div>
      
    </Container>
  </AccordionDetails>
</Accordion>
</Box>
<Box sx={{ mt: 1 }}>
                  <div>
                  <Accordion
  sx={{
    boxShadow: theme.shadows[3],
    borderRadius: '8px !important',
    border:'1px solid #4B4E55',
    overflow: 'hidden',
    marginBottom: '1rem',
    backgroundColor: 'transparent', // transparent background
    '&:before': {
      display: 'none', // remove the default border line
    },
  }}
>
  <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    aria-controls="panel2a-content"
    id="panel2a-header"
    sx={{ backgroundColor: '', color: theme.palette.primary.contrastText }}
  >
    <button
      style={{
        minWidth: '9rem',
        fontSize: '1.1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '0.6rem',
        padding: '0.2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // light transparent white
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.3s',
        height: '3rem',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 200, 200, 0.4)'} // hover color
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'} // default color
      onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(180, 180, 180, 0.4)'} // active color
      onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 200, 200, 0.4)'} // hover color after click
    >
      Solutions
    </button>
  </AccordionSummary>
  <AccordionDetails style={{ paddingBottom: '1.9rem', borderTop: '1px solid #4B4E55' }}>
    {questions.map((q, index) => (
      <Accordion
        key={index}
        sx={{
          marginBottom: '1rem',
          boxShadow: theme.shadows[1],
          borderRadius: '8px',
          backgroundColor: 'transparent', // transparent background
          
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls={`panel${index + 1}-content`}
          id={`panel${index + 1}-header`}
          sx={{
            backgroundColor: theme.palette.background.default,
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              backgroundColor: '#fff',
              color: '#000',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              marginRight: '1rem',
              minWidth: '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {index + 1}
          </Box>
          <Typography
            sx={{ textAlign: 'left', fontWeight: 400, fontSize: '1rem' }}
          >
            {q.questionText}
          </Typography>
        </AccordionSummary>
        <AccordionDetails style={{ paddingBottom: '1.9rem', borderTop: '1px solid #4B4E55' }}>
          <Box>
            {q.options.map((option, idx) => (
              <Paper
                key={idx}
                elevation={3}
                sx={{
                  p: 2,
                  mb: 1,
                  backgroundColor:
                    selectedOptions[index] === option
                      ? option === q.answer
                        ? '#4caf50' // Green for correct answer
                        : '#8B0000' // Red for incorrect answer
                      : option === q.answer
                      ? '#0B6E3B' // Light green for correct answer
                      : 'transparent', // transparent background
                  color:
                    selectedOptions[index] === option ? '#ffffff' : 'inherit',
                  borderColor:
                    option === q.answer
                      ? '#4caf50'
                      : selectedOptions[index] === option
                      ? '#f44336'
                      : 'rgba(255, 255, 255, 0.23)',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderRadius: '8px',
                  transition:
                    'background-color 0.3s, border-color 0.3s, color 0.3s',
                }}
              >
                <FormControlLabel
                  control={<Radio checked={selectedOptions[index] === option} />}
                  label={option}
                  sx={{ width: '100%' }}
                />
              </Paper>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    ))}
  </AccordionDetails>
</Accordion>

    </div>
            </Box>
          </Box>
            ) : (showScore==false)?(
              <>
              <div style={{ userSelect: 'none' }}>
  <Typography variant="h6" component="h2" sx={{ mt: 4 }}>
    {currentQuestion + 1}) {questions[currentQuestion].questionText}
  </Typography>
  <Grid container spacing={2} sx={{ mt: 3 }}>
    {questions[currentQuestion].options.map((option, index) => (
      <Grid item xs={12} sm={6} key={index}>
        <Paper
          elevation={3}
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            backgroundColor: selectedOptions[currentQuestion] === option ? '#ffffff' : 'inherit',
            color: selectedOptions[currentQuestion] === option ? '#000000' : 'inherit',
            borderColor: selectedOptions[currentQuestion] === option ? '#ffffff' : 'rgba(255, 255, 255, 0.23)',
            borderWidth: '2px',
            borderStyle: 'solid',
            transition: 'background-color 0.3s, border-color 0.3s, color 0.3s',
          }}
        >
          <FormControlLabel
            control={<Radio checked={selectedOptions[currentQuestion] === option} onChange={handleOptionChange} value={option} />}
            label={option}
            sx={{ width: '100%', textAlign: 'center' }}
          />
        </Paper>
      </Grid>
    ))}
  </Grid>
  
  </div>
</>

            ):('')}
          </Container>

{((showScore==true)?(<></>):(showScore==false)?(
  <Container component={Paper} elevation={3} sx={{ p: 2, mt: 5, backdropFilter: 'blur(10px)',border:'1px solid #4B4E55', bgcolor: 'transparent',marginTop: 'auto',marginBottom:'1.5rem',borderRadius:'8rem'}}>
  <Box display="flex" justifyContent="space-between" sx={{ mt: 0 }}>
    <div>
<Button
variant="contained"
color="primary"
onClick={handlePreviousQuestion}
disabled={currentQuestion === 0}
sx={{
  borderRadius:'4rem',
  marginRight:'1rem',
fontWeight: '700',
height: '3.5em',
width: '7rem',
backgroundColor: currentQuestion === 0 ? '#1C253A' : '#ffffff',
color: currentQuestion === 0 ? '#ffffff' : '#000000',
'&:hover': {
  backgroundColor: currentQuestion === 0 ? '#2A3B5A' : '#ffffff',
  color: currentQuestion === 0 ? '#ffffff' : '#000000',
},
}}
>
Previous
</Button>

  <Button
variant="contained"
color="primary"
onClick={handleNextQuestion}
disabled={!(currentQuestion < questions.length - 1)}
sx={{
  borderRadius:'4rem',
fontWeight: '700',
height: '3.5em',
width: '7rem',
backgroundColor: !selectedOptions[currentQuestion] ? '#1C253A' : '#ffffff',
color: !selectedOptions[currentQuestion] ? '#ffffff' : '#000000',
'&:hover': {
  backgroundColor: !selectedOptions[currentQuestion] ? '#2A3B5A' : '#ffffff',
  color: !selectedOptions[currentQuestion] ? '#ffffff' : '#000000',
},
}}
>
Next
</Button>



</div>
<Button
variant="contained"
color="primary"

onClick={handleOpen}
sx={{
  borderRadius:'4rem',
fontWeight: '700',
height: '3.5em',
width: '7rem',
backgroundColor:  '#ffffff',
color:  '#000000',
'&:hover': {
  backgroundColor:  '#ffffff',
  color:  '#000000',
},
}}
>
Submit
</Button>

</Box>
</Container>

):('')) }
          
        </div>
      </div>


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
          <Box sx={style}>
            <Typography id="transition-modal-title" variant="h6" component="h2" color="textPrimary" gutterBottom>
              Confirm Final Submit
            </Typography>
            <Typography id="transition-modal-description" color="textSecondary" sx={{ mt: 2 }}>
              Are you sure you want to submit the final answers?
            </Typography>
            <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={handleClose}
                sx={{
                  height:'3rem',
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
                onClick={()=>{
                  localStorage.removeItem('currentQuestion');
                  handleConfirm();
                  setShowScore(true);
                  calculateScore();
                  submitAndEnd();
                }}
                sx={{
                  fontWeight:'600',
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
    <div style={{zIndex:'1000000'}}>
    <Confetti numberOfPieces={confettiPieces}  />  
    </div>
    
    </>
  );
};

export default Quizpage;
