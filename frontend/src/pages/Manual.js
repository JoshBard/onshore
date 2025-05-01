// src/components/ManualControl.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io();

const ManualControl = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [lastCommand, setLastCommand] = useState('');

  // centralize sending
  const sendCommand = (command) => {
    socket.emit('keypress', command);
    setLastCommand(command);
    setTimeout(() => setLastCommand(''), 500);
  };

  // press feedback handlers + shared transition style
  const handlePress = (e) => { e.currentTarget.style.transform = 'scale(0.95)'; };
  const handleRelease = (e) => { e.currentTarget.style.transform = 'scale(1)'; };
  const btnBase = {
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      let command;
      switch (event.key.toLowerCase()) {
        case 'w': command = 'FORWARD'; break;
        case 'a': command = 'LEFT'; break;
        case 's': command = 'BACKWARD'; break;
        case 'd': command = 'RIGHT'; break;
        case ' ': command = 'STOP'; break;
        default: return;
      }
      sendCommand(command);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startManualMode = async () => {
    try {
      await axios.post(`/start_manual`);
    } catch (error) {
      console.error('Error starting manual mode:', error);
    }
  };

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
      <p>Press WASD (or tap buttons) to send movement commands in real-time.</p>

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
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onTouchStart={handlePress}
          onTouchEnd={handleRelease}
          onClick={startManualMode}
          style={{ ...btnBase, padding: '10px', fontSize: '16px' }}
        >
          Start Manual Mode
        </button>
        <button
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onTouchStart={handlePress}
          onTouchEnd={handleRelease}
          onClick={stopManualMode}
          style={{ ...btnBase, padding: '10px', fontSize: '16px' }}
        >
          Stop Manual Mode
        </button>
        <button
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onTouchStart={handlePress}
          onTouchEnd={handleRelease}
          onClick={() => setShowOverlay(true)}
          style={{
            ...btnBase,
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            padding: '10px'
          }}
        >
          ℹ️
        </button>
      </div>

      {/* On-Screen WASD + Stop Buttons */}
      <div
        style={{
          margin: '30px auto 0',
          display: 'inline-grid',
          gridTemplateColumns: 'repeat(3, 60px)',
          gridTemplateRows: 'repeat(3, 60px)',
          gap: '10px',
          touchAction: 'manipulation'
        }}
      >
        {/* Row 1 */}
        <div />
        <button
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onClick={() => sendCommand('FORWARD')}
          onTouchStart={(e) => { handlePress(e); sendCommand('FORWARD'); }}
          onTouchEnd={handleRelease}
          style={{ ...btnBase, fontSize: '18px', borderRadius: '6px' }}
        >
          W
        </button>
        <div />

        {/* Row 2 */}
        <button
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onClick={() => sendCommand('LEFT')}
          onTouchStart={(e) => { handlePress(e); sendCommand('LEFT'); }}
          onTouchEnd={handleRelease}
          style={{ ...btnBase, fontSize: '18px', borderRadius: '6px' }}
        >
          A
        </button>
        <button
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onClick={() => sendCommand('STOP')}
          onTouchStart={(e) => { handlePress(e); sendCommand('STOP'); }}
          onTouchEnd={handleRelease}
          style={{ ...btnBase, fontSize: '18px', borderRadius: '6px' }}
        >
          ⏹
        </button>
        <button
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onClick={() => sendCommand('RIGHT')}
          onTouchStart={(e) => { handlePress(e); sendCommand('RIGHT'); }}
          onTouchEnd={handleRelease}
          style={{ ...btnBase, fontSize: '18px', borderRadius: '6px' }}
        >
          D
        </button>

        {/* Row 3 */}
        <div />
        <button
          onMouseDown={handlePress}
          onMouseUp={handleRelease}
          onMouseLeave={handleRelease}
          onClick={() => sendCommand('BACKWARD')}
          onTouchStart={(e) => { handlePress(e); sendCommand('BACKWARD'); }}
          onTouchEnd={handleRelease}
          style={{ ...btnBase, fontSize: '18px', borderRadius: '6px' }}
        >
          S
        </button>
        <div />
      </div>

      {/* Acknowledgement Toast */}
      {lastCommand && (
        <div
          style={{
            position: 'fixed',
            top: '150px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '18px',
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
              <li>W &amp; S control throttle, there are five levels of motor power, just vary the level of forward power.</li>
              <li>A &amp; D control the rudder, there are nine angles of articulation that you can use.</li>
              <li>Spacebar (⏹) returns both throttle and rudder to default, e.g. stopped and center aligned.</li>
              <li>Start manual is equivalent to stop mission, called when transitioning from auto to manual.</li>
              <li>Stop manual is equivalent to resume, called when transitioning from manual to auto.
                <div style={{ textAlign: 'center', marginTop: '2px', marginBottom: '2px', fontStyle: 'italic' }}>
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
