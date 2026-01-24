import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initMonitoring } from './utils/monitoring';
import './styles/main.scss';

// Initialize performance monitoring and error tracking
initMonitoring();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
