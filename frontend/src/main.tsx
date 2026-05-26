import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LicenseGate from './LicenseGate.tsx'

const App = lazy(() => import('./App.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LicenseGate>
      <Suspense fallback={<div className="loading-screen">Loading...</div>}>
        <App />
      </Suspense>
    </LicenseGate>
  </StrictMode>,
)
