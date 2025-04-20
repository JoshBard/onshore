import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io()

const ManualControl = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [lastCommand, setLastCommand] = useState('');

  useEffect(() => {
    const handleKeyDown = (event) => {
      let command = null;
      switch (event.key) {
        case 'w':
          command = 'FORWARD';
          break;
        case 'a':
          command = 'LEFT';
          break;
        case 's':
          command = 'BACKWARD';
          break;
        case 'd':
          command = 'RIGHT';
          break;
        case ' ':
          command = 'STOP';
          break;
        default:
          return;
      }

      // Send command via WebSocket
      socket.emit('keypress', command);

      // Show acknowledgement
      setLastCommand(command);
      setTimeout(() => setLastCommand(''), 500); // clear after 0.5s
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Function to start manual mode
  const startManualMode = async () => {
    try {
      await axios.post(`/start_manual`);
    } catch (error) {
      console.error('Error starting manual mode:', error);
    }
  };

  // Function to stop manual mode
  const stopManualMode = async () => {
    try {
      await axios.post(`/stop_manual`);
    } catch (error) {
      console.error('Error stopping manual mode:', error);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', position: 'relative' }}>
      <h1>Emergency Control</h1>
      <p>Press WASD to send movement commands in real-time.</p>

      {/* Main Controls Row */}
      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <button
          onClick={startManualMode}
          style={{ marginRight: '10px', padding: '10px', fontSize: '16px' }}
        >
          Start Manual Mode
        </button>
        <button
          onClick={stopManualMode}
          style={{ padding: '10px', fontSize: '16px' }}
        >
          Stop Manual Mode
        </button>
        <button
          onClick={() => setShowOverlay(true)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
        >
          ℹ️
        </button>
      </div>

      {/* Acknowledgement Toast */}
      {lastCommand && (
        <div
          style={{
            position: 'fixed',
            top: '150px',              // closer to the buttons
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '18px',          // larger text
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          {lastCommand} sent
        </div>
      )}

      {/* Overlay for Information */}
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
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '4px',
              textAlign: 'left',
              maxWidth: '90%'
            }}
          >
            <ol>
              <li>For WASD control, do not hold continuously, these are discrete step calls.</li>
              <li>Manual instructions can take up to two seconds to take effect, so be patient before calling repeatedly.</li>
              <li>W &amp; S control throttle, there are five levels of motor power.
                <div style={{textAlign: 'center', marginTop: '2px', marginBottom: '2px', fontStyle: 'italic'}}>
                  -- Forward fast, forward slow, stopped, backward slow, backward fast --
                </div>
              </li>
              <li>A &amp; D control the rudder, there are nine angles of articulation that you can use.</li>
              <li>Spacebar returns both throttle and rudder to default, e.g. stopped and center aligned.</li>
              <li>Start manual is equivalent to stop mission, called when transitioning from auto to manual.</li>
              <li>Stop manual is equivalent to resume, called when transitioning from manual to auto.
                <div style={{textAlign: 'center', marginTop: '2px', marginBottom: '2px', fontStyle: 'italic'}}>
                    -- This will not start a mission, only resume! --
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualControl;
