import React, { useRef, useState } from "react";
import "./Sidebar.css";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import AddBoxIcon from "@mui/icons-material/AddBox";
import LockIcon from "@mui/icons-material/Lock";
import Inventory2Icon from "@mui/icons-material/Inventory2";
//import FavoriteIcon from "@mui/icons-material/Favorite";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FavoriteIcon from '@mui/icons-material/Bookmarks';

import LogoutIcon from '@mui/icons-material/Logout';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { styled } from '@mui/material/styles';


import { Card, CardContent, Typography, List, ListItem, Button, SvgIcon } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import Modal from './modal'

const StyledCard = styled(Card)({
  width: 500,
  borderRadius: '16px',
  backgroundColor: 'rgba(17, 24, 39, 0.6)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  color: 'white',
  padding: '16px',
  margin: '0 auto',
  border:'1px solid #4B4E55',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05)',

  },
});


const LogoutButton = styled(Button)(({ theme }) => ({
  
  backgroundColor: '#1B222C',
  color: '#FFFFFF',
  transition: 'background-color 0.3s ease, color 0.3s ease',
  '&:hover': {
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
}));

const menuItems = [
  { name: "Home", icon: <HomeIcon /> },
  
  {
    name: "Create",
    icon: <AddBoxIcon />,
    items: ["Article", "Document", "Report"],
  },
  { name: "Products", icon: <Inventory2Icon /> },
  {
    name: "Account",
    icon: <LockIcon />,
    items: ["Dashboard", "Logout"],
  },
  
  {
    name: "Settings",
    icon: <SettingsIcon />,
    items: ["Display", "Editor", "Theme", "Interface"],
  },
  { name: "Saved", icon: <FavoriteIcon /> },
];

const NavHeader = () => (
  <header className="sidebar-header">
    
  </header>
);

const NavButton = ({ onClick, name, icon, isActive, hasSubNav }) => (
  <button
    type="button"
    onClick={() => onClick(name)}
    className={isActive ? "button active " : "button"}

  >
    {icon}
    <span>{name}</span>
    {hasSubNav && <ExpandMoreIcon />}
  </button>
);

const SubMenu = ({ item, activeItem, handleClick }) => {
  const navRef = useRef(null);

  const isSubNavOpen = (item, items) =>
    items.some((i) => i === activeItem) || item === activeItem;

  return (
    <div
      className={`sub-nav ${isSubNavOpen(item.name, item.items) ? "open" : ""}`}
      style={{
        height: !isSubNavOpen(item.name, item.items)
          ? 0
          : navRef.current?.clientHeight,
      }}
    >
      <div ref={navRef} className="sub-nav-inner">
        {item.items.map((subItem) => (
          <NavButton
            key={subItem}
            onClick={handleClick}
            name={subItem}
            isActive={activeItem === subItem}
          />
        ))}
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState("");

  const handleClick = (item) => {
    setActiveItem(item !== activeItem ? item : "");
  };

  return (<>

  <div className="mainBox " >
    <div className="leftBox" style={{
             
               zIndex:'100'
               
            }}>
    <aside className="sidebar">
       <div className="leftTop">
         <div class='jaro' style={{color:'white'}}>ABYUDAY</div>
         
         <center><div style={{display:'flex',justifyContent:'center',alignItems:'center',paddingTop:'0.05rem',fontSize:'0.5rem',width:'fit-content',background:'white',color:'black',paddingRight:'0.5rem',paddingLeft:'0.5rem',borderRadius:'0.4rem'}}>A Generative-AI Examiner Platform</div> </center>
         </div>
      <NavHeader />
      <div className="leftMid">
      {menuItems.map((item) => (
        <div key={item.name}>
          <NavButton
            onClick={handleClick}
            name={item.name}
            icon={item.icon}
            isActive={activeItem === item.name}
            hasSubNav={!!item.items}
          />
          {item.items && (
            <SubMenu
              activeItem={activeItem}
              handleClick={handleClick}
              item={item}
            />
          )}
        </div>
      ))}
</div>
      <div className="leftBottom" style={{margin:'0px',padding:'0px',marginBottom:'1rem'}}>
      <NavButton
           
            name={"Logout"}
            icon={<LogoutIcon />}
            handleClick={handleClick}
            isActive={0}
            
            
          />
      
      </div>
    </aside>

    </div>

    <div className="rightDash">

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

     
        
    </div>


</div>
    </>
  );
};

export default Sidebar;

