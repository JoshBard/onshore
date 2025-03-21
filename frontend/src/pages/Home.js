import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const BASE_URL = process.env.REACT_APP_TEST;
const mapCenter = [41.55, -71.4];

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

// Custom marker icons
const redIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const greenIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function Home() {
  const [points, setPoints] = useState([]);
  const [missionStatus, setMissionStatus] = useState(null);

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
    const interval = setInterval(fetchData, 5000);
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

  const handleStartMission = async () => {
    try {
      await axios.post(`${BASE_URL}/start_mission`);
      setMissionStatus('running');
      console.log('Mission started');
    } catch (error) {
      console.error('Error starting mission:', error);
    }
  };

  const handleStopMission = async () => {
    try {
      await axios.post(`${BASE_URL}/stop_mission`);
      setMissionStatus('stopped');
      console.log('Mission stopped');
    } catch (error) {
      console.error('Error stopping mission:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', margin: '20px' }}>
      <div style={{ flex: 2, marginRight: '20px' }}>
        <h1>Location Tracker</h1>

        <MapContainer center={mapCenter} zoom={1} style={mapContainerStyle}>
          {/* Tile Layer - Using local tiles from frontend */}
          <TileLayer url="/map_tiles/{z}/{x}/{y}.png" />

          {/* Render Markers */}
          {points.map((pt, idx) => (
            <Marker 
              key={idx} 
              position={[pt.lat, pt.lng]} 
              icon={idx === points.length - 1 ? greenIcon : redIcon}
            >
              <Popup>
                <b>Waypoint {idx + 1}</b> <br />
                Lat: {pt.lat}, Lng: {pt.lng}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div style={{ marginTop: '2rem' }}>
          <a href={`${BASE_URL}/download_location`} download>
            <button>Download Location CSV</button>
          </a>
          <button onClick={handleClearCsv} style={{ marginLeft: '10px' }}>
            Clear Location CSV
          </button>
        </div>

        {/* Mission Control Buttons */}
        <div style={{ marginTop: '2rem' }}>
          <button onClick={handleStartMission} style={{ marginRight: '10px', backgroundColor: 'green', color: 'white' }}>
            Start Mission
          </button>
          <button onClick={handleStopMission} style={{ backgroundColor: 'red', color: 'white' }}>
            Stop Mission
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
