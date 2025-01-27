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

function Home() {
  const [mapKey, setMapKey] = useState(null);
  const [points, setPoints] = useState([]);

  /** Fetch Google Maps API Key (Run only once) */
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

    fetchMapKey(); // Call once on component mount
  }, []);

  /** Fetch Data Points (Refreshes every 5 seconds) */
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
    fetchData(); // Initial fetch

    const interval = setInterval(() => {
      fetchData();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  /** Render Markers from Waypoints */
  const renderMarkers = () => {
    if (!points || points.length === 0) return null;

    console.log('Rendering waypoints:', points);
    return points.map((pt, idx) => {
      if (!pt.lat || !pt.lng) {
        console.warn("Skipping invalid waypoint:", pt);
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

  // Show loading message if API key isn't ready yet
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
      </div>
    );
  }

  // Render the map with waypoints dynamically updating every 5 seconds
  return (
    <div style={{ margin: '20px' }}>
      <h1>Home - Showing Waypoints from data.csv</h1>

      <div style={{ marginBottom: '10px' }}>
        <Link to="/upload">
          <button>Go to Upload Page</button>
        </Link>
        <Link to="/map" style={{ marginLeft: '10px' }}>
          <button>Go to Map Page</button>
        </Link>
      </div>

      <LoadScript googleMapsApiKey={mapKey}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={10}
        >
          {renderMarkers()}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}

export default Home;