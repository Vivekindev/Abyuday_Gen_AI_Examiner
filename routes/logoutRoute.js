import { Router } from 'express';


const router = Router();

router.post('/logout',async(req,res)=>{

    try {
      res.cookie('accessToken', " ", { httpOnly: true, sameSite: 'Strict'});
      res.cookie('refreshToken', " ", { httpOnly: true, sameSite: 'Strict'});
      res.sendStatus(200);
    } 
    catch (error) {
     console.error(error);
    }

});


export default router;