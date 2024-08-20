import express from "express";
import cors from "cors";
import path from 'path';
import connectDB from './db/db.js';
import pendingTaskRoute from './routes/pendingTaskRoute.js';
import authRoute from './routes/authRoute.js';
import passport from './config/passportConfig.js'; // Import the Passport configuration

const app = express();
const PORT = process.env.PORT || 4040; 

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Middleware to set cache control headers for static assets
app.use((req, res, next) => { 
  res.setHeader('Cache-Control', 'no-store, must-revalidate'); 
  next(); 
});

// Define your API and auth routes first
app.use(`/api`, pendingTaskRoute);
app.use('/', authRoute);

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
