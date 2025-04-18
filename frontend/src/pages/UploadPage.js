import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const BASE_URL = process.env.REACT_APP_ROUTER;
const PORT = 4000;

function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Parse and upload a CSV file input
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter((line) => line.trim() !== '');
      const waypoints = lines.map((line) => {
        const [latStr, lngStr] = line.split(',').map((part) => part.trim());
        return {
          lat: parseFloat(latStr),
          lng: parseFloat(lngStr),
        };
      });

      if (waypoints.length > 0) {
        setIsUploading(true);
        try {
          await axios.post(`${BASE_URL}:${PORT}/uploadWaypoints`, { waypoints });
          alert('Waypoints uploaded successfully.');
          await axios.post(`${BASE_URL}:${PORT}/sendWaypoints`);
          alert('Waypoints sent successfully.');
        } catch (error) {
          console.error('Error uploading waypoints:', error);
          alert('Failed to upload waypoints.');
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsText(file);
  };

  // Clear waypoints on server
  const handleClearCsv = async () => {
    setIsClearing(true);
    try {
      const response = await axios.post(`${BASE_URL}:${PORT}/clear_waypoints_csv`);
      alert(response.data); // e.g., 'Waypoints cleared successfully.'
    } catch (error) {
      console.error('Error clearing waypoints:', error);
      alert('Failed to clear waypoints.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div style={{ margin: '20px' }}>
      <h2>Upload Coordinates File</h2>
      <input type="file" accept=".csv" onChange={handleFileUpload} disabled={isUploading} style={{ marginRight: '10px' }} />
      <button onClick={handleClearCsv} disabled={isClearing}>
        {isClearing ? 'Clearing...' : 'Clear Waypoints'}
      </button>
    </div>
  );
}

export default UploadPage;
