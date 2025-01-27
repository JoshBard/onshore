import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

// Adjust BASE_URL if hosting on Raspberry Pi: 'http://192.168.4.1:4000'
const BASE_URL = 'http://localhost:4000';

function UploadPage() {
  const [coordinates, setCoordinates] = useState([]);

  // Parse a CSV file input
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      // Split lines, ignoring empty lines
      const lines = text.split('\n').filter((line) => line.trim() !== '');
      const coords = lines.map((line) => {
        const [latStr, lngStr] = line.split(',').map((part) => part.trim());
        return {
          lat: parseFloat(latStr),
          lng: parseFloat(lngStr),
        };
      });
      setCoordinates(coords);
    };
    reader.readAsText(file);
  };

  // Clear CSV file on server
  const handleClearCsv = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/clear`);
      alert(response.data); // e.g. 'File cleared successfully.'
    } catch (error) {
      console.error('Error clearing CSV:', error);
      alert('Failed to clear CSV');
    }
  };

  return (
    <div style={{ margin: '20px' }}>
      <h2>Upload Coordinates File</h2>
      <input type="file" accept=".csv" onChange={handleFileUpload} style={{ marginRight: '10px' }} />
      <Link to="/">
        <button>Back</button>
      </Link>

      <div style={{ marginTop: '1rem' }}>
        <h3>Loaded Coordinates</h3>
        {coordinates.length > 0 ? (
          <ul>
            {coordinates.map((coord, idx) => (
              <li key={idx}>Lat: {coord.lat}, Lng: {coord.lng}</li>
            ))}
          </ul>
        ) : (
          <p>No coordinates loaded.</p>
        )}
      </div>

      {/* Download & Clear Controls */}
      <div style={{ marginTop: '2rem' }}>
        <a href={`${BASE_URL}/download`} download>
          <button>Download CSV</button>
        </a>
        <button onClick={handleClearCsv} style={{ marginLeft: '10px' }}>
          Clear CSV
        </button>
      </div>
    </div>
  );
}

export default UploadPage;
