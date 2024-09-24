import React, { useEffect, useState } from "react";
import { useLocation } from 'react-router-dom';
import styled from "styled-components";

import { lineSpinner } from 'ldrs'
lineSpinner.register()

import { SearchOff, ErrorOutline } from '@mui/icons-material';
import TestModal from '../components/TestInstructionModal';
import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableRow, Paper } from '@mui/material';
import './AttemptTest.css';
import axios from "axios";
import testImg from "../assets/testImg.png";
const StyledCard = styled(Card)({
    width: '70vw',
    height: '100%',
    borderRadius: '16px',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    color: 'white',
    padding: '16px',
    margin: '0 auto',
    border: '1px solid #4B4E55',
    transition: 'transform 0.3s ease-in-out',
});

const StyledTableContainer = styled(TableContainer)({
  width:'40vw',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Transparent background with light tint
    color: '#FFFFFF', // Light text
    borderRadius: '8px',
    padding: '16px',
});

const StyledTableCell = styled(TableCell)({
    color: '#FFFFFF',
    borderBottom: '1px solid #4B4E55',
 
});

const StyledTableRow = styled(TableRow)({
    backgroundColor: 'transparent',
});

const AttemptTest = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const ID = queryParams.get('TestID');
    
    const [testLoading, setTestLoading] = useState("pre");
    const [testID, setTestID] = useState('');
    const [testDetails, setTestDetails] = useState({
        name: '',
        id: '',
        createdBy: '',
        noOfQuestions: '',
        testTime: '',
        difficulty: ''
    });

    useEffect(() => {
        if (ID) {
            setTestID(ID);
            handleSearch(ID);
        }
    }, []);



    const handleSearch = async (ID) => {
        try { 
          setTestLoading("loading");
            const response = await axios.post("/api/test/getinfo", { testID: ID }, {
                headers: {
                    'Content-Type': 'application/json',
                    withCredentials: true
                }
            });
            setTestDetails(response.data); // Update the state with API data
            setTestLoading("done");
        } catch (err) {
          setTestLoading("error");
            console.error(err);
        }
    }

    return (
        <StyledWrapper>
            <>
                <div className="searchBox">
                    <StyledCard>
                        <div className="searchBoxTop">
                            <CardContent>
                                <div className="grid" />
                                <div id="poda">
                                    <div className="glow" />
                                    <div className="darkBorderBg" />
                                    <div className="darkBorderBg" />
                                    <div className="darkBorderBg" />
                                    <div className="white" />
                                    
                                    <div id="main">
                                        <input
                                            placeholder="Enter Test ID"
                                            type="text"
                                            name="text"
                                            className="input"
                                            value={testID}
                                            onChange={(e) => setTestID(e.target.value)}
                                            autoComplete="off"
                                            maxLength={6}
                                            style={{}}
                                        />
                                        <div id="pink-mask" />
                                        <div className="filterBorder" />
                                        <div id="filter-icon" style={{ cursor: 'pointer' }} onClick={()=>handleSearch(testID)}>
                                            <svg
                                                preserveAspectRatio="none"
                                                height="27"
                                                width="27"
                                                viewBox="4.8 4.56 14.832 15.408"
                                                fill="none"
                                            >
                                                <path
                                                    d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z"
                                                    stroke="#d6d6e6"
                                                    strokeWidth={1}
                                                    strokeMiterlimit={10}
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </div>
                                        <div id="search-icon" style={{ cursor: 'pointer' }} onClick={()=>handleSearch(testID)}>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="24"
                                                viewBox="0 0 24 24"
                                                strokeWidth={2}
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                                height="24"
                                                fill="none"
                                                className="feather feather-search"
                                            >
                                                <circle stroke="url(#search)" r="8" cy="11" cx="11" />
                                                <line
                                                    stroke="url(#searchl)"
                                                    y2="16.65"
                                                    y1="22"
                                                    x2="16.65"
                                                    x1="22"
                                                />
                                                <defs>
                                                    <linearGradient gradientTransform="rotate(50)" id="search">
                                                        <stop stopColor="#f8e7f8" offset="0%" />
                                                        <stop stopColor="#b6a9b7" offset="50%" />
                                                    </linearGradient>
                                                    <linearGradient id="searchl">
                                                        <stop stopColor="#b6a9b7" offset="0%" />
                                                        <stop stopColor="#837484" offset="50%" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </div>

 {(testLoading === "pre") && (<> 
  <>
    <div className="searchBoxMid" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img 
  src={testImg} 
  style={{ 
    width: '10vw', 
    opacity: 0.5, 
    position: 'absolute', 
    transform: 'translate(0, -3rem)' 
  }} 
  alt="Test" 
/>
   </div>
    <div className="searchBoxBottom"></div>
  </>
 </>)}
 {(testLoading === "loading") && (<> 
  <>
    <div className="searchBoxMid" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <l-line-spinner
  size="50"
  stroke="3"
  speed="1"
  color="white" 
></l-line-spinner>
    </div>
    <div className="searchBoxBottom"></div>
  </>
 </>)}  
 {(testLoading === "done") && (<> 
  <>
    <div className="searchBoxMid">
      <StyledTableContainer component={Paper}>
        <Table>
          <TableBody>
            <StyledTableRow>
              <StyledTableCell><b>Test Name</b></StyledTableCell>
              <StyledTableCell>{testDetails.name}</StyledTableCell>
            </StyledTableRow>
            <StyledTableRow>
              <StyledTableCell><b>Test ID</b></StyledTableCell>
              <StyledTableCell>{testDetails.id}</StyledTableCell>
            </StyledTableRow>
            <StyledTableRow>
              <StyledTableCell><b>Created By</b></StyledTableCell>
              <StyledTableCell>{testDetails.createdBy}</StyledTableCell>
            </StyledTableRow>
            <StyledTableRow>
              <StyledTableCell><b>No. of Questions</b></StyledTableCell>
              <StyledTableCell>{testDetails.noOfQuestions}</StyledTableCell>
            </StyledTableRow>
            <StyledTableRow>
              <StyledTableCell><b>Test Time</b></StyledTableCell>
              <StyledTableCell>{testDetails.testTime}</StyledTableCell>
            </StyledTableRow>
            <StyledTableRow>
              <StyledTableCell><b>Difficulty</b></StyledTableCell>
              <StyledTableCell>{testDetails.difficulty}</StyledTableCell>
            </StyledTableRow>
          </TableBody>
        </Table>
      </StyledTableContainer>
    </div>
    <div className="searchBoxBottom">

      <TestModal testID={testID}/>
     


    </div>
  </>
 </>)}  
 {(testLoading === "error") && (<> 

  <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop:'3rem'}}>
          <ErrorOutline sx={{ fontSize: 120, color: 'red', opacity:'0.7'}} />
          <SearchOff sx={{ fontSize: 120, color: 'red', ml: -2 ,opacity:'0.7'}} />
        </Box>
   <center><span style={{opacity:'0.6'}}>Test Not Found</span></center>  
 </>)}                    
                    </StyledCard>
                </div>
            </>
        </StyledWrapper>
    );
};










