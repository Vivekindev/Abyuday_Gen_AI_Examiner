import React, { useRef, useState, useEffect } from "react";
import './UserCard.css';
import Cookies from 'js-cookie';

const UserCard = () => {
    const [username, setUsername] = useState('');
    useEffect(() => {
        const usernameFromCookie = Cookies.get('username');
        setUsername(usernameFromCookie);
      }, []);
    

  return (

      <div className="user-notification">
        <div className="user-notiglow" />
        <div className="user-notiborderglow" />
        <div className="user-notititle">Welcome Back </div>
        <div className="user-notibody">{username}</div>
      </div>
  );
};


export default UserCard;
