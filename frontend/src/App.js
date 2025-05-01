import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';

// Import your page components
import Home from './pages/Home';
import UploadPage from './pages/UploadPage';
import MapPage from './pages/MapPage';
import Manual from './pages/Manual';
import Wifi from './pages/Wifi';

// Import the Header component
import Header     from './components/Header';

function App() {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [alertMessage, setAlertMessage]       = useState('');

  // Listen for backend "alert" events and show a non-blocking banner
  useEffect(() => {
    const socket = io();  // connects to http://localhost:3000 by default
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });
    socket.on('alert', msg => {
      console.log('Received alert:', msg);
      setAlertMessage(msg);
      setTimeout(() => setAlertMessage(''), 5000);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch connection status every 10s
  const fetchConnectionStatus = async () => {
    try {
      const res = await fetch('/api/connection_status');
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data.status);
      } else {
        console.error('Error fetching connection status:', res.statusText);
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      console.error('Error fetching connection status:', err);
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
    const interval = setInterval(fetchConnectionStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (connectionStatus === null) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <h2>Checking connection...</h2>
      </div>
    );
  }

  if (connectionStatus !== 'connected') {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <h2>Waiting for connection...</h2>
        <img src="/logo192.pong" alt="Waiting for connection" />
      </div>
    );
  }

  return (
    <Router>
      {alertMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#fffae6',
          borderBottom: '1px solid #f5c518',
          color: '#333',
          padding: '0.75rem',
          textAlign: 'center',
          fontWeight: 'bold',
          zIndex: 1000
        }}>
          {alertMessage}
        </div>
      )}
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="/wifi" element={<Wifi />} />
      </Routes>
    </Router>
  );
}

export default App;