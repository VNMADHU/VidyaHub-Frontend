import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('main.jsx loaded')
const root = document.getElementById('root')
console.log('root element:', root)

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('React app rendered')
} else {
  console.error('Root element not found!')
}
