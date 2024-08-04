import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Typography, Button, Radio, FormControlLabel, Paper, Box, Grid, IconButton } from '@mui/material';
import { Timer } from '@mui/icons-material';
import './App.css';
const questions = [
  {
    "questionText": "What is React.js?",
    "options": ["A JavaScript library for building user interfaces.", "A server-side framework.", "A CSS preprocessor.", "A database management tool."],
    "answer": "A JavaScript library for building user interfaces."
  },
  {
    "questionText": "What is a component in React?",
    "options": ["A class or function that returns a React element.", "A piece of CSS code.", "A method for handling state.", "A way to manage HTTP requests."],
    "answer": "A class or function that returns a React element."
  },
  {
    "questionText": "How do you create a functional component in React?",
    "options": ["function MyComponent() { return <div>Hello</div>; }", "class MyComponent extends React.Component { render() { return <div>Hello</div>; } }", "const MyComponent = { return <div>Hello</div>; }", "const MyComponent = () => { return <div>Hello</div>; }"],
    "answer": "const MyComponent = () => { return <div>Hello</div>; }"
  },
  {
    "questionText": "What is JSX in React?",
    "options": ["A syntax extension that allows you to write HTML inside JavaScript.", "A JavaScript library for state management.", "A way to style components.", "A method for routing."],
    "answer": "A syntax extension that allows you to write HTML inside JavaScript."
  },
  {
    "questionText": "What is the purpose of `useState` in React?",
    "options": ["To manage the state in a functional component.", "To manage the lifecycle of a component.", "To handle side effects.", "To perform asynchronous operations."],
    "answer": "To manage the state in a functional component."
  },
  {
    "questionText": "How do you handle events in React?",
    "options": ["By using event handlers like `onClick`, `onChange`, etc.", "By using `window.addEventListener`.", "By using `document.querySelector`.", "By defining custom event objects."],
    "answer": "By using event handlers like `onClick`, `onChange`, etc."
  },
  {
    "questionText": "What is `useEffect` used for in React?",
    "options": ["To perform side effects in functional components.", "To manage component state.", "To handle user input.", "To manage routes."],
    "answer": "To perform side effects in functional components."
  },
  {
    "questionText": "How do you pass data from a parent component to a child component?",
    "options": ["By using props.", "By using state.", "By using context.", "By using refs."],
    "answer": "By using props."
  },
  {
    "questionText": "What is the virtual DOM in React?",
    "options": ["A lightweight copy of the actual DOM used for performance optimization.", "A tool for managing application state.", "A method for styling components.", "A way to handle user events."],
    "answer": "A lightweight copy of the actual DOM used for performance optimization."
  },
  {
    "questionText": "What is React's context API?",
    "options": ["A way to manage global state in a React application.", "A method for routing.", "A tool for handling HTTP requests.", "A way to manage local state."],
    "answer": "A way to manage global state in a React application."
  },
  

]

const App = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState(Array(questions.length).fill(''));
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [timeLeft, setTimeLeft] = useState(questions.length * 60);
  const [scrollPos, setScrollPos] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(Array(questions.length).fill(false));
  const [incorrectAnswers, setIncorrectAnswers] = useState(Array(questions.length).fill(false));

  const theme = createTheme({
    palette: {
      mode: 'dark',
      background: {
        default: '#04080E',
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
        main: '#4CAF50', // green
        contrastText: '#ffffff',
      },
      error: {
        main: '#F44336', // red
        contrastText: '#ffffff',
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
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleQuestionClick = (index) => {
    setCurrentQuestion(index);
  };

  const handleScrollLeft = () => {
    setScrollPos((prev) => Math.max(prev - 150, 0));
  };

  const handleScrollRight = () => {
    setScrollPos((prev) => prev + 150);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="mainBox">
      <div className="leftBox">

      <Box display="flex" justifyContent="center" sx={{ mt: 5 }}>
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
                        : '#151B26'
                      : currentQuestion === index
                      ? '#ffffff'
                      : '#151B26',
                    color: showScore
                      ? '#ffffff'
                      : currentQuestion === index
                      ? '#000000'
                      : '#ffffff',
                    border: selectedOptions[index]
                      ? '1px solid #E1D9D1'
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
      <div className="quizBox">
      <Container component={Paper} elevation={1} sx={{ p: 4, mt: 5, bgcolor: 'background.paper' }}>
      <Box display="flex" justifyContent="flex-end" alignItems="center" sx={{ mt: 2 }}>
  <IconButton>
    <Timer />
  </IconButton>
  <Typography variant="h6" component="span" sx={{ ml: 1 }}>
    {formatTime(timeLeft)}
  </Typography>
</Box>

        {showScore ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h4" gutterBottom>
              <strong>Results</strong>
            </Typography>
            <Typography variant="h5" gutterBottom>
              You scored <strong>{score}</strong> out of <strong>{questions.length}</strong>
            </Typography>
            <Box sx={{ mt: 4 }}>
            <BarChart width={600} height={300} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip content={<CustomBarTooltip />} />
  <Legend />
  <Bar dataKey="Score" fill="#8884d8" />
</BarChart>

                  <PieChart width={400} height={400}>
                    <Pie data={data} dataKey="Score" nameKey="name" cx="50%" cy="50%" outerRadius={150} fill="#8884d8" label>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
              {questions.map((q, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    <strong>{index + 1}. {q.questionText}</strong>
                  </Typography>
                  <Box>
                  {q.options.map((option, idx) => (
                      <Paper
                        key={idx}
                        elevation={3}
                        sx={{
                          p: 2,
                          mb: 1,
                          backgroundColor: selectedOptions[index] === option
                            ? option === q.answer
                              ? theme.palette.success.main
                              : theme.palette.error.main
                            : option === q.answer
                            ? theme.palette.success.main
                            : 'inherit',
                          color: selectedOptions[index] === option ? '#000000' : 'inherit',
                          borderColor: option === q.answer
                            ? theme.palette.success.main
                            : selectedOptions[index] === option
                            ? theme.palette.error.main
                            : 'rgba(255, 255, 255, 0.23)',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          transition: 'background-color 0.3s, border-color 0.3s, color 0.3s',
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
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <>
            <Typography variant="h5" component="h2" sx={{ mt: 4 }}>
              {currentQuestion + 1}. {questions[currentQuestion].questionText}
            </Typography>
            <Grid container spacing={2} sx={{ mt: 3 }}>
              {questions[currentQuestion].options.map((option, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 2,
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
                      sx={{ width: '100%' }}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Box display="flex" justifyContent="space-between" sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePreviousQuestion}
                disabled={currentQuestion === 0}
                sx={{
                  fontWeight: '700',
                  height: '5em',
                  width: '8rem',
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
                disabled={!selectedOptions[currentQuestion]}
                sx={{
                  fontWeight: '700',
                  height: '5em',
                  width: '8rem',
                  backgroundColor: !selectedOptions[currentQuestion] ? '#1C253A' : '#ffffff',
                  color: !selectedOptions[currentQuestion] ? '#ffffff' : '#000000',
                  '&:hover': {
                    backgroundColor: !selectedOptions[currentQuestion] ? '#2A3B5A' : '#ffffff',
                    color: !selectedOptions[currentQuestion] ? '#ffffff' : '#000000',
                  },
                }}
              >
                {currentQuestion < questions.length - 1 ? 'Next' : 'Submit'}
              </Button>
            </Box>
          </>
        )}
      </Container>
      

      </div>
      </div>
    </ThemeProvider>
  );
};

export default App;

