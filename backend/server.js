require('dotenv').config(); // Load environment variables, e.g. GOOGLE_MAPS_API_KEY

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // If needed for cross-origin requests

const app = express();
const PORT = 4000; // or your preferred port

// Optionally enable all CORS requests (for dev)
app.use(cors());

// Path to the CSV file
const locationFilePath = path.join(__dirname, 'data', 'data.csv');
const waypointsFilePath = path.join(__dirname, 'waypoints', 'waypoints.csv')

// Serve static files if desired (e.g. your frontend)
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use(express.json())

/**
 * 1) Return the Google Maps API key (from .env)
 */
app.get('/api/mapkey', (req, res) => {
  res.json({ key: process.env.GOOGLE_MAPS_API_KEY });
});

/**
 * 2) Download the CSV file (existing route)
 */
app.get('/download_location', (req, res) => {
  if (fs.existsSync(locationFilePath)) {
    res.download(locationFilePath, 'data.csv', (err) => {
      if (err) {
        console.error('Error during file download:', err);
        res.status(500).send('Error downloading the file.');
      }
    });
  } else {
    res.status(404).send('File not found.');
  }
});

/**
 * 2) Download the CSV file (existing route)
 */
app.get('/download_waypoints', (req, res) => {
  if (fs.existsSync(waypointsFilePath)) {
    res.download(waypointsFilePath, 'waypoints.csv', (err) => {
      if (err) {
        console.error('Error during file download:', err);
        res.status(500).send('Error downloading the file.');
      }
    });
  } else {
    res.status(404).send('File not found.');
  }
});

/**
 * 3) Clear the CSV file
 */
app.post('/clear_location_csv', (req, res) => {
  if (fs.existsSync(locationFilePath)) {
    fs.writeFile(locationFilePath, '', (err) => {
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

app.post('/clear_waypoints_csv', (req, res) => {
  if (fs.existsSync(waypointsFilePath)) {
    fs.writeFile(waypointsFilePath, '', (err) => {
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
 * 4) NEW ENDPOINT: Return parsed data from data.csv as JSON
 *    Format: [{ timestamp, lat, lng, sensorData }, ...]
 */
app.get('/points', (req, res) => {
  if (!fs.existsSync(locationFilePath)) {
    return res.status(404).json({ error: 'File not found.' });
  }

  try {
    const csvText = fs.readFileSync(locationFilePath, 'utf8');
    const lines = csvText.split('\n').filter((ln) => ln.trim() !== '');

    // Check if first line is a header
    const hasHeader = lines[0].toLowerCase().includes('timestamp');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    // Parse each line into an object
    const points = dataLines.map((line) => {
      const [timestamp, latStr, lngStr, sensorStr] = line.split(',').map((s) => s.trim());
      return {
        timestamp,
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
        sensorData: parseInt(sensorStr, 10),
      };
    });

    res.json(points);
  } catch (err) {
    console.error('Error reading/ parsing CSV:', err);
    res.status(500).json({ error: 'Error parsing file.' });
  }
});

/**
 * Expects a JSON payload:
 *    { waypoints: [ { lat: number, lng: number }, ... ] }
 * Saves the waypoints into a CSV file named "waypoints.csv" in a folder called "waypoints" on the backend.
 */
app.post('/uploadWaypoints', (req, res) => {
  // req.body should now be populated thanks to express.json()
  const waypoints = req.body.waypoints;
  if (!Array.isArray(waypoints)) {
    return res.status(400).json({ error: 'Invalid waypoints data. Expected an array.' });
  }

  // Create the folder if it doesn't exist
  if (!fs.existsSync(waypointsFilePath)) {
    fs.mkdirSync(waypointsFilePath, { recursive: true });
  }

  // Format the CSV data. Header: No, Latitude, Longitude
  let csvContent = 'No,Latitude,Longitude\n';
  waypoints.forEach((point, index) => {
    csvContent += `${index + 1},${point.lat},${point.lng}\n`;
  });

  // Write the CSV file to the "waypoints" folder
  fs.writeFile(waypointsFilePath, csvContent, (err) => {
    if (err) {
      console.error('Error writing waypoints file:', err);
      return res.status(500).json({ error: 'Failed to upload waypoints.' });
    }
    res.json({ message: 'Waypoints uploaded successfully.', file: 'waypoints.csv' });
  });
});

/**
 * Start the server
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  // For Raspberry Pi AP: console.log(`Server is running on http://192.168.4.1:${PORT}`);
});
