import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import SocketProvider from './contexts/SocketProvider.jsx'
import PeerProvider from './contexts/PeerProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SocketProvider>
      <PeerProvider>
    <App />
    </PeerProvider>
    </SocketProvider>
  </React.StrictMode>,
)
