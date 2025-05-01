// src/App.jsx
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
import Header from './components/Header';

function App() {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [alertMessage, setAlertMessage]       = useState('');

  // Listen for backend "alert" events and show a non-blocking banner
  useEffect(() => {
    const socket = io();
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });
    socket.on('alert', msg => {
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
        setConnectionStatus('disconnected');
      }
    } catch {
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
    const interval = setInterval(fetchConnectionStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // centered full-screen loading / waiting states, mobile-friendly
  const FullScreenMessage = ({ message, imgSrc }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      <h2 style={{ marginBottom: '1rem' }}>{message}</h2>
      {imgSrc && (
        <img
          src={imgSrc}
          alt="status"
          style={{ maxWidth: '80%', height: 'auto' }}
        />
      )}
    </div>
  );

  if (connectionStatus === null) {
    return <FullScreenMessage message="Checking connection..." />;
  }

  if (connectionStatus !== 'connected') {
    return (
      <FullScreenMessage
        message="Waiting for connection..."
        imgSrc="/logo192.pong"
      />
    );
  }

  return (
    <Router>
      {/* alert banner */}
      {alertMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: '#fffae6',
            borderBottom: '1px solid #f5c518',
            color: '#333',
            padding: '1rem',
            fontSize: '1rem',
            textAlign: 'center',
            zIndex: 1000,
            wordBreak: 'break-word',
          }}
        >
          {alertMessage}
        </div>
      )}

      {/* header */}
      <Header />

      {/* main content */}
      <main
        style={{
          paddingTop: alertMessage ? '4rem' : '1rem',
          paddingBottom: '1rem',
          boxSizing: 'border-box',
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/manual" element={<Manual />} />
          <Route path="/wifi" element={<Wifi />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
