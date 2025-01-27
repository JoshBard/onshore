import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const BASE_URL = 'http://localhost:4000'; 
// If hosting on Pi: const BASE_URL = 'http://192.168.4.1:4000';

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

// Center the map near Narragansett Bay
const mapCenter = { lat: 41.55, lng: -71.4 };

function ViewLocation() {
  const [mapKey, setMapKey] = useState(null);
  const [points, setPoints] = useState([]);

  // Function to fetch Google Maps key and CSV waypoints
  const fetchData = async () => {
    try {
      // Retrieve Maps API key
      const keyResponse = await axios.get(`${BASE_URL}/api/mapkey`);
      setMapKey(keyResponse.data.key);

      // Retrieve waypoint data from /points
      const pointsResponse = await axios.get(`${BASE_URL}/points`);
      console.log("Fetched Points Data:", pointsResponse.data);

      if (Array.isArray(pointsResponse.data)) {
        setPoints(pointsResponse.data);
      } else {
        console.error("Invalid points data received:", pointsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching key or points:', error);
    }
  };

  // Fetch data every 5 seconds
  useEffect(() => {
    fetchData(); // Initial fetch

    const interval = setInterval(() => {
      fetchData();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // Render markers for each point from the server
  const renderMarkers = () => {
    if (!points || points.length === 0) return null;

    console.log('Rendering CSV waypoints:', points);
    return points.map((pt, idx) => {
      if (!pt.lat || !pt.lng) {
        console.warn("Invalid waypoint skipped:", pt);
        return null;
      }
      return (
        <Marker
          key={idx}
          position={{ lat: Number(pt.lat), lng: Number(pt.lng) }}
        />
      );
    });
  };

  // If we haven't loaded the key yet, show a loading message
  if (!mapKey) {
    return (
      <div style={{ margin: '20px' }}>
        <h1>View Location</h1>
        <p>Loading Google Maps key and points...</p>
        <Link to="/">
          <button>Go to Home</button>
        </Link>
      </div>
    );
  }

  // Render the map with waypoints dynamically updating every 5 seconds
  return (
    <div style={{ margin: '20px' }}>
      <h1>View Location - Waypoints from CSV</h1>

      <div style={{ marginBottom: '10px' }}>
        <Link to="/">
          <button>Go to Home</button>
        </Link>
      </div>

      <LoadScript googleMapsApiKey={mapKey}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={10}
        >
          {/* Hard-coded marker for debugging */}
          <Marker position={{ lat: 41.55, lng: -71.45 }} />

          {/* Dynamically render CSV waypoints */}
          {renderMarkers()}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}

export default ViewLocation;
