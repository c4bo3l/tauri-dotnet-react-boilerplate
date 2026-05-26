import { useState, useEffect } from 'react'

const API_BASE = 'http://127.0.0.1:5199'

interface LicenseStatus {
  isLicensed: boolean
  reason?: string
  machineId: string
  issuedAt?: string
  expiresAt?: string | null
}

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LicenseStatus | null>(null)
  const [licenseCode, setLicenseCode] = useState('')
  const [error, setError] = useState('')
  const [activating, setActivating] = useState(false)

  const check = () =>
    fetch(`${API_BASE}/api/license/status`)
      .then((r) => r.json())
      .then(setStatus)

  useEffect(() => { check() }, [])

  const activate = async () => {
    if (!licenseCode.trim()) return
    setActivating(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(licenseCode),
      })
      const data = await res.json()
      if (res.ok) {
        await check()
      } else {
        setError(data.error || 'Activation failed')
      }
    } catch {
      setError('Could not reach activation server')
    } finally {
      setActivating(false)
    }
  }

  if (!status) return null

  if (status.isLicensed) {
    return <>{children}</>
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: 'system-ui, sans-serif',
      background: '#f5f5f5',
    }}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)', maxWidth: 440, width: '100%',
      }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Unlock Application</h1>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Enter your license code to activate this application.
        </p>

        <div style={{
          background: '#f0f0f0', borderRadius: 4, padding: '0.75rem',
          marginBottom: '1rem', fontSize: '0.8rem', fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#333' }}>Machine ID</div>
          {status.machineId}
        </div>

        <textarea
          value={licenseCode}
          onChange={(e) => setLicenseCode(e.target.value)}
          placeholder="Paste your license code here..."
          rows={5}
          style={{
            width: '100%', padding: '0.5rem', fontSize: '0.8rem',
            fontFamily: 'monospace', border: '1px solid #ccc', borderRadius: 4,
            resize: 'vertical', boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ color: '#c00', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>
        )}

        <button
          onClick={activate}
          disabled={activating || !licenseCode.trim()}
          style={{
            marginTop: '1rem', width: '100%', padding: '0.6rem',
            fontSize: '0.95rem', fontWeight: 600,
            background: activating ? '#ccc' : '#0066cc',
            color: 'white', border: 'none', borderRadius: 4, cursor: activating ? 'not-allowed' : 'pointer',
          }}
        >
          {activating ? 'Activating...' : 'Activate'}
        </button>
      </div>
    </div>
  )
}
