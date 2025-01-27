import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const BASE_URL = 'http://localhost:4000'; 
// If hosting on Pi: const BASE_URL = 'http://192.168.4.1:4000';

function Home() {
  return (
    <div style={{ margin: '20px' }}>
      <h1>Home</h1>

      <div style={{ marginBottom: '10px' }}>
        <Link to="/location">
          <button>Go to Location Page</button>
        </Link>
        <Link to="/upload" style={{ marginLeft: '10px' }}>
          <button>Go to Upload Page</button>
        </Link>
        <Link to="/map" style={{ marginLeft: '10px' }}>
          <button>Go to Map Page</button>
        </Link>
      </div>
    </div>
  );
}

export default Home;
