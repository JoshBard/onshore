require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// Choose your PORT
const PORT = 4000;

console.log('API KEY from .env:', process.env.GOOGLE_MAPS_API_KEY);

// Path to the CSV file
const dataFilePath = path.join(__dirname, 'data', 'data.csv');

app.use(cors());

// Middleware to serve static files (e.g., the front-end)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Route to return the Maps API key
app.get('/api/mapkey', (req, res) => {
  res.json({ key: process.env.GOOGLE_MAPS_API_KEY });
});

// Route to download the CSV file
app.get('/download', (req, res) => {
  if (fs.existsSync(dataFilePath)) {
    res.download(dataFilePath, 'data.csv', (err) => {
      if (err) {
        console.error('Error during file download:', err);
        res.status(500).send('Error downloading the file.');
      }
    });
  } else {
    res.status(404).send('File not found.');
  }
});

// Route to clear the CSV file
app.post('/clear', (req, res) => {
  if (fs.existsSync(dataFilePath)) {
    fs.writeFile(dataFilePath, '', (err) => {
      if (err) {
        console.error('Error clearing the file:', err);
        return res.status(500).send('Error clearing the file.');
      }
      res.send('File cleared successfully.');
    });
  } else {
    res.status(404).send('File not found.');
  }
});

/**
 * LOCALHOST VERSION:
 * Listen on localhost so it's only accessible on your computer.
 */
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

/** 
 * RASPBERRY PI VERSION (COMMENTED):
 * If you want to host on the Pi’s AP (192.168.4.1), 
 * comment out the above block and uncomment below:
 */

// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server is running on http://192.168.4.1:${PORT}`);
// });
