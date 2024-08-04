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
import Button from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';
import { styled } from '@mui/material/styles';

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
         <div style={{display:'flex',justifyContent:'center',alignItems:'center',paddingTop:'0.05rem',fontSize:'0.5rem',color:'#E1D9D1'}}>A Multi LLM Platform</div> 
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

    </div>


</div>
    </>
  );
};

export default Sidebar;

