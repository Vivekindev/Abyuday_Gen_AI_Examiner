import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {  Modal, Backdrop, Fade, CssBaseline, Container, Typography, Button, Radio, FormControlLabel, Paper, Box, Grid, IconButton, Chip, useTheme, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow  } from '@mui/material';
import { Timer } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import './Quizpage.css';
import HomeIcon from '@mui/icons-material/Home';
import { styled } from '@mui/system';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DataGrid } from '@mui/x-data-grid';
import Confetti from 'react-confetti'

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
  borderRadius: 8,
  boxShadow: 24,
  p: 4,
  outline: 'none',
  backdropFilter: 'blur(10px)', // Blurred background
  background: 'rgba(0, 0, 0, 0.7)', // White overlay at 10% opacity
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
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState(Array(questions.length).fill(''));
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [timeLeft, setTimeLeft] = useState(questions.length * 60);
  const [scrollPos, setScrollPos] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(Array(questions.length).fill(false));
  const [incorrectAnswers, setIncorrectAnswers] = useState(Array(questions.length).fill(false));


  const initialSelectedOptions = Array(questions.length).fill('');

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
      if (showScore) {
        setConfettiPieces(200); // Start with 200 pieces
        setTimeout(() => {
          setConfettiPieces(0); // Stop generating new confetti pieces after 3 seconds
        }, 3000);
      }
    }, [showScore]);
  return (
    <>
    <ThemeProvider theme={theme}>
      <div className="overLayInputt">



      </div>


      <CssBaseline />
      <div className="mainBox">
        <div className="leftBox">

        <div className="leftTop">
         <div class='jaro'>ABYUDAY</div>
       <center>  <div style={{borderRadius:'0.4rem',display:'flex',justifyContent:'center',alignItems:'center',paddingTop:'0.05rem',fontSize:'0.5rem',width:'fit-content',background:'white',color:'black',paddingRight:'0.5rem',paddingLeft:'0.5rem'}}>A Generative-AI Examiner Platform</div> 
       </center>
      
         </div>


         <div className="leftMid">
         <Box display="flex" justifyContent="center" sx={{ mt: 0 }}>
            <Box sx={{ overflowX: 'auto', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              <Grid container spacing={2} justifyContent="center" sx={{ transform: `translateX(-${scrollPos}px)`, transition: 'transform 0.3s' }}>
                {questions.map((_, index) => (
                  <Grid item key={index}>
                    <Button
                      variant="contained"
                      color={showScore ? (correctAnswers[index] ? 'success' : incorrectAnswers[index] ? 'error' : 'primary') : (currentQuestion === index ? 'secondary' : 'primary')}
                      onClick={() => handleQuestionClick(index)}
                      sx={{
                        minWidth: '3rem',
                        minHeight: '3rem',
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
<MainMenuButton variant="contained" startIcon={<HomeIcon />}>
        Main Menu
      </MainMenuButton>
</div>

        </div>

        
        <div className="quizBox">
          <Container component={Paper} elevation={3} sx={{ p: 4, mt: 5, background: 'transparent',boxShadow:'none'}}>
            <div style={{display:'flex',flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
           
              {showScore? (
            <></>

              ):(
                <div>           
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
  
  <button style={{ minWidth: '5rem', marginRight: '0.2rem', marginLeft: '0.3rem', borderRadius:'3rem',paddingLeft:'0.8rem',paddingRight:'0.8rem' }}>Question Tags</button>
    {currentQuestionTags.map((tag, index) => (
      <Chip key={index} label={tag} sx={{ minWidth: '5rem', marginRight: '0.2rem', marginLeft: '0.3rem',marginTop:'0.2rem',}} />
    ))}
  </Box>
</div>
              )}
               {showScore? (<></>):(
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
               )}
               

            </div>
            {showScore ? (<Box sx={{ textAlign: 'center', mt: 0 }}>
            <div style={{
              fontFamily: "Emilys Candy",
              fontWeight: 800,
              fontSize:'2.5rem',
              fontStyle: 'normal',
              padding:'0.5rem',
     
             
              }}>
              
                RESULTS
              </div>
              
            
            <Typography variant="h5" gutterBottom>
              You scored <strong>{score}</strong> out of <strong>{questions.length}</strong>
            </Typography>
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
  <AccordionDetails>
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
            <Box sx={{ mt: 4 }}>

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
                  <br></br>
                  <br></br>
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
  <AccordionDetails>
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
        <AccordionDetails>
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
            ) : (
              <>
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
  
  
</>

            )}
          </Container>

{(showScore?(<></>):(
  <Container component={Paper} elevation={3} sx={{ p: 2, mt: 5, bgcolor: 'background.paper',marginTop: 'auto',marginBottom:'1.5rem',borderRadius:'8rem'}}>
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

)) }
          
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
                  handleConfirm();
                  setShowScore(true);
                  calculateScore();
                  
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
