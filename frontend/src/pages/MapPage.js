import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

// Adjust BASE_URL if needed
const BASE_URL = process.env.REACT_APP_TEST;

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const center = { lat: 42.34920513249211, lng: -71.10594229179111 };

function MapPage() {
  const [mapKey, setMapKey] = useState(null);
  const [waypoints, setWaypoints] = useState([]);

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

  // Add a new waypoint on map click
  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setWaypoints((prevWaypoints) => [...prevWaypoints, { lat, lng }]);
  };

  // Clear the sensor CSV file on the server (if needed)
  const handleClearCsv = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/clear_waypoints_csv`);
      alert(response.data);
    } catch (error) {
      console.error('Error clearing CSV:', error);
      alert('Failed to clear CSV');
    }
  };

  // Upload the current list of waypoints to the server
  const handleUploadCoordinates = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/uploadWaypoints`, { waypoints });
      alert(response.data.message);
    } catch (error) {
      console.error('Error uploading waypoints:', error);
      alert('Failed to upload waypoints.');
    }
  };

  // Clear the table of waypoints in the frontend
  const handleClearTable = () => {
    setWaypoints([]);
  };

  if (!mapKey) {
    return (
      <div style={{ margin: '20px' }}>
        <h2>Select Your Course</h2>
        <p>Loading Google Maps key...</p>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px' }}>
      <h2>Select Your Course</h2>

      <div style={{ display: 'flex', marginTop: '1rem' }}>
        {/* Left Column: Map & Controls */}
        <div style={{ flex: 2, marginRight: '20px' }}>
          {/* Map Container */}
          <div>
            <LoadScript googleMapsApiKey={mapKey}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={8}
                onClick={handleMapClick}
              >
                {waypoints.map((point, index) => (
                  <Marker
                    key={index}
                    position={{ lat: point.lat, lng: point.lng }}
                    icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                  />
                ))}
              </GoogleMap>
            </LoadScript>
          </div>
          {/* Controls just below the map */}
          <div
            style={{
              marginTop: '5px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <a href={`${BASE_URL}/download_waypoints`} download>
              <button>Download Coordinates</button>
            </a>
            <button onClick={handleClearCsv} style={{ marginLeft: '5px' }}>
              Clear Coordinates Onboard
            </button>
            <button onClick={handleUploadCoordinates} style={{ marginLeft: '5px' }}>
              Upload Coordinates
            </button>
            <button onClick={handleClearTable} style={{ marginLeft: '5px' }}>
              Clear Table
            </button>
          </div>
        </div>

        {/* Right Column: Waypoints Table */}
        <div style={{ flex: 1 }}>
          <h3>Selected Waypoints</h3>
          {waypoints.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '8px' }}>No.</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px' }}>Latitude</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px' }}>Longitude</th>
                </tr>
              </thead>
              <tbody>
                {waypoints.map((point, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                      {index + 1}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{point.lat}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{point.lng}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No waypoints selected.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapPage;
