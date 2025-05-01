// src/components/MapPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const center = { lat: 42.34920513249211, lng: -71.10594229179111 };

export default function MapPage() {
  const [mapKey, setMapKey] = useState(null);
  const [waypoints, setWaypoints] = useState([]);

  // press feedback handlers + shared transition style
  const handlePress = e => { e.currentTarget.style.transform = 'scale(0.97)'; };
  const handleRelease = e => { e.currentTarget.style.transform = 'scale(1)'; };
  const btnBase = {
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  };

  // Fetch Google Maps API key from server
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const { data } = await axios.get('/api/mapkey');
        setMapKey(data.key);
      } catch (error) {
        console.error('Error fetching Maps API key:', error);
      }
    };
    fetchKey();
  }, []);

  const handleMapClick = e => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setWaypoints(prev => [...prev, { lat, lng }]);
  };

  const handleClearCsv = async () => {
    try {
      const { data } = await axios.post('/clear_waypoints_csv');
      alert(data);
    } catch (error) {
      console.error('Error clearing CSV:', error);
      alert('Failed to clear CSV');
    }
  };

  const handleUploadCoordinates = async () => {
    try {
      const upload = await axios.post('/uploadWaypoints', { waypoints });
      alert(upload.data.message);
      const send = await axios.post('/sendWaypoints');
      alert(send.data.message);
    } catch (error) {
      console.error('Error uploading waypoints:', error);
      alert('Failed to upload waypoints.');
    }
  };

  const handleClearTable = () => setWaypoints([]);

  if (!mapKey) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <h2>Select Your Course</h2>
        <p>Loading Google Maps key…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1rem',
        boxSizing: 'border-box',
        minHeight: '100vh',
        background: '#f9f9f9',
      }}
    >
      <h2 style={{ textAlign: 'center' }}>Select Your Course</h2>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        {/* Left Column: Map & Controls */}
        <div style={{ flex: '2 1 300px', boxSizing: 'border-box' }}>
          <div
            style={{
              width: '100%',
              height: '50vh',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <LoadScript googleMapsApiKey={mapKey}>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={center}
                zoom={8}
                onClick={handleMapClick}
              >
                {waypoints.map((point, idx) => (
                  <Marker
                    key={idx}
                    position={{ lat: point.lat, lng: point.lng }}
                    icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                  />
                ))}
              </GoogleMap>
            </LoadScript>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
            }}
          >
            <a href="/download_waypoints" download style={{ flex: '1 1 auto' }}>
              <button
                onMouseDown={handlePress}
                onMouseUp={handleRelease}
                onMouseLeave={handleRelease}
                onTouchStart={handlePress}
                onTouchEnd={handleRelease}
                style={{ ...btnBase, width: '100%', padding: '0.75rem' }}
              >
                Download Coordinates
              </button>
            </a>
            <button
              onMouseDown={handlePress}
              onMouseUp={handleRelease}
              onMouseLeave={handleRelease}
              onTouchStart={handlePress}
              onTouchEnd={handleRelease}
              onClick={handleClearCsv}
              style={{ ...btnBase, flex: '1 1 auto', padding: '0.75rem' }}
            >
              Clear Onboard
            </button>
            <button
              onMouseDown={handlePress}
              onMouseUp={handleRelease}
              onMouseLeave={handleRelease}
              onTouchStart={handlePress}
              onTouchEnd={handleRelease}
              onClick={handleUploadCoordinates}
              style={{ ...btnBase, flex: '1 1 auto', padding: '0.75rem' }}
            >
              Upload Coordinates
            </button>
            <button
              onMouseDown={handlePress}
              onMouseUp={handleRelease}
              onMouseLeave={handleRelease}
              onTouchStart={handlePress}
              onTouchEnd={handleRelease}
              onClick={handleClearTable}
              style={{ ...btnBase, flex: '1 1 auto', padding: '0.75rem' }}
            >
              Clear Table
            </button>
          </div>
        </div>

        {/* Right Column: Waypoints Table */}
        <div
          style={{
            flex: '1 1 300px',
            boxSizing: 'border-box',
            overflowX: 'auto',
          }}
        >
          <h3 style={{ textAlign: 'center' }}>Selected Waypoints</h3>
          {waypoints.length > 0 ? (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#fff',
              }}
            >
              <thead>
                <tr>
                  <th style={{ padding: '8px', border: '1px solid #ccc' }}>No.</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc' }}>Latitude</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc' }}>Longitude</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {waypoints.map((pt, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', padding: '8px', border: '1px solid #ccc' }}>
                      {idx === 0 ? 'Launch' : idx === waypoints.length - 1 ? 'Return' : idx + 1}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>{pt.lat}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>{pt.lng}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'center' }}>
                      <button
                        onMouseDown={handlePress}
                        onMouseUp={handleRelease}
                        onMouseLeave={handleRelease}
                        onTouchStart={handlePress}
                        onTouchEnd={handleRelease}
                        onClick={() => {
                          const arr = [...waypoints];
                          arr.splice(idx, 1);
                          setWaypoints(arr);
                        }}
                        style={{ ...btnBase }}
                      >
                        Delete
                      </button>
                      <button
                        onMouseDown={handlePress}
                        onMouseUp={handleRelease}
                        onMouseLeave={handleRelease}
                        onTouchStart={handlePress}
                        onTouchEnd={handleRelease}
                        onClick={() => {
                          if (idx === 0) return;
                          const arr = [...waypoints];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          setWaypoints(arr);
                        }}
                        disabled={idx === 0}
                        style={{ ...btnBase, marginLeft: '4px' }}
                      >
                        ↑
                      </button>
                      <button
                        onMouseDown={handlePress}
                        onMouseUp={handleRelease}
                        onMouseLeave={handleRelease}
                        onTouchStart={handlePress}
                        onTouchEnd={handleRelease}
                        onClick={() => {
                          if (idx === waypoints.length - 1) return;
                          const arr = [...waypoints];
                          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                          setWaypoints(arr);
                        }}
                        disabled={idx === waypoints.length - 1}
                        style={{ ...btnBase, marginLeft: '4px' }}
                      >
                        ↓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', marginTop: '1rem' }}>
              No waypoints selected.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
