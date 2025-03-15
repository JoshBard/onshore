import React, { useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

// Adjust BASE_URL if needed
const BASE_URL = process.env.REACT_APP_TEST;
const socket = io(`${BASE_URL}`); // WebSocket connection to backend

const ManualControl = () => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            let command = null;
            switch (event.key) {
                case 'w': command = 'FORWARD'; break;
                case 'a': command = 'LEFT'; break;
                case 's': command = 'BACKWARD'; break;
                case 'd': command = 'RIGHT'; break;
                default: return;
            }

            // Send command via WebSocket
            socket.emit('keypress', command);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Function to start manual mode
    const startManualMode = async () => {
        try {
            await axios.post(`${BASE_URL}/start_manual`);
            console.log('Manual mode started');
        } catch (error) {
            console.error('Error starting manual mode:', error);
        }
    };

    // Function to stop manual mode
    const stopManualMode = async () => {
        try {
            await axios.post(`${BASE_URL}/stop_manual`);
            console.log('Manual mode stopped');
        } catch (error) {
            console.error('Error stopping manual mode:', error);
        }
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Emergency Control</h1>
            <p>Press WASD to send movement commands in real-time.</p>

            <div style={{ marginTop: '20px' }}>
                <button onClick={startManualMode} style={{ marginRight: '10px', padding: '10px', fontSize: '16px' }}>
                    Start Manual Mode
                </button>
                <button onClick={stopManualMode} style={{ padding: '10px', fontSize: '16px' }}>
                    Stop Manual Mode
                </button>
            </div>
        </div>
    );
};

export default ManualControl;