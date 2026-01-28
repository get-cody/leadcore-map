import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Точка входа для React приложения
const rootElement = document.getElementById('russia-map-root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Element with id "russia-map-root" not found');
}
