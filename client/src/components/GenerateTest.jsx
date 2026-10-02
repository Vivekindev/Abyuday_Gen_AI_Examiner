import React from 'react'
import Modal from '../pages/modal'


import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { styled } from '@mui/material/styles';


import { Card, CardContent, Typography, List, ListItem, Button, SvgIcon } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';


const StyledCard = styled(Card)({
    width: 'min(500px, 100%)',
    borderRadius: '16px',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    color: 'white',
    padding: '16px',
    margin: '0 auto',
    flex: '1 1 320px',
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
 Gemini 3.5 Flash-Lite <AutoAwesomeIcon fontSize="large"/>
        </Typography>
        <Typography sx={{ mt: 2, mb: 1, color: 'rgba(156, 163, 175, 1)', minHeight:'9.4rem'}}>
        A fast, cost-effective choice for everyday question generation.
        </Typography>
        <List sx={{ mb: 3 }}>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Create up to 50 questions per test</Typography>
          </ListItem>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Optimized for speed</Typography>
          </ListItem>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Best for routine topics</Typography>
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
         Gemini 3.8 Flash <AutoAwesomeIcon fontSize="large"/>
        </Typography>
        <Typography sx={{ mt: 2, mb: 1, color: 'rgba(156, 163, 175, 1)', minHeight:'9.4rem'}}>
        A more capable model for complex topics and challenging questions.
        </Typography>

        <List sx={{ mb: 3 }}>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Create up to 50 questions per test</Typography>
          </ListItem>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>More reasoning for harder prompts</Typography>
          </ListItem>
          <ListItem sx={{ display: 'flex', alignItems: 'center' }}>
            <SvgIcon component={CheckCircleIcon} sx={{ color: '#8FBFFF', mr: 1 }} />
            <Typography>Best for demanding topics</Typography>
          </ListItem>
        </List>
       
      </CardContent>
    </StyledCard>
      </div>
    
    </>
  )
}

export default GenerateTest
