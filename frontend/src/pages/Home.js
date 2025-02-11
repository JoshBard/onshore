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
      fetchData(); // Keep fetching data every 5 seconds
    }, 5000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  /** Handle CSV Clear */
  const handleClearCsv = async () => {
    try {
      await axios.post(`${BASE_URL}/clear_location_csv`);
      setPoints([]); // Clear points on the frontend as well
      console.log('CSV cleared');
    } catch (error) {
      console.error('Error clearing CSV:', error);
    }
  };

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
          icon={{
            url: idx === points.length - 1 
              ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'  // Green for last point
              : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',  // Default (red) for others
          }}
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

  return (
    <div style={{ margin: '20px' }}>
      <h1>Location Tracker</h1>

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
          zoom={10} // Use a fixed zoom level (no centering logic)
        >
          {renderMarkers()}
        </GoogleMap>
      </LoadScript>

      {/* Download & Clear Controls */}
      <div style={{ marginTop: '2rem' }}>
        <a href={`${BASE_URL}/download_location`} download>
          <button>Download CSV</button>
        </a>
        <button onClick={handleClearCsv} style={{ marginLeft: '10px' }}>
          Clear CSV
        </button>
      </div>
    </div>
  );
}

export default Home;
