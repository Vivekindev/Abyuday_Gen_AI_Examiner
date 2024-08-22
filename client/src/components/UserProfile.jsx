// src/components/UserProfile.js
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUsername } from '../features/user/userSlice'; 

const UserProfile = () => {
  const dispatch = useDispatch();
  const username = useSelector((state) => state.user.username);

  const handleChangeUsername = () => {
    const newUsername = prompt('Enter new username:');
    dispatch(setUsername(newUsername));
  };

  return (
    <div>
      <h1>Username: {username}</h1>
      <button onClick={handleChangeUsername}>Change Username</button>
    </div>
  );
};

export default UserProfile;
