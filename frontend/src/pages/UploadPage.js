// src/components/UploadPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // press feedback handlers + shared transition style
  const handlePress = (e) => { e.currentTarget.style.transform = 'scale(0.97)'; };
  const handleRelease = (e) => { e.currentTarget.style.transform = 'scale(1)'; };
  const btnBase = {
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  };

  // Parse and upload a CSV file input
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
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
          await axios.post(`/uploadWaypoints`, { waypoints });
          alert('Waypoints uploaded successfully.');
          await axios.post(`/sendWaypoints`);
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
      const response = await axios.post(`/clear_waypoints_csv`);
      alert(response.data);
    } catch (error) {
      console.error('Error clearing waypoints:', error);
      alert('Failed to clear waypoints.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '1rem',
        boxSizing: 'border-box',
        background: '#f0f2f5',
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          Upload Coordinates File
        </h2>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isUploading}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '1rem',
            boxSizing: 'border-box',
          }}
        />

        <button
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onTouchStart={handlePress}
          onTouchEnd={handleRelease}
          onClick={handleClearCsv}
          disabled={isClearing}
          style={{
            ...btnBase,
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: 'none',
            borderRadius: '4px',
            background: '#dc3545',
            color: '#fff',
            marginBottom: '1rem',
          }}
        >
          {isClearing ? 'Clearing...' : 'Clear Waypoints'}
        </button>

        <Link
          to="/"
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onTouchStart={handlePress}
          onTouchEnd={handleRelease}
          style={{
            ...btnBase,
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#007bff',
            color: '#fff',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '1rem',
          }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
