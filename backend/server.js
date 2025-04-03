require('dotenv').config(); // Load environment variables, e.g. GOOGLE_MAPS_API_KEY, BASE_URL
const BASE_URL = process.env.REACT_APP_TEST;

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: `${BASE_URL}:3000`, methods: ["GET", "POST"] }
});
const PORT = 4000; // or your preferred port

// Optionally enable all CORS requests (for dev)
app.use(cors());
app.use(express.json());

// Path to the CSV file
const locationFilePath = path.join(__dirname, 'location_data', 'live_location.csv');
const waypointsFilePath = path.join(__dirname, 'waypoints', 'waypoints.csv');
const transmitPath = path.join(__dirname, 'messaging', 'transmit.py');

/**
 * Only socket connection, used for WASD
 */
io.on('connection', (socket) => {
  console.log('Client connected (WebSockets)');

  socket.on('keypress', (command) => {
    console.log(`Received command to send: ${command}`);

    // Spawn the shell script and pass the command as an argument
    const shellProcess = spawn(transmitPath, ['MAN', command]);

    // Handle stdout (output from the shell script)
    shellProcess.stdout.on('data', (data) => {
        console.log(`Shell Output: ${data}`);
    });

    // Handle stderr (errors from the shell script)
    shellProcess.stderr.on('data', (data) => {
        console.error(`Shell Error: ${data}`);
    });

    // Handle process exit
    shellProcess.on('close', (code) => {
        console.log(`Shell script exited with code ${code}`);
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Serve static files if desired (e.g. your frontend)
app.use(express.static(path.join(__dirname, '../frontend/public')));

/**
 * 1) Return the Google Maps API key (from .env)
 */
app.get('/api/mapkey', (req, res) => {
  res.json({ key: process.env.GOOGLE_MAPS_API_KEY });
});

/**
 * 2) Download CSV files
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
 * 3) Clear CSV files
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
 * 4) Get parsed location data from CSV
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
 * 5) Upload Waypoints (Save to CSV)
 */
app.post('/uploadWaypoints', (req, res) => {
  let { waypoints } = req.body;

  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return res.status(400).json({ error: 'No valid waypoints found.' });
  }

  // Detect if the first row is a header and remove it if needed
  const firstRow = waypoints[0];
  const isHeader =
    (typeof firstRow.lat === 'string' && /lat|latitude/i.test(firstRow.lat)) &&
    (typeof firstRow.lng === 'string' && /long|lon|longitude/i.test(firstRow.lng));

  if (isHeader) {
    waypoints = waypoints.slice(1); // Remove header row
  }

  // Process and validate waypoints
  const cleanedWaypoints = waypoints
    .map(({ lat, lng }) => {
      const cleanLat = parseFloat(lat);
      const cleanLng = parseFloat(lng);
      return !isNaN(cleanLat) && !isNaN(cleanLng) ? { lat: cleanLat, lng: cleanLng } : null;
    })
    .filter(Boolean); // Remove invalid entries

  if (cleanedWaypoints.length === 0) {
    return res.status(400).json({ error: 'No valid waypoints after processing.' });
  }

  // Format the CSV data
  let csvContent = 'Index,Latitude,Longitude\n';
  cleanedWaypoints.forEach((point, index) => {
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
 * 6) Transmit waypoints to onboard
 */
app.post('/sendWaypoints', (req, res) => {
    const process = spawn(transmitPath, ['WP']);

    let outputData = '';
    let errorData = '';

    process.stdout.on('data', (data) => {
        outputData += data.toString();
    });

    process.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    process.on('close', (code) => {
        if (code !== 0) {
            console.error(`Script exited with code ${code}: ${errorData}`);
            return res.status(500).json({ success: false, error: errorData });
        }

        console.log(`Script output: ${outputData}`);
        res.json({ success: true, message: 'Waypoints sent successfully.', output: outputData });
    });
});

/**
 * 7) Start and stop manual mode
 */
app.post('/start_manual', (req, res) => {
  const process = spawn(transmitPath, ['MSSN', 'START_MAN']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error starting manual mode, exit code: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Manual mode started' });
  });
});

app.post('/stop_manual', (req, res) => {
  const process = spawn(transmitPath, ['MSSN', 'STOP_MAN']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error stopping manual mode, exit code: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Manual mode stopped' });
  });
});

/**
 * 8) start and stop the mission 
 */
app.post('/start_mission', (req, res) => {
  const process = spawn(transmitPath, ['MSSN', 'START_MSSN']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error starting mission, exit code: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Mission started' });
  });
});

app.post('/resume_manual', (req, res) => {
  const process = spawn(transmitPath, ['MSSN', 'RESUME_MSSN']);

  process.on('close', (code) => {
    if (code !== 0) {
        console.error(`Error resuming mission, exit code: ${code}`);
        return res.status(500).json({ success: false, error: `Exit code: ${code}` });
    }
    res.json({ success: true, message: 'Mission resumed' });
  })
})

app.post('/stop_mission', (req, res) => {
  const process = spawn(transmitPath, ['MSSN', 'STOP_MSSN']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error stopping mission, exit code: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Mission stopped' });
  });
});

/**
 * 9) arm & disarm
 */
app.post('/arm', (req, res) => {
  const process = spawn(transmitPath, ['MSSN', 'ARM']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error arming vessel, exit code: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Vessel armed' });
  });
});

app.post('/disarm', (req, res) => {
  const process = spawn(transmitPath, ['MSSN', 'DISARM']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error distharming vessel, exit code: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Vessel disarmed' });
  });
});

/**
 * Start the server
 */
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on ${BASE_URL}:${PORT}`);
});
// For Raspberry Pi AP: console.log(`Server is running on ${BASE_URL}:${PORT}`);
