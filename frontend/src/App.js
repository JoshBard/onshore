import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

// Example center (Boston)
const center = {
  lat: 42.34920513249211,
  lng: -71.10594229179111,
};

// Toggle or edit these URLs as needed
// By default, we'll use localhost for local development.
const BASE_URL = 'http://localhost:4000';
// For Raspberry Pi hosting, comment the above and uncomment below:
// const BASE_URL = 'http://192.168.4.1:4000';

function App() {
  const [mapKey, setMapKey] = useState(null);
  const [waypoint, setWaypoint] = useState(null);

  // 1) Fetch the API key from server.js
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

  // 2) Handle map click to set a single waypoint
  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setWaypoint({ lat, lng });
  };

  // 3) Clear the CSV file on the server
  const handleClearCsv = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/clear`);
      alert(response.data); // e.g. "File cleared successfully."
    } catch (error) {
      console.error('Error clearing CSV:', error);
      alert('Failed to clear CSV');
    }
  };

  // If we haven't retrieved the key yet, just wait
  if (!mapKey) {
    return <div>Loading Google Maps key...</div>;
  }

  return (
    <div style={{ fontFamily: 'sans-serif', margin: '20px' }}>
      <h1>My Prototype Website</h1>

      {/* Load the map using the fetched API key */}
      <LoadScript googleMapsApiKey={mapKey}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={10}
          onClick={handleMapClick}
        >
          {/* If a waypoint is set, show a marker */}
          {waypoint && (
            <Marker
              position={{ lat: waypoint.lat, lng: waypoint.lng }}
              icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
            />
          )}
        </GoogleMap>
      </LoadScript>

      <div style={{ marginTop: '20px' }}>
        {/* Download data.csv */}
        <a href={`${BASE_URL}/download`} download>
          <button>Download CSV</button>
        </a>

        {/* Clear data.csv */}
        <button onClick={handleClearCsv} style={{ marginLeft: '10px' }}>
          Clear CSV
        </button>
      </div>
    </div>
  );
}

export default App;
