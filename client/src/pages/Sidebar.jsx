import React, { useRef, useState, useEffect } from "react";
import "./Sidebar.css";
import { useNavigate } from 'react-router-dom';
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import AddBoxIcon from "@mui/icons-material/AddBox";
import LockIcon from "@mui/icons-material/Lock";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FavoriteIcon from '@mui/icons-material/Bookmarks';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleSharpIcon from '@mui/icons-material/CheckCircleSharp';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { styled } from '@mui/material/styles';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner'; // Updated import
import { Button } from '@mui/material';
import GenerateTest from "../components/GenerateTest";
import axios from "axios";

// Custom Styled Components
const UserBox = styled('div')(({ theme }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1.5),
  backgroundColor: 'rgba(0, 0, 0, 1)', // Neutral transparent background
  borderRadius: '1rem', // More curved corners
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
  fontSize: '1rem', // Smaller text
  fontWeight: theme.typography.fontWeightMedium,
}));

const menuItems = [
  { name: "Home", icon: <HomeIcon /> },
  {
    name: "Create Test",
    icon: <AutoAwesomeIcon />,
    items: ["GenAI Generate"],
  },
  { name: "Tests Created", icon: <CheckCircleSharpIcon /> },
  {
    name: "Account",
    icon: <LockIcon />,
    items: ["Profile"],
  },
  {
    name: "Settings",
    icon: <SettingsIcon />,
    items: ["Under Development"],
  },
  { name: "Saved", icon: <FavoriteIcon /> },
];

const NavHeader = () => (
  <header className="sidebar-header"></header>
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
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("Home");
  const [username, setUsername] = useState('');

  useEffect(() => {
    const usernameFromCookie = Cookies.get('username');
    setUsername(usernameFromCookie);
  }, []);

  const handleLogout = async () => {
    try {
      const createTestPromise = async () => await axios.post('/api/logout');
      
      await toast.promise(createTestPromise(), {
        loading: 'Logging out...',
        success: (response) => {
          return `Logout Successful`;
        },
        error: 'Failed to Logout',
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleClick = (item) => {
    setActiveItem(item !== activeItem ? item : "");
  };

  return (
    <>
      <div className="mainBox">
        <div className="leftBox" style={{ zIndex: '100' }}>
          <aside className="sidebar">
            <div className="leftTop">
              <div className="jaro" style={{ color: 'white' }}>ABYUDAY</div>
              <center>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: '0.05rem',
                    fontSize: '0.5rem',
                    width: 'fit-content',
                    background: 'white',
                    color: 'black',
                    paddingRight: '0.5rem',
                    paddingLeft: '0.5rem',
                    borderRadius: '0.4rem',
                  }}
                >
                  A Generative-AI Examiner Platform
                </div>
              </center>
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
            <div className="leftBottom" style={{ margin: '0px', padding: '0px', marginBottom: '1rem', height:'30%'}}>
               
{/* Username box with logo */}
<UserBox>
        <AccountCircleIcon fontSize="medium" sx={{ color: 'white' }} /> {/* Smaller icon */}
        <UsernameText>{username || 'User'}</UsernameText>
      </UserBox>

      <Button
        fullWidth
        variant="contained"
        color="primary"
        onClick={handleLogout}
        sx={{
          fontSize: '0.875rem', // Smaller font size
          height: '2.5rem', // Slightly smaller button height
          backgroundColor: 'rgba(0, 123, 255, 0.1)', // Neutral transparent background
          borderRadius: '1rem', // More curved corners
          boxShadow: 2,
          '&:hover': {
            backgroundColor: 'rgba(0, 123, 255, 0.2)', // Slightly darker on hover
          },
        }}
      >
        Logout
      </Button>
            </div>
          </aside>
        </div>

        <div className="rightDash">
          {activeItem === "GenAI Generate" && <GenerateTest />}
        </div>
      </div>
      <Toaster richColors />
    </>
  );
};

export default Sidebar;
