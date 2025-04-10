import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your page components
import Home from './pages/Home';
import UploadPage from './pages/UploadPage';
import MapPage from './pages/MapPage';
import Manual from './pages/Manual';

// Import the Header component and our new GlobalAlert component
import Header from './components/Header';
import GlobalAlert from './components/GlobalAlert';

const BASE_URL = process.env.REACT_APP_ROUTER;

function App() {
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Function to fetch the connection status from the backend
  const fetchConnectionStatus = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/connection_status`);
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data.status);  // expected: "connected" or "disconnected"
      } else {
        console.error('Error fetching connection status:', res.statusText);
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error fetching connection status:', error);
      setConnectionStatus('disconnected');
    }
  };

  // Poll the connection status every 10 seconds
  useEffect(() => {
    fetchConnectionStatus();
    const interval = setInterval(fetchConnectionStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // If still loading, show a simple message.
  if (connectionStatus === null) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <h2>Checking connection...</h2>
      </div>
    );
  }

  // If disconnected, show a waiting screen.
  if (connectionStatus !== 'connected') {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <h2>Waiting for connection...</h2>
        <img src="/logo192.pong" alt="Waiting for connection" />
      </div>
    );
  }

  // Once connected, render the main UI.
  return (
    <Router>
      {/* GlobalAlert listens for alerts and triggers window.alert */}
      <GlobalAlert />
      <Header /> {/* Header displayed on all pages */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/manual" element={<Manual />} />
      </Routes>
    </Router>
  );
}

export default App;
