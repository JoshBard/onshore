require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const { spawn, execFile } = require('child_process');
const os = require('os');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Path to the CSV file
const telemtryFilePath   = path.join(__dirname, 'telemetry_data', 'live_telem.csv');
const waypointsFilePath = path.join(__dirname, 'waypoints',       'waypoints.csv');
const statusPath        = path.join(__dirname, 'messaging',       'connection_status.txt');
const venvPath          = path.join(__dirname, '..', '..', 'venv', 'bin', 'python3');
const changeWifiPath    = path.join(__dirname, './change_wifi.sh');

// WebSocket setup
const io = socketIo(server, {
  cors: { origin: true, methods: ['GET','POST'], credentials: true }
});

// Utility to get local IP
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
 *  WebSocket keypress → mesh send
 */
io.on('connection', (socket) => {
  console.log('Client connected (WebSockets)');

  socket.on('keypress', (command) => {
    console.log(`Received command to send: ${command}`);
    axios.post('http://127.0.0.1:5000/send', {
      type: 'MAN',
      payload: command
    }).catch(err => console.error('keypress send error', err));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

/**
 * 1) Return Google Maps API key
 */
app.get('/api/mapkey', (req, res) => {
  res.json({ key: process.env.GOOGLE_MAPS_API_KEY });
});

/**
 * 2) Download CSV files
 */
app.get('/download_telemetry', (req, res) => {
  if (fs.existsSync(telemtryFilePath)) {
    res.download(telemtryFilePath, 'live_telem.csv', err => {
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
    res.download(waypointsFilePath, 'waypoints.csv', err => {
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
    fs.writeFile(telemtryFilePath, '', err => {
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
    fs.writeFile(waypointsFilePath, '', err => {
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
 * 4) Get parsed telemetry points
 */
app.get('/points', (req, res) => {
  if (!fs.existsSync(telemtryFilePath)) {
    return res.status(404).json({ error: 'File not found.' });
  }
  try {
    const csvText = fs.readFileSync(telemtryFilePath, 'utf8');
    const lines = csvText.split('\n').filter(ln => ln.trim() !== '');
    let header, dataLines;
    if (lines[0].toLowerCase().includes('timestamp')) {
      header = lines[0].split(',').map(s => s.trim());
      dataLines = lines.slice(1);
    } else {
      header = ["timestamp","BATT","CUR","LVL","GPS_FIX","GPS_SATS","LAT","LON","ALT","MODE","sensor_data"];
      dataLines = lines;
    }
    const points = dataLines.map(line => {
      const fields = line.split(',').map(s => s.trim());
      const obj = {};
      header.forEach((key,i) => { obj[key] = fields[i]; });
      obj.LAT = parseFloat(obj.LAT);
      obj.LON = parseFloat(obj.LON);
      return obj;
    });
    const filtered = points.map(p => ({
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
    res.json(filtered);
  } catch (err) {
    console.error('Error reading/parsing CSV:', err);
    res.status(500).json({ error: 'Error parsing file.' });
  }
});

/**
 * 5) Upload waypoints CSV
 */
app.post('/uploadWaypoints', (req, res) => {
  let { waypoints } = req.body;
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return res.status(400).json({ error: 'No valid waypoints found.' });
  }
  if (typeof waypoints[0].lat === 'string' && /lat|latitude/i.test(waypoints[0].lat)) {
    waypoints = waypoints.slice(1);
  }
  const cleaned = waypoints
    .map(({lat,lng}) => {
      const la = parseFloat(lat), lo = parseFloat(lng);
      return !isNaN(la)&&!isNaN(lo) ? {lat:la,lng:lo} : null;
    })
    .filter(Boolean);
  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'No valid waypoints after processing.' });
  }
  let csvContent = 'Index,Latitude,Longitude\n';
  cleaned.forEach((pt,i) => {
    csvContent += `${i+1},${pt.lat},${pt.lng}\n`;
  });
  fs.writeFile(waypointsFilePath, csvContent, err => {
    if (err) {
      console.error('Error writing waypoints file:', err);
      return res.status(500).json({ error: 'Failed to upload waypoints.' });
    }
    res.json({ message: 'Waypoints uploaded successfully.', file: 'waypoints.csv' });
  });
});

/**
 * 6) sendWaypoints → /send type=WP
 */
app.post('/sendWaypoints', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'WP' });
    res.json({ success: true, message: 'Waypoints queued.' });
  } catch (err) {
    console.error('Error queueing waypoints:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});

/**
 * 7) Manual mode endpoints → /send type=MSSN payload=...
 */
app.post('/start_manual', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'MSSN', payload: 'START_MAN' });
    res.json({ success: true, message: 'Start manual queued.' });
  } catch (err) {
    console.error('Error queueing start manual:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});
app.post('/stop_manual', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'MSSN', payload: 'STOP_MAN' });
    res.json({ success: true, message: 'Stop manual queued.' });
  } catch (err) {
    console.error('Error queueing stop manual:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});

/**
 * 8) Mission control endpoints → /send type=MSSN payload=...
 */
app.post('/start_mission', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'MSSN', payload: 'START_MSSN' });
    res.json({ success: true, message: 'Start mission queued.' });
  } catch (err) {
    console.error('Error queueing start mission:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});
app.post('/resume_manual', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'MSSN', payload: 'RESUME_MSSN' });
    res.json({ success: true, message: 'Resume manual queued.' });
  } catch (err) {
    console.error('Error queueing resume manual:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});
app.post('/stop_mission', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'MSSN', payload: 'STOP_MSSN' });
    res.json({ success: true, message: 'Stop mission queued.' });
  } catch (err) {
    console.error('Error queueing stop mission:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});

/**
 * 9) Arm & Disarm
 */
app.post('/arm', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'MSSN', payload: 'ARM' });
    res.json({ success: true, message: 'Arm queued.' });
  } catch (err) {
    console.error('Error queueing arm:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});
app.post('/disarm', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'MSSN', payload: 'DISARM' });
    res.json({ success: true, message: 'Disarm queued.' });
  } catch (err) {
    console.error('Error queueing disarm:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});

/**
 * 10) Return to home (RTL)
 */
app.post('/rtl', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'MSSN', payload: 'START_RTL' });
    res.json({ success: true, message: 'RTL queued.' });
  } catch (err) {
    console.error('Error queueing RTL:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});

/**
 * 11) Autonomous mode toggle
 */
app.post('/sailboat', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'MSSN', payload: 'SAIL' });
    res.json({ success: true, message: 'Sail mode queued.' });
  } catch (err) {
    console.error('Error queueing sail mode:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});
app.post('/motor_boat', async (req, res) => {
  try {
    await axios.post('http://127.0.0.1:5000/send', { type: 'MSSN', payload: 'MOTOR' });
    res.json({ success: true, message: 'Motor mode queued.' });
  } catch (err) {
    console.error('Error queueing motor mode:', err.toString());
    res.status(500).json({ success: false, error: err.toString() });
  }
});

/**
 * 12) Connection status
 */
app.get('/api/connection_status', (req, res) => {
  fs.readFile(statusPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ status: 'disconnected', error: err.message });
    }
    res.json({ status: data.trim() });
  });
});

/**
 * 13) Error messaging
 */
app.post('/api/alert', (req, res) => {
  console.log('POST /api/alert →', req.body);
  const { message } = req.body;
  io.emit('alert', message);
  res.sendStatus(200);
});


/**
 * 14) Change wifi network
 */
app.post('/changewifi', (req, res) => {
  const { ssid, password } = req.body;
  if (!ssid || !password) {
    return res.status(400).json({ success: false, error: 'SSID and password are required' });
  }
  console.log('– running changewifi –');
  console.log('script exists:', fs.existsSync(changeWifiPath));
  console.log('mode:', (fs.statSync(changeWifiPath).mode & 0o777).toString(8));
  execFile(
    'sudo',
    ['-n', changeWifiPath, ssid, password],
    { env: process.env, timeout: 15000, maxBuffer: 1024 * 512 },
    (err, stdout, stderr) => {
      console.log('→ execFile callback:', { err, stdout, stderr });
      if (err) {
        console.error('change_wifi.sh failed:', err.code, stderr || err.message);
        return res.status(500).json({ success: false, error: (stderr || err.message).trim() });
      }
      return res.json({ success: true, output: stdout.trim() });
    }
  );
});

// test
app.get('/ping', (req, res) => {
  console.log('Received GET /ping');
  res.send('pong');
});


// Serve React build & catch-all
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://${getLocalIPv4()}:${PORT}`);
});