const StyledWrapper = styled.div`
 .button {

  position: relative;
  transition: all 0.3s ease-in-out;
  box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.2);
  padding-block: 0.5rem;
  padding-inline: 1.25rem;
  background-color: #000000;
  border-radius: 8px; /* Reduced border radius */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #f0f0f0;
  gap: 10px;
  font-weight: bold;
  border: 3px solid #2a2a2a;
  outline: none;
  overflow: hidden;
  font-size: 15px;
}

.icon {
  width: 24px;
  height: 24px;
  transition: all 0.3s ease-in-out;
}

.button:hover {
  transform: scale(1.05);
  border-color: #444;
}

.button:hover .icon {
  transform: translate(4px);
}

.button:hover::before {
  animation: shine 1.5s ease-out infinite;
}

.button::before {
  content: "";
  position: absolute;
  width: 100px;
  height: 100%;
  background-image: linear-gradient(
    120deg,
    rgba(255, 255, 255, 1) 30%,
    rgba(255, 255, 255, 0.8),
    rgba(255, 255, 255, 1) 70%
  );
  top: 0;
  left: -100px;
  opacity: 0.3;
}

@keyframes shine {
  0% {
    left: -100px;
  }

  60% {
    left: 100%;
  }

  to {
    left: 100%;
  }
}

  .grid {
  height: 1px;
  width: 1px;
  background-image: linear-gradient(to right, #0f0f10 1px, transparent 1px),
    linear-gradient(to bottom, #0f0f10 1px, transparent 1px);
  background-size: 1rem 1rem;
  background-position: center center;
  position: absolute;
  z-index: -1;
  filter: blur(1px);
}
.white,
.border,
.darkBorderBg,
.glow {
  max-height: 70px;
  max-width: 314px;
  height: 100%;
  width: 100%;
  position: absolute;
  overflow: hidden;
  z-index: -1;
  /* Border Radius */
  border-radius: 12px;
  filter: blur(3px);
}
.input {
  background-color: #010201;
  border: none;
  /* padding:7px; */
  width: 301px;
  height: 56px;
  border-radius: 10px;
  color: white;
  padding-inline: 59px;
  font-size: 18px;
}
#poda {
  display: flex;
  align-items: center;
  justify-content: center;
}
.input::placeholder {
  color: #c0b9c0;
}

.input:focus {
  outline: none;
}

#main:focus-within > #input-mask {
  display: none;
}

#input-mask {
  pointer-events: none;
  width: 100px;
  height: 20px;
  position: absolute;
  background: linear-gradient(90deg, transparent, black);
  top: 18px;
  left: 70px;
}
#pink-mask {
  pointer-events: none;
  width: 30px;
  height: 20px;
  position: absolute;
  background: #cf30aa;
  top: 10px;
  left: 5px;
  filter: blur(20px);
  opacity: 0.8;
  //animation:leftright 4s ease-in infinite;
  transition: all 2s;
}
#main:hover > #pink-mask {
  //animation: rotate 4s linear infinite;
  opacity: 0;
}

.white {
  max-height: 63px;
  max-width: 307px;
  border-radius: 10px;
  filter: blur(2px);
}

.white::before {
  content: "";
  z-index: -2;
  text-align: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(83deg);
  position: absolute;
  width: 600px;
  height: 600px;
  background-repeat: no-repeat;
  background-position: 0 0;
  filter: brightness(1.4);
  background-image: conic-gradient(
    rgba(0, 0, 0, 0) 0%,
    #a099d8,
    rgba(0, 0, 0, 0) 8%,
    rgba(0, 0, 0, 0) 50%,
    #dfa2da,
    rgba(0, 0, 0, 0) 58%
  );
  //  animation: rotate 4s linear infinite;
  transition: all 2s;
}
.border {
  max-height: 59px;
  max-width: 303px;
  border-radius: 11px;
  filter: blur(0.5px);
}
.border::before {
  content: "";
  z-index: -2;
  text-align: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(70deg);
  position: absolute;
  width: 600px;
  height: 600px;
  filter: brightness(1.3);
  background-repeat: no-repeat;
  background-position: 0 0;
  background-image: conic-gradient(
    #1c191c,
    #402fb5 5%,
    #1c191c 14%,
    #1c191c 50%,
    #cf30aa 60%,
    #1c191c 64%
  );
  // animation: rotate 4s 0.1s linear infinite;
  transition: all 2s;
}
.darkBorderBg {
  max-height: 65px;
  max-width: 312px;
}
.darkBorderBg::before {
  content: "";
  z-index: -2;
  text-align: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(82deg);
  position: absolute;
  width: 600px;
  height: 600px;
  background-repeat: no-repeat;
  background-position: 0 0;
  background-image: conic-gradient(
    rgba(0, 0, 0, 0),
    #18116a,
    rgba(0, 0, 0, 0) 10%,
    rgba(0, 0, 0, 0) 50%,
    #6e1b60,
    rgba(0, 0, 0, 0) 60%
  );
  transition: all 2s;
}
#poda:hover > .darkBorderBg::before {
  transform: translate(-50%, -50%) rotate(262deg);
}
#poda:hover > .glow::before {
  transform: translate(-50%, -50%) rotate(240deg);
}
#poda:hover > .white::before {
  transform: translate(-50%, -50%) rotate(263deg);
}
#poda:hover > .border::before {
  transform: translate(-50%, -50%) rotate(250deg);
}

#poda:hover > .darkBorderBg::before {
  transform: translate(-50%, -50%) rotate(-98deg);
}
#poda:hover > .glow::before {
  transform: translate(-50%, -50%) rotate(-120deg);
}
#poda:hover > .white::before {
  transform: translate(-50%, -50%) rotate(-97deg);
}
#poda:hover > .border::before {
  transform: translate(-50%, -50%) rotate(-110deg);
}

#poda:focus-within > .darkBorderBg::before {
  transform: translate(-50%, -50%) rotate(442deg);
  transition: all 4s;
}
#poda:focus-within > .glow::before {
  transform: translate(-50%, -50%) rotate(420deg);
  transition: all 4s;
}
#poda:focus-within > .white::before {
  transform: translate(-50%, -50%) rotate(443deg);
  transition: all 4s;
}
#poda:focus-within > .border::before {
  transform: translate(-50%, -50%) rotate(430deg);
  transition: all 4s;
}

.glow {
  overflow: hidden;
  filter: blur(30px);
  opacity: 0.4;
  max-height: 130px;
  max-width: 354px;
}
.glow:before {
  content: "";
  z-index: -2;
  text-align: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(60deg);
  position: absolute;
  width: 999px;
  height: 999px;
  background-repeat: no-repeat;
  background-position: 0 0;
  /*border color, change middle color*/
  background-image: conic-gradient(
    #000,
    #402fb5 5%,
    #000 38%,
    #000 50%,
    #cf30aa 60%,
    #000 87%
  );
  /* change speed here */
  //animation: rotate 4s 0.3s linear infinite;
  transition: all 2s;
}

@keyframes rotate {
  100% {
    transform: translate(-50%, -50%) rotate(450deg);
  }
}
@keyframes leftright {
  0% {
    transform: translate(0px, 0px);
    opacity: 1;
  }

  49% {
    transform: translate(250px, 0px);
    opacity: 0;
  }
  80% {
    transform: translate(-40px, 0px);
    opacity: 0;
  }

  100% {
    transform: translate(0px, 0px);
    opacity: 1;
  }
}

#filter-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  max-height: 40px;
  max-width: 38px;
  height: 100%;
  width: 100%;

  isolation: isolate;
  overflow: hidden;
  /* Border Radius */
  border-radius: 10px;
  background: linear-gradient(180deg, #161329, black, #1d1b4b);
  border: 1px solid transparent;
}
.filterBorder {
  height: 42px;
  width: 40px;
  position: absolute;
  overflow: hidden;
  top: 7px;
  right: 7px;
  border-radius: 10px;
}

.filterBorder::before {
  content: "";

  text-align: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(90deg);
  position: absolute;
  width: 600px;
  height: 600px;
  background-repeat: no-repeat;
  background-position: 0 0;
  filter: brightness(1.35);
  background-image: conic-gradient(
    rgba(0, 0, 0, 0),
    #3d3a4f,
    rgba(0, 0, 0, 0) 50%,
    rgba(0, 0, 0, 0) 50%,
    #3d3a4f,
    rgba(0, 0, 0, 0) 100%
  );
  animation: rotate 4s linear infinite;
}
#main {
  position: relative;
}
#search-icon {
  position: absolute;
  left: 20px;
  top: 15px;
}

`;

export default AttemptTest;
