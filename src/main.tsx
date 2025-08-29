import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Test database connection in development
if (import.meta.env.DEV) {
  import('./lib/test-db-connection').then(({ testDatabaseConnection }) => {
    testDatabaseConnection();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)