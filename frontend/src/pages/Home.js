// src/pages/Home.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';

const mapCenter = { lat: 41.55, lng: -71.4 };
// use a viewport-relative height so it shrinks on phones
const mapContainerStyle = {
  width: '100%',
  height: '50vh',
};

function Home() {
  const [points, setPoints] = useState([]);
  const [missionStatus, setMissionStatus] = useState(null);
  const [vesselTypeValue, setVesselTypeValue] = useState(0); // 0: Motor Boat; 1: Sailboat.
  const [showAdditionalControls, setShowAdditionalControls] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [mapApiKey, setMapApiKey] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);

  // button press handlers + shared transition style
  const handlePress = (e) => { e.currentTarget.style.transform = 'scale(0.97)'; };
  const handleRelease = (e) => { e.currentTarget.style.transform = 'scale(1)'; };
  const btnBase = {
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  };

  // fetch latest points every 5s
  const fetchData = async () => {
    try {
      const { data } = await axios.get('/points');
      if (Array.isArray(data)) setPoints(data);
      else console.error('Invalid telemetry data format:', data);
    } catch (err) {
      console.error('Error fetching telemetry data:', err);
    }
  };

  const fetchMapKey = async () => {
    try {
      const { data } = await axios.get('/api/mapkey');
      setMapApiKey(data.key);
    } catch (err) {
      console.error('Error fetching Google Maps API key:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMapKey();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  const handleClearCsv = async () => {
    try {
      await axios.post('/clear_telemetry_csv');
      setPoints([]);
    } catch (err) {
      console.error('Error clearing telemetry CSV:', err);
    }
  };

  const handleStartMission = async () => {
    try {
      await axios.post('/start_mission');
      setMissionStatus('running');
    } catch (err) {
      console.error('Error starting mission:', err);
    }
  };

  const handleResumeMission = async () => {
    try {
      await axios.post('/resume_mission');
      setMissionStatus('running');
    } catch (err) {
      console.error('Error resuming mission:', err);
    }
  };

  const handleStopMission = async () => {
    try {
      await axios.post('/stop_mission');
      setMissionStatus('stopped');
    } catch (err) {
      console.error('Error stopping mission:', err);
    }
  };

  const handleArm = async () => {
    try {
      await axios.post('/arm');
    } catch (err) {
      console.error('Error arming system:', err);
    }
  };

  const handleDisarm = async () => {
    try {
      await axios.post('/disarm');
    } catch (err) {
      console.error('Error disarming system:', err);
    }
  };

  const handleReturnHome = async () => {
    try {
      await axios.post('/rtl');
    } catch (err) {
      console.error('Error returning to home:', err);
    }
  };

  // simple click—no highlight
  const handleSetVesselType = async (value) => {
    setVesselTypeValue(value);
    try {
      const endpoint = value === 0 ? 'motor_boat' : 'sailboat';
      await axios.post(`/${endpoint}`);
    } catch (err) {
      console.error('Error toggling vessel type:', err);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        margin: '20px',
        gap: '20px',
      }}
    >
      <div style={{ flex: '2 1 300px', minWidth: '300px' }}>
        <h1>Telemetry Tracker</h1>
        {mapApiKey && (
          <LoadScript googleMapsApiKey={mapApiKey}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={10}
            >
              {points.slice(-25).map((pt, i, arr) => (
                <Marker
                  key={i}
                  position={{ lat: pt.LAT, lng: pt.LON }}
                  icon={{
                    url:
                      i === arr.length - 1
                        ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                        : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  }}
                  onClick={() => setSelectedMarker({ i, pt })}
                />
              ))}
              {selectedMarker && (
                <InfoWindow
                  position={{
                    lat: selectedMarker.pt.LAT,
                    lng: selectedMarker.pt.LON,
                  }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div>
                    <b>
                      Waypoint {points.length - 25 + selectedMarker.i + 1}
                    </b>
                    <br />
                    Lat: {selectedMarker.pt.LAT}, Lng:{' '}
                    {selectedMarker.pt.LON}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        )}

        {/* Main Mission Controls */}
        <div
          style={{
            marginTop: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          <button
            onMouseDown={handlePress}
            onMouseUp={handleRelease}
            onMouseLeave={handleRelease}
            onClick={handleStartMission}
            style={{
              ...btnBase,
              padding: '12px',
              backgroundColor: '#007bff',
              color: '#fff',
              flex: '1 1 120px',
            }}
          >
            Start Mission
          </button>
          <button
            onMouseDown={handlePress}
            onMouseUp={handleRelease}
            onMouseLeave={handleRelease}
            onClick={handleStopMission}
            style={{
              ...btnBase,
              padding: '12px',
              backgroundColor: '#dc3545',
              color: '#fff',
              flex: '1 1 120px',
            }}
          >
            Stop Mission
          </button>
          <button
            onMouseDown={handlePress}
            onMouseUp={handleRelease}
            onMouseLeave={handleRelease}
            onClick={handleResumeMission}
            style={{
              ...btnBase,
              padding: '12px',
              backgroundColor: '#17a2b8',
              color: '#fff',
              flex: '1 1 120px',
            }}
          >
            Resume Mission
          </button>
          <button
            onMouseDown={handlePress}
            onMouseUp={handleRelease}
            onMouseLeave={handleRelease}
            onClick={() => setShowAdditionalControls(!showAdditionalControls)}
            style={{
              ...btnBase,
              padding: '12px',
              backgroundColor: '#6c757d',
              color: '#fff',
              flex: '1 1 160px',
            }}
          >
            {showAdditionalControls
              ? 'Hide Additional Controls'
              : 'Show Additional Controls'}
          </button>
          <button
            onMouseDown={handlePress}
            onMouseUp={handleRelease}
            onMouseLeave={handleRelease}
            onClick={() => setShowOverlay(true)}
            style={{
              ...btnBase,
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              flex: '0 0 auto',
            }}
          >
            ℹ️
          </button>
        </div>

        {showAdditionalControls && (
          <div style={{ marginTop: '1rem', padding: '10px', border: '1px solid #ccc' }}>
            <h3>Additional Controls</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <button
                onMouseDown={handlePress}
                onMouseUp={handleRelease}
                onMouseLeave={handleRelease}
                onClick={() => handleSetVesselType(0)}
                style={{
                  ...btnBase,
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                }}
              >
                Motor Boat
              </button>
              <button
                onMouseDown={handlePress}
                onMouseUp={handleRelease}
                onMouseLeave={handleRelease}
                onClick={() => handleSetVesselType(1)}
                style={{
                  ...btnBase,
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                }}
              >
                Sailboat
              </button>
              <button
                onMouseDown={handlePress}
                onMouseUp={handleRelease}
                onMouseLeave={handleRelease}
                onClick={handleReturnHome}
                style={{
                  ...btnBase,
                  padding: '12px',
                  backgroundColor: '#ffc107',
                  color: '#fff',
                  flex: '1 1 120px',
                }}
              >
                Return to Home
              </button>
              <button
                onMouseDown={handlePress}
                onMouseUp={handleRelease}
                onMouseLeave={handleRelease}
                onClick={handleArm}
                style={{
                  ...btnBase,
                  padding: '12px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  flex: '1 1 120px',
                }}
              >
                Arm
              </button>
              <button
                onMouseDown={handlePress}
                onMouseUp={handleRelease}
                onMouseLeave={handleRelease}
                onClick={handleDisarm}
                style={{
                  ...btnBase,
                  padding: '12px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  flex: '1 1 120px',
                }}
              >
                Disarm
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Side: Table + CSV Buttons */}
      <div style={{ flex: '1 1 250px', minWidth: '250px', border: '1px solid #ccc', padding: '10px', display: 'flex', flexDirection: 'column' }}>
        <h2>Live Location</h2>
        <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid black', padding: '5px' }}>#</th>
                <th style={{ border: '1px solid black', padding: '5px' }}>Timestamp</th>
                <th style={{ border: '1px solid black', padding: '5px' }}>Latitude</th>
                <th style={{ border: '1px solid black', padding: '5px' }}>Longitude</th>
              </tr>
            </thead>
            <tbody>
              {points.length > 0 ? (
                points.slice().reverse().map((pt, idx) => {
                  const originalIndex = points.length - 1 - idx;
                  return (
                    <tr key={idx}>
                      <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>{originalIndex + 1}</td>
                      <td style={{ border: '1px solid black', padding: '5px' }}>{pt.timestamp}</td>
                      <td style={{ border: '1px solid black', padding: '5px' }}>{pt.LAT}</td>
                      <td style={{ border: '1px solid black', padding: '5px' }}>{pt.LON}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '10px' }}>
                    No telemetry data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href="/download_telemetry" download style={{ flex: '1 1 auto' }}>
            <button
              onMouseDown={handlePress}
              onMouseUp={handleRelease}
              onMouseLeave={handleRelease}
              style={{ ...btnBase, width: '100%', padding: '8px' }}
            >
              Download Telemetry
            </button>
          </a>
          <button
            onMouseDown={handlePress}
            onMouseUp={handleRelease}
            onMouseLeave={handleRelease}
            onClick={handleClearCsv}
            style={{ ...btnBase, flex: '1 1 auto', padding: '8px' }}
          >
            Clear Telemetry
          </button>
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <h3>Status</h3>
          {points.length > 0 ? (
            (() => {
              const lastEntry = points[points.length - 1];
              const { sensor_data, LAT, LON, ...displayData } = lastEntry;
              return (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(displayData).map(([key, value], i) => (
                      <tr key={i}>
                        <td style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold' }}>{key}</td>
                        <td style={{ border: '1px solid black', padding: '5px' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()
          ) : (
            <p>No telemetry details available</p>
          )}
        </div>
      </div>

      {/* Overlay for Info */}
      {showOverlay && (
        <div
          onClick={() => setShowOverlay(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ background: '#fff', padding: '20px', borderRadius: '4px', maxWidth: '100%' }}>
            <ol>
              <li>Start Mission should be called when you first set out, waypoints must be uploaded first and GPS must be locked.</li>
              <li>Stop Mission should be called in case you are at the end of the mission or when switching to manual mode.</li>
              <li>Resume Mission should only be called when exiting manual mode.
                <div style={{ textAlign: 'center', marginTop: '2px', marginBottom: '2px', fontStyle: 'italic' }}>
                  -- Stop and resume mission are also on the manual tab, no need to use twice. --
                </div>
              </li>
              <li>Arm & Disarm are automatically handled when starting/stopping the mission but can be used if needed.</li>
              <li>Motorboat mode turns off the wing elevator actuator and turns on the motor (use in AUTO mode).</li>
              <li>Sailboat mode turns off the motor and turns on the wing elevator actuator (use in AUTO mode).</li>
              <li>Return to home is an emergency setting and returns you to the place where a GPS was first achieved.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
