import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

// Adjust BASE_URL if hosting on Raspberry Pi: 'http://192.168.4.1:4000'
const BASE_URL = 'http://localhost:4000';

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

// Example map center (Boston)
const center = { lat: 42.34920513249211, lng: -71.10594229179111 };

function MapPage() {
  const [mapKey, setMapKey] = useState(null);
  const [waypoint, setWaypoint] = useState(null);

  // Fetch Google Maps API key from server
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/mapkey`);
        setMapKey(response.data.key);
      } catch (error) {
        console.error('Error fetching Maps API key:', error);
      }
    };
    fetchKey();
  }, []);

  // Handle map click to set a single waypoint
  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setWaypoint({ lat, lng });
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

  if (!mapKey) {
    return (
      <div style={{ margin: '20px' }}>
        <h2>Map Page</h2>
        <p>Loading Google Maps key...</p>
        <Link to="/">
          <button>Back</button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px' }}>
      <h2>Map Page</h2>
      <Link to="/">
        <button>Back</button>
      </Link>

      <LoadScript googleMapsApiKey={mapKey}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={8}
          onClick={handleMapClick}
        >
          {waypoint && (
            <Marker
              position={{ lat: waypoint.lat, lng: waypoint.lng }}
              icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
            />
          )}
        </GoogleMap>
      </LoadScript>

      <div style={{ marginTop: '1rem' }}>
        <h3>Selected Waypoint</h3>
        {waypoint ? (
          <p>
            Lat: {waypoint.lat}, Lng: {waypoint.lng}
          </p>
        ) : (
          <p>No waypoint selected.</p>
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

export default MapPage;
