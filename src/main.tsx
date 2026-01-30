import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Функция инициализации React приложения
function initApp() {
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
}

// Ждём готовности DOM перед инициализацией
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM уже готов
  initApp();
}
