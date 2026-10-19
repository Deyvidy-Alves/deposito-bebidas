import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/globals.css'

// Modo escuro é o padrão: garante a classe no <html> no boot.
document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
