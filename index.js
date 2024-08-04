import express from "express";
import cors from "cors";
import path from 'path';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const __dirname = path.resolve();

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4040; // Choose the port you want to use
app.use(cors());

// Middleware to set cache control headers for static assets
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    next();
  });

app.use(express.static(path.join(__dirname,"./client/dist")));

app.use(express.static(path.join(__dirname,"./")));
// app.get('/home',function(_,res){
//     res.sendFile(path.join(__dirname, "./home.html"), function(err){
// res.status(500).send(err);
//     })
// })

app.get('*',function(_,res){
    res.sendFile(path.join(__dirname, "./client/dist/index.html"), function(err){
res.status(500).send(err);
    })
})




app.use(express.json());


app.listen(PORT,()=>{
    console.log(`Listening at port ${PORT}`);
})