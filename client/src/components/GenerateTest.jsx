import React from 'react'
import Modal from '../pages/modal'


import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { styled } from '@mui/material/styles';


import { Card, CardContent, Typography, List, ListItem, Button, SvgIcon } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';


const StyledCard = styled(Card)({
    width: 500,
    borderRadius: '16px',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    color: 'white',
    padding: '16px',
    margin: '0 auto',
    border:'1px solid #4B4E55',
    transition: 'transform 0.3s ease-in-out',
    '&:hover': {
      transform: 'scale(1.05)',
      backdropFilter: 'none',
      backgroundColor:'transparent'
    },
  });
  


const GenerateTest = () => {
  return (
    <>
        <div className="rightDashBottom">
        <Modal/>
      </div>

      <div className="rightDashTop">
      <StyledCard>
      <CardContent >
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
          Model
        </Typography>
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mt: 1 }}>
 Gemini 1.5 Flash        <AutoAwesomeIcon fontSize="large"/>
        </Typography>
        <Typography sx={{ mt: 2, mb: 1, color: 'rgba(156, 163, 175, 1)', minHeight:'9.4rem'}}>
        This LLM is a streamlined AI model prioritizing speed and efficiency. Built for high-volume tasks, it delivers accurate outputs rapidly. Ideal for time-sensitive applications, Flash offers a cost-effective solution without compromising on quality.
        </Typography>
        <List sx={{ mb: 3 }}>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Can generate upto 50 Questions per request</Typography>
          </ListItem>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Generation speed in fast</Typography>
          </ListItem>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Question quality is good</Typography>
          </ListItem>
        </List>
      </CardContent>
    </StyledCard>

    <StyledCard>
      <CardContent>
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
        Model
        </Typography>
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mt: 1 }}>
         Gemini 1.5 Pro  <AutoAwesomeIcon fontSize="large"/>
        </Typography>
        <Typography sx={{ mt: 2, mb: 1, color: 'rgba(156, 163, 175, 1)', minHeight:'9.4rem'}}>
        This LLM is a powerful AI model excelling in accuracy and complexity. Built on advanced architecture, it delivers precise, nuanced outputs. Ideal for demanding tasks, it leverages vast datasets and advanced techniques for superior performance.
        </Typography>

        <List sx={{ mb: 3 }}>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Can generate upto 30 Questions per request</Typography>
          </ListItem>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Generation speed in moderate</Typography>
          </ListItem>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Question quality is best</Typography>
          </ListItem>
        </List>
       
      </CardContent>
    </StyledCard>
      </div>
    
    </>
  )
}

export default GenerateTest