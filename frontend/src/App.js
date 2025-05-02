import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';

// Your page components
import Home       from './pages/Home';
import UploadPage from './pages/UploadPage';
import MapPage    from './pages/MapPage';
import Manual     from './pages/Manual';
import Wifi       from './pages/Wifi';

// Header (optional)
import Header     from './components/Header';

function App() {
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    // explicitly point to your server if needed:
    const socket = io('http://localhost:3000');

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('alert', msg => {
      console.log('Received alert:', msg);
      setAlertMessage(msg);
      // clear after 5s:
      setTimeout(() => setAlertMessage(''), 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Router>
      {/* Test banner always shows when alertMessage is set */}
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

      {/* Your normal app chrome */}
      <Header />

      <div style={{ paddingTop: alertMessage ? '3rem' : 0 }}>
        <Routes>
          <Route path="/"       element={<Home />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/map"    element={<MapPage />} />
          <Route path="/manual" element={<Manual />} />
          <Route path="/wifi"   element={<Wifi />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
