import express from "express";
import cors from "cors";
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import connectDB from './db/db.js';
import pendingTaskRoute from './routes/pendingTaskRoute.js';
import GoogleOauthRoute from './routes/GoogleOauthRoute.js';
import passport from './config/passportConfig.js'; // Import the Passport configuration
import loginAuthRoute from './routes/loginAuthRoute.js'
import registerAuthRoute from './routes/registerAuthRoute.js';
import authorizationRoute from './routes/authorizationRoute.js'
import logoutRoute from './routes/logoutRoute.js'

const app = express();
const PORT = process.env.PORT || 4040; 
dotenv.config();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use(cookieParser());


// Middleware to set cache control headers for static assets
app.use((req, res, next) => { 
  res.setHeader('Cache-Control', 'no-store, must-revalidate'); 
  next(); 
});

// Define your API and auth routes first
app.use(`/api`, pendingTaskRoute);
app.use(`/api`, loginAuthRoute);
app.use(`/api`, registerAuthRoute);
app.use(`/api`, authorizationRoute);
app.use('/api', logoutRoute);
app.use('/', GoogleOauthRoute);

// To serve react static files (Frontend)
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "./client/dist")));
app.use(express.static(path.join(__dirname, "./")));

// Serve the React app for all other routes
app.get('*', function (_, res) {
  res.sendFile(path.join(__dirname, "./client/dist/index.html"), function(err) {
    if (err) {
      res.status(500).send(err);
    }
  });
});

// Connect to the database and start the server
connectDB()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`Server is up and running on port ${PORT}`)
    );
  })
  .catch((err) => console.log(err));
