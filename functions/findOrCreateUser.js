import usersData from '../models/usersData.js';

const findOrCreateUser = async(profile)=>{
    let user = await usersData.findOne({ email: profile.emails[0].value });
  
    if (!user) {
      user = await usersData.create({
        email: profile.emails[0].value,
        userName: profile.displayName,
        password: 'Google OAUTH', // No password for OAuth users
      });
    }
  
    return user;
  }
  
export default findOrCreateUser;