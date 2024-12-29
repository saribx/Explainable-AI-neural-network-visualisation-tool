import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import React, { useState, useEffect } from "react";
import './index.css';
import App from './App.jsx';

const Main = () => {
  const [activations, setActivations] = useState([]);

  useEffect(() => {
    // Load the JSON file
    fetch("/activations.json") // The path relative to the public folder
      .then((response) => response.json())
      .then((data) => {
        // Transform raw activation values into the required format
        const formattedData = data.map((value) => ({ rate: value }));
        setActivations(formattedData);
      })
      .catch((error) => console.error("Error loading activations:", error));
  }, []);

  return activations.length > 0 ? (
    <App activations={activations} />
  ) : (
    <div>Loading...</div>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Main /> {/* Render Main component here */}
  </StrictMode>,
);
