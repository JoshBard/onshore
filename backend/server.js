require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { spawn, execFile } = require('child_process');
const os = require('os');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Path to the CSV file
const telemtryFilePath = path.join(__dirname, 'telemetry_data', 'live_telem.csv');
const waypointsFilePath = path.join(__dirname, 'waypoints', 'waypoints.csv');
const transmitPath = path.join(__dirname, 'messaging', 'transmit.py');
const statusPath = path.join(__dirname, 'messaging', 'connection_status.txt');
const venvPath = path.join(__dirname, '..', '..', 'venv', 'bin', 'python3');
const changeWifiPath = path.join(__dirname, './change_wifi.sh');

// Instantiate socket
const io = socketIo(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Get local IP address
function getLocalIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '0.0.0.0';
}

/**
 * Only socket connection, used for WASD
 */
io.on('connection', (socket) => {
  console.log('Client connected (WebSockets)');

  socket.on('keypress', (command) => {
    console.log(`Received command to send: ${command}`);

    // Spawn the shell script and pass the command as an argument
    const shellProcess = spawn(venvPath, [transmitPath, 'MAN', command]);

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


/**
 * 1) Return the Google Maps API key (from .env)
 */
app.get('/api/mapkey', (req, res) => {
  res.json({ key: process.env.GOOGLE_MAPS_API_KEY });
});

/**
 * 2) Download CSV files
 */
app.get('/download_telemetry', (req, res) => {
  if (fs.existsSync(telemtryFilePath)) {
    res.download(telemtryFilePath, 'live_telem.csv', (err) => {
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
app.post('/clear_telemetry_csv', (req, res) => {
  if (fs.existsSync(telemtryFilePath)) {
    fs.writeFile(telemtryFilePath, '', (err) => {
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
 * 4) Get parsed data from CSV
 */
app.get('/points', (req, res) => {
  if (!fs.existsSync(telemtryFilePath)) {
    return res.status(404).json({ error: 'File not found.' });
  }

  try {
    const csvText = fs.readFileSync(telemtryFilePath, 'utf8');
    const lines = csvText.split('\n').filter((ln) => ln.trim() !== '');

    // Check if the first line is a header (assuming it contains "timestamp")
    let header;
    let dataLines;
    if (lines[0].toLowerCase().includes('timestamp')) {
      header = lines[0].split(',').map(s => s.trim());
      dataLines = lines.slice(1);
    } else {
      // Define header manually if not present.
      header = ["timestamp", "BATT", "CUR", "LVL", "GPS_FIX", "GPS_SATS", "LAT", "LON", "ALT", "MODE", "sensor_data"];
      dataLines = lines;
    }

    // Parse each CSV line into an object.
    const points = dataLines.map((line) => {
      const fields = line.split(',').map((s) => s.trim());
      const point = {};
      header.forEach((key, index) => {
        point[key] = fields[index];
      });
      // Convert LAT and LON to numbers.
      point.LAT = parseFloat(point.LAT);
      point.LON = parseFloat(point.LON);
      return point;
    });

    // Build the returned object using only the expected telemetry keys.
    const filteredPoints = points.map((p) => ({
      timestamp: p.timestamp,
      BATT: p.BATT,
      CUR: p.CUR,
      LVL: p.LVL,
      GPS_FIX: p.GPS_FIX,
      GPS_SATS: p.GPS_SATS,
      LAT: p.LAT,
      LON: p.LON,
      ALT: p.ALT,
      MODE: p.MODE
    }));

    res.json(filteredPoints);
  } catch (err) {
    console.error('Error reading/parsing CSV:', err);
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
    const process = spawn(venvPath, [transmitPath, 'WP']);

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
  const process = spawn(venvPath, [transmitPath, 'MSSN', 'START_MSSN']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error starting manual mode, exit code: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Manual mode started' });
  });
});

app.post('/stop_manual', (req, res) => {
  const process = spawn(venvPath, [transmitPath, 'MSSN', 'STOP_MAN']);

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
  const process = spawn(venvPath, [transmitPath, 'MSSN', 'START_MSSN']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error starting mission, exit code: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Mission started' });
  });
});

app.post('/resume_manual', (req, res) => {
  const process = spawn(venvPath, [transmitPath, 'MSSN', 'RESUME_MSSN']);

  process.on('close', (code) => {
    if (code !== 0) {
        console.error(`Error resuming mission, exit code: ${code}`);
        return res.status(500).json({ success: false, error: `Exit code: ${code}` });
    }
    res.json({ success: true, message: 'Mission resumed' });
  })
})

app.post('/stop_mission', (req, res) => {
  const process = spawn(venvPath, [transmitPath, 'MSSN', 'STOP_MSSN']);

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
  const process = spawn(venvPath, [transmitPath, 'MSSN', 'ARM']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error arming vessel, exit code: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Vessel armed' });
  });
});

app.post('/disarm', (req, res) => {
  const process = spawn(venvPath, [transmitPath, 'MSSN', 'DISARM']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error disarming vessel, exit code: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Vessel disarmed' });
  });
});

/**
 * 10) Return to home
 */
app.post('/rtl', (req, res) => {
  const process = spawn(venvPath, [transmitPath, 'MSSN', 'START_RTL']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error returning vessel home: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Vessel on its way home' });
  });
});

/**
 * 11) Toggle autonomous mode
 */
app.post('/sailboat', (req, res) => {
  const process = spawn(venvPath, [transmitPath, 'MSSN', 'SAIL']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error switching to sail power: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Vessel is under sail power' });
  });
});

app.post('/motor_boat', (req, res) => {
  const process = spawn(venvPath, [transmitPath, 'MSSN', 'MOTOR']);

  process.on('close', (code) => {
      if (code !== 0) {
          console.error(`Error switching to motor power: ${code}`);
          return res.status(500).json({ success: false, error: `Exit code: ${code}` });
      }
      res.json({ success: true, message: 'Vessel is under motor power' });
  });
});

/**
 * 12) Connection status
 */
app.get('/api/connection_status', (req, res) => {
  fs.readFile(statusPath, 'utf8', (err, data) => {
    if(err){
      return res.status(500).json({ status: 'disconnected', error: err.message });
    }
    res.json({ status: data.trim() });
  });
});

/**
 * 13) Error messaging
 */
app.post('/api/alert', (req, res) => {
  const { message } = req.body;
  // Emit the message to connected WebSocket clients
  io.emit('alert', message);
  res.sendStatus(200);
});

/**
 * 14) Change wifi network
 */
const changeWifiDir  = path.dirname(changeWifiPath);

app.post('/changewifi', (req, res) => {
  const { ssid, password } = req.body;
  if (!ssid || !password) {
    return res
      .status(400)
      .json({ success: false, error: 'SSID and password are required' });
  }

  console.log('– running changewifi –');
  console.log('script exists:', fs.existsSync(changeWifiPath));
  console.log('mode:', (fs.statSync(changeWifiPath).mode & 0o777).toString(8));
  console.log('cwd will be:', changeWifiDir);

  execFile(
    'sudo',
    ['-n', changeWifiPath, ssid, password],
    {
      cwd: changeWifiDir,
      env: process.env,
      timeout: 15_000,
      maxBuffer: 1024 * 512
    },
    (err, stdout, stderr) => {
      console.log('→ execFile callback:', { err, stdout, stderr });
      if (err) {
        console.error('change_wifi.sh failed:', err.code, stderr || err.message);
        return res
          .status(500)
          .json({ success: false, error: (stderr || err.message).trim() });
      }
      return res.json({ success: true, output: stdout.trim() });
    }
  );
});

// ————————————————————————————————
// Now finally: serve React’s production build & catch‑all
// ————————————————————————————————
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Only if no API/static route matched:
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

/**
 * Start the server
 */
server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Server is running on http://${getLocalIPv4()}:${PORT}`
  );
});