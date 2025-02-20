import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const BASE_URL = 'http://localhost:4000';

const mapCenter = { lat: 41.55, lng: -71.4 };

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

function Home() {
  const [mapKey, setMapKey] = useState(null);
  const [points, setPoints] = useState([]);

  useEffect(() => {
    const fetchMapKey = async () => {
      try {
        const keyResponse = await axios.get(`${BASE_URL}/api/mapkey`);
        setMapKey(keyResponse.data.key);
        console.log("Google Maps API Key Loaded.");
      } catch (error) {
        console.error('Error fetching Google Maps API key:', error);
      }
    };

    fetchMapKey();
  }, []);

  const fetchData = async () => {
    try {
      const pointsResponse = await axios.get(`${BASE_URL}/points`);
      if (Array.isArray(pointsResponse.data)) {
        setPoints(pointsResponse.data);
      } else {
        console.error("Invalid points data format:", pointsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching waypoints:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleClearCsv = async () => {
    try {
      await axios.post(`${BASE_URL}/clear_location_csv`);
      setPoints([]);
      console.log('CSV cleared');
    } catch (error) {
      console.error('Error clearing CSV:', error);
    }
  };

  const renderMarkers = () => {
    if (!points || points.length === 0) return null;

    return points.map((pt, idx) => {
      if (!pt.lat || !pt.lng) {
        console.warn("Skipping invalid waypoint:", pt);
        return null;
      }
      return (
        <Marker
          key={idx}
          position={{ lat: Number(pt.lat), lng: Number(pt.lng) }}
          icon={{
            url: idx === points.length - 1 
              ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
              : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          }}
        />
      );
    });
  };

  if (!mapKey) {
    return (
      <div style={{ margin: '20px' }}>
        <h1>Home</h1>
        <p>Loading Google Maps...</p>
        <Link to="/upload">
          <button>Go to Upload Page</button>
        </Link>
        <Link to="/map" style={{ marginLeft: '10px' }}>
          <button>Go to Map Page</button>
        </Link>
        <Link to="/manual" style={{ marginLeft: '10px' }}>
          <button>Manual Control Mode</button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', margin: '20px' }}>
      <div style={{ flex: 2, marginRight: '20px' }}>
        <h1>Location Tracker</h1>

        <div style={{ marginBottom: '10px' }}>
          <Link to="/upload">
            <button>Upload Path Coordinates</button>
          </Link>
          <Link to="/map" style={{ marginLeft: '10px' }}>
            <button>Choose Path Coordinates On a Map</button>
          </Link>
          <Link to="/manual" style={{ marginLeft: '10px' }}>
          <button>Manual Control Mode</button>
          </Link>
        </div>

        <LoadScript googleMapsApiKey={mapKey}>
          <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={10}>
            {renderMarkers()}
          </GoogleMap>
        </LoadScript>

        <div style={{ marginTop: '2rem' }}>
          <a href={`${BASE_URL}/download_location`} download>
            <button>Download Location CSV</button>
          </a>
          <button onClick={handleClearCsv} style={{ marginLeft: '10px' }}>
            Clear Location CSV
          </button>
        </div>
      </div>

      {/* Data Table on the Right */}
      <div style={{ flex: 1, maxHeight: '600px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
        <h2>Live Location Readings</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black', padding: '5px' }}>#</th>
              <th style={{ border: '1px solid black', padding: '5px' }}>Latitude</th>
              <th style={{ border: '1px solid black', padding: '5px' }}>Longitude</th>
              <th style={{ border: '1px solid black', padding: '5px' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {points.length > 0 ? (
              points.slice().reverse().map((pt, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>{points.length - idx}</td>
                  <td style={{ border: '1px solid black', padding: '5px' }}>{pt.lat}</td>
                  <td style={{ border: '1px solid black', padding: '5px' }}>{pt.lng}</td>
                  <td style={{ border: '1px solid black', padding: '5px' }}>{pt.timestamp}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '10px' }}>No waypoints available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Home;