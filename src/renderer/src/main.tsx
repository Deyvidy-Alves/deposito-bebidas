import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/globals.css'
import { applyBrandColor, cachedBrandId } from './config/brandColors'

// Modo escuro é o padrão: garante a classe no <html> no boot.
document.documentElement.classList.add('dark')
// Aplica a cor da marca do cache antes de montar (sem flash); o valor oficial
// vem das configurações e é reconciliado pela store ao carregar.
applyBrandColor(cachedBrandId())

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
