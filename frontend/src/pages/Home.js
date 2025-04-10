import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';
import './Home.css';

const BASE_URL = process.env.REACT_APP_ROUTER;
const mapCenter = { lat: 41.55, lng: -71.4 };
const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

function Home() {
  const [points, setPoints] = useState([]);
  const [missionStatus, setMissionStatus] = useState(null);
  const [vesselTypeValue, setVesselTypeValue] = useState(0);
  const [showAdditionalControls, setShowAdditionalControls] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [mapApiKey, setMapApiKey] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/points`);
      if (Array.isArray(response.data)) {
        setPoints(response.data);
      } else {
        console.error("Invalid telemetry data format:", response.data);
      }
    } catch (error) {
      console.error('Error fetching telemetry data:', error);
    }
  };

  const fetchMapKey = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/mapkey`);
      setMapApiKey(response.data.key);
    } catch (error) {
      console.error('Error fetching Google Maps API key:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMapKey();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCsv = async () => {
    try {
      await axios.post(`${BASE_URL}/clear_telemetry_csv`);
      setPoints([]);
      console.log('Telemetry CSV cleared');
    } catch (error) {
      console.error('Error clearing telemetry CSV:', error);
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

  const handleResumeMission = async () => {
    try {
      await axios.post(`${BASE_URL}/resume_mission`);
      setMissionStatus('running');
      console.log('Mission resumed');
    } catch (error) {
      console.error('Error resuming mission:', error);
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

  const handleArm = async () => {
    try {
      await axios.post(`${BASE_URL}/arm`);
      console.log('System armed');
    } catch (error) {
      console.error('Error arming system:', error);
    }
  };

  const handleDisarm = async () => {
    try {
      await axios.post(`${BASE_URL}/disarm`);
      console.log('System disarmed');
    } catch (error) {
      console.error('Error disarming system:', error);
    }
  };

  const handleReturnHome = async () => {
    try {
      await axios.post(`${BASE_URL}/rtl`);
      console.log('Returned to Home via /rtl endpoint');
    } catch (error) {
      console.error('Error returning to home:', error);
    }
  };

  const handleVesselTypeSlider = async (e) => {
    const newValue = parseInt(e.target.value, 10);
    setVesselTypeValue(newValue);
    try {
      if (newValue === 0) {
        await axios.post(`${BASE_URL}/motor_boat`);
        console.log("Motor Boat selected");
      } else {
        await axios.post(`${BASE_URL}/sailboat`);
        console.log("Sailboat selected");
      }
    } catch (error) {
      console.error("Error toggling vessel type:", error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', margin: '20px' }}>
      <div style={{ flex: 2, marginRight: '20px' }}>
        <h1>Telemetry Tracker</h1>
        {mapApiKey && (
          <LoadScript googleMapsApiKey={mapApiKey}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={10}
            >
              {points.slice(-25).map((pt, idx, arr) => (
                <Marker
                  key={idx}
                  position={{ lat: pt.LAT, lng: pt.LON }}
                  icon={{
                    url: idx === arr.length - 1
                      ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                      : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  }}
                  onClick={() => setSelectedMarker({ idx, pt })}
                />
              ))}
              {selectedMarker && (
                <InfoWindow
                  position={{ lat: selectedMarker.pt.LAT, lng: selectedMarker.pt.LON }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div>
                    <b>Waypoint {points.length - 25 + selectedMarker.idx + 1}</b><br />
                    Lat: {selectedMarker.pt.LAT}, Lng: {selectedMarker.pt.LON}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleStartMission} className="interactive-button" style={{ padding: '12px', backgroundColor: '#007bff', color: 'white' }}>
            Start Mission
          </button>
          <button onClick={handleStopMission} className="interactive-button" style={{ padding: '12px', backgroundColor: '#dc3545', color: 'white' }}>
            Stop Mission
          </button>
          <button onClick={handleResumeMission} className="interactive-button" style={{ padding: '12px', backgroundColor: '#17a2b8', color: 'white' }}>
            Resume Mission
          </button>
          <button onClick={() => setShowAdditionalControls(!showAdditionalControls)} className="interactive-button" style={{ padding: '12px', backgroundColor: '#6c757d', color: 'white' }}>
            {showAdditionalControls ? 'Hide Additional Controls' : 'Show Additional Controls'}
          </button>
          <button onClick={() => setShowOverlay(true)} className="interactive-button" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
            ℹ️
          </button>
        </div>

        {showAdditionalControls && (
          <div style={{ marginTop: '1rem', padding: '10px', border: '1px solid #ccc' }}>
            <h3>Additional Controls</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.9rem' }}>Motor Boat</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="1" 
                  value={vesselTypeValue} 
                  onChange={handleVesselTypeSlider} 
                  style={{ width: '100px' }} 
                />
                <span style={{ fontSize: '0.9rem' }}>Sailboat</span>
              </div>
              <button onClick={handleReturnHome} className="interactive-button" style={{ padding: '12px', backgroundColor: '#ffc107', color: 'white' }}>
                Return to Home
              </button>
              <button onClick={handleArm} className="interactive-button" style={{ padding: '12px', backgroundColor: '#28a745', color: 'white' }}>
                Arm
              </button>
              <button onClick={handleDisarm} className="interactive-button" style={{ padding: '12px', backgroundColor: '#6c757d', color: 'white' }}>
                Disarm
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #ccc', padding: '10px' }}>
        <h2>Live Location</h2>
        <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
          {/* table code unchanged */}
        </div>

        <div style={{ marginTop: '10px' }}>
          <a href={`${BASE_URL}/download_telemetry`} download>
            <button className="interactive-button">Download Telemetry</button>
          </a>
          <button onClick={handleClearCsv} className="interactive-button" style={{ marginLeft: '10px' }}>
            Clear Telemetry
          </button>
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          {/* status table unchanged */}
        </div>
      </div>

      {showOverlay && (
        <div 
          onClick={() => setShowOverlay(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div style={{ background: 'white', padding: '20px', borderRadius: '4px' }}>
            {/* info list unchanged */}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
