import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your page components
import Home from './pages/Home';
import UploadPage from './pages/UploadPage';
import MapPage from './pages/MapPage';
import Manual from './pages/Manual';

// Import the Header component
import Header from './components/Header';

function App() {
  return (
    <Router>
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
