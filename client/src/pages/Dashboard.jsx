import React, { useEffect, useState } from 'react';
import Quizpage from './Quizpage';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

import { infinity } from 'ldrs'
import { ripples } from 'ldrs'

ripples.register()
infinity.register()



const Dashboard = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const ID = queryParams.get('testID');
  const [isEnded, setIsEnded] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState(null);
  const [remTime, setRemTime] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const url = '/api/test/begin';
        const data = { testID: ID };
        const response = await axios.post(url, data, {
          headers: { 'Content-Type': 'application/json' },
           withCredentials: true, 
        });
        
        if (response) {
          setIsEnded(response.data.isEnded);
          setQuestions(response.data.testQuestions);
          setRemTime(response.data.remTime);
          setSelectedOptions(response.data.selectedOptions);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false); // Stop loading once the data is fetched
      }
    };

    fetchTestData();
  }, [ID]);

  if (loading) {
    return (
    <>
    <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',backgroundColor:'black',width:'100%',height:'100vh', color:'white'}}>
  <l-ripples size="140" speed="2" color="white" > </l-ripples> <br></br>  
    Fetching Test Data
    </div>
    </>
    )
  }

  return (
    <>
      {/* Pass questions and isEnded to Quizpage only when data is available */}
      {questions ? (
        <Quizpage questions={questions} showResults={isEnded} remTime={remTime} testID={ID} selectedOptions={selectedOptions}/>
      ) : (
        <>
        <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',backgroundColor:'black',width:'100%',height:'100vh', color:'white'}}>
       
    <l-infinity  size="125" stroke="9" stroke-length="0.15" bg-opacity="0.1" speed="1.3" color="red" ></l-infinity> <br></br><br></br>  
   <span style={{opacity:'0.6'}}> Error Occured</span>
    </div>
        </>
      )}
    </>
  );
};

export default Dashboard;
