import { useState } from 'react'
import { migrateLocalStorageToSupabase } from '../../lib/migration'

export default function MigrationPrompt({ userId, onDone }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImport = async () => {
    setLoading(true)
    setError('')
    const ok = await migrateLocalStorageToSupabase(userId)
    if (ok) {
      onDone(true)
    } else {
      setError('Migration failed. You can try again or start fresh.')
      setLoading(false)
    }
  }

  const handleSkip = () => {
    onDone(false)
  }

  return (
    <div className="migration-overlay">
      <div className="migration-card">
        <h3>Existing Data Found</h3>
        <p>
          We found trading data on this device from a previous session.
          Would you like to import it into your new account?
        </p>
        <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
          This includes your journal entries, quiz history, account progress, chart drawings, and settings.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <div className="migration-actions">
          <button
            className="auth-button"
            onClick={handleImport}
            disabled={loading}
          >
            {loading ? 'Importing...' : 'Import My Data'}
          </button>
          <button
            className="migration-skip"
            onClick={handleSkip}
            disabled={loading}
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  )
}
