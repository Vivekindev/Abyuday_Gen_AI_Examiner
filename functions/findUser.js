import usersData from '../models/usersData.js';

const findUser = async(userEmail)=>{
    const user = await usersData.findOne({ email: userEmail });
    return user;
}

export default findUser;