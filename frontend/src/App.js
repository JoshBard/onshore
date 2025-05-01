// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';

import Home       from './pages/Home';
import UploadPage from './pages/UploadPage';
import MapPage    from './pages/MapPage';
import Manual     from './pages/Manual';
import Wifi       from './pages/Wifi';
import Header     from './components/Header';

function App() {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [alertMessage, setAlertMessage]         = useState('');

  // 1) Socket-IO setup
  useEffect(() => {
    const socket = io('http://localhost:3000');
    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('alert', msg => {
      console.log('Received alert:', msg);
      setAlertMessage(String(msg));
      setTimeout(() => setAlertMessage(''), 5000);
    });
    return () => { socket.disconnect(); };
  }, []);

  // 2) Poll connection status
  const fetchConnectionStatus = async () => {
    try {
      const res  = await fetch('/api/connection_status');
      if (!res.ok) throw new Error(res.statusText);
      const { status } = await res.json();
      setConnectionStatus(status);
    } catch {
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
    const id = setInterval(fetchConnectionStatus, 10000);
    return () => clearInterval(id);
  }, []);

  // 3) Always render banner at the very top
  const Banner = () => (
    <div
      style={{
        position:    'fixed',
        top:         0,
        left:        0,
        right:       0,
        background:  '#fffae6',
        borderBottom:'1px solid #f5c518',
        color:       '#333',
        padding:     '0.75rem',
        textAlign:   'center',
        fontWeight:  'bold',
        zIndex:      9999,
        whiteSpace:  'pre-wrap',
        overflowWrap:'break-word',
      }}
    >
      {alertMessage}
    </div>
  );

  // 4) Loading / waiting screens
  if (connectionStatus === null) {
    return (
      <>
        {alertMessage && <Banner />}
        <div style={{ textAlign:'center', marginTop:'2rem' }}>
          <h2>Checking connection...</h2>
        </div>
      </>
    );
  }

  if (connectionStatus !== 'connected') {
    return (
      <>
        {alertMessage && <Banner />}
        <div style={{ textAlign:'center', marginTop:'2rem' }}>
          <h2>Waiting for connection...</h2>
          <img src="/offline.png" alt="Waiting for connection" />
        </div>
      </>
    );
  }

  // 5) Main app once connected
  return (
    <>
      {alertMessage && <Banner />}
      <Router>
        {/* push content down so Banner doesn’t overlap Header */}
        <div style={{ paddingTop: alertMessage ? '3rem' : 0 }}>
          <Header />
          <Routes>
            <Route path="/"       element={<Home />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/map"    element={<MapPage />} />
            <Route path="/manual" element={<Manual />} />
            <Route path="/wifi"   element={<Wifi />} />
          </Routes>
        </div>
      </Router>
    </>
  );
}

export default App;
