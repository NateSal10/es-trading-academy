import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setMessage('Check your email for a password reset link.')
        setLoading(false)
        return
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account, then sign in.')
        setMode('signin')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span style={{ color: 'var(--accent)' }}>ES</span> Academy
        </div>
        <p className="auth-subtitle">
          {mode === 'signin' && 'Sign in to your account'}
          {mode === 'signup' && 'Create a new account'}
          {mode === 'forgot' && 'Reset your password'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="auth-input"
            autoComplete="email"
          />
          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="auth-input"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          )}

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Loading...' :
              mode === 'signin' ? 'Sign In' :
              mode === 'signup' ? 'Create Account' :
              'Send Reset Link'}
          </button>
        </form>

        <div className="auth-links">
          {mode === 'signin' && (
            <>
              <button onClick={() => { setMode('signup'); setError(''); setMessage('') }}>
                Don't have an account? <span>Sign up</span>
              </button>
              <button onClick={() => { setMode('forgot'); setError(''); setMessage('') }}>
                Forgot password?
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button onClick={() => { setMode('signin'); setError(''); setMessage('') }}>
              Already have an account? <span>Sign in</span>
            </button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => { setMode('signin'); setError(''); setMessage('') }}>
              Back to <span>sign in</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
