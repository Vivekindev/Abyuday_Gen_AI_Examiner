import React, { useEffect, useState } from 'react';
import Quizpage from './Quizpage';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

import { infinity } from 'ldrs';
import { ripples } from 'ldrs';

ripples.register();
infinity.register();

const Dashboard = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const ID = queryParams.get('testID');

  const [isEnded, setIsEnded] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState(null);
  const [remTime, setRemTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false); // Error state

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const response = await axios.post(
          '/api/test/begin',
          { testID: ID },
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          }
        );

        if (response.data) {
          setIsEnded(response.data.isEnded);
          setQuestions(Array.isArray(response.data.testQuestions) ? response.data.testQuestions : []);
          setRemTime(response.data.remTime);
          setSelectedOptions(response.data.selectedOptions);
        }
      } catch (err) {
        console.error('Error fetching test data:', err);
        setError(true); // Set error state on failure
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
  }, [ID]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'black', width: '100%', height: '100vh', color: 'white' }}>
        <l-ripples size="140" speed="2" color="white"></l-ripples>
        <br />
        Fetching Test Data...
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'black', width: '100%', height: '100vh', color: 'white' }}>
        <l-infinity size="125" stroke="9" stroke-length="0.15" bg-opacity="0.1" speed="1.3" color="red"></l-infinity>
        <br /><br />
        <span style={{ opacity: '0.6' }}>Error Occurred or No Questions Available</span>
      </div>
    );
  }

  return (
    <Quizpage 
      questions={questions} 
      showResults={isEnded} 
      remTime={remTime} 
      testID={ID} 
      selectedOptions={selectedOptions} 
    />
  );
};

export default Dashboard;
