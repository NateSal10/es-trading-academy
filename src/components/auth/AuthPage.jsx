import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CanvasRevealEffect } from '@/components/sign-in-flow-1'
import { supabase } from '../../lib/supabase'

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
        setMessage('If an account exists, a reset link has been sent.')
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
      if (mode === 'forgot') {
        setError('If an account exists, a reset link has been sent.')
      } else if (mode === 'signup') {
        setError('Unable to create account. Please try again.')
      } else {
        setError('Invalid email or password.')
      }
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError('Google sign-in failed. Please try again.')
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setMessage('')
  }

  const headings = {
    signin: { title: 'Welcome back', subtitle: 'Sign in to your account' },
    signup: { title: 'Create account', subtitle: 'Start building your edge' },
    forgot: { title: 'Reset password', subtitle: "We'll send you a reset link" },
  }

  const submitLabel = {
    signin: loading ? 'Signing in...' : 'Sign in \u2192',
    signup: loading ? 'Creating...' : 'Create account \u2192',
    forgot: loading ? 'Sending...' : 'Send reset link \u2192',
  }

  return (
    <div className={cn('flex w-full flex-col min-h-screen bg-black relative')}>
      {/* Override browser autofill colors */}
      <style>{`
        .auth-field:-webkit-autofill,
        .auth-field:-webkit-autofill:hover,
        .auth-field:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px rgba(15, 18, 30, 1) inset !important;
          -webkit-text-fill-color: #fff !important;
          caret-color: #fff !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
      {/* Animated background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0">
          <CanvasRevealEffect
            animationSpeed={3}
            containerClassName="bg-black"
            colors={[
              [79, 142, 247],
              [79, 142, 247],
            ]}
            dotSize={5}
            reverse={false}
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.85)_0%,_transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex flex-1 flex-col justify-center items-center px-5">
          <div className="w-full max-w-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {/* Card */}
                <div
                  style={{
                    background: 'rgba(10, 14, 23, 0.85)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '40px 36px 32px',
                    backdropFilter: 'blur(24px)',
                  }}
                >
                  {/* Branding */}
                  <div style={{ marginBottom: '24px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                      <span style={{ color: '#4f8ef7' }}>Trade</span>Forge
                    </span>
                  </div>

                  {/* Heading */}
                  <div style={{ marginBottom: '28px' }}>
                    <h1
                      style={{
                        fontSize: '1.85rem',
                        fontWeight: 700,
                        color: '#fff',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                        marginBottom: '6px',
                      }}
                    >
                      {headings[mode].title}
                    </h1>
                    <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.45)', fontWeight: 300 }}>
                      {headings[mode].subtitle}
                    </p>
                  </div>

                  {/* Google button — only on signin/signup */}
                  {mode !== 'forgot' && (
                    <>
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          padding: '12px',
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'transparent' }}
                      >
                        <GoogleIcon />
                        Login with Google
                      </button>

                      {/* Divider */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          margin: '20px 0',
                        }}
                      >
                        <div style={{ flex: 1, height: '1px', borderTop: '1px dashed rgba(255,255,255,0.12)' }} />
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontWeight: 300 }}>or</span>
                        <div style={{ flex: 1, height: '1px', borderTop: '1px dashed rgba(255,255,255,0.12)' }} />
                      </div>
                    </>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Email */}
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          color: '#fff',
                          marginBottom: '8px',
                        }}
                      >
                        Email <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        className="auth-field"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        style={{
                          width: '100%',
                          padding: '14px 20px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '0.95rem',
                          fontFamily: 'inherit',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => e.target.style.borderColor = 'rgba(79,142,247,0.6)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>

                    {/* Password — hidden on forgot */}
                    {mode !== 'forgot' && (
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: '#fff',
                            marginBottom: '8px',
                          }}
                        >
                          Password <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            className="auth-field"
                            type={showPassword ? 'text' : 'password'}
                            placeholder={mode === 'signup' ? 'Min 8 characters' : 'Enter your password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            style={{
                              width: '100%',
                              padding: '14px 52px 14px 20px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '10px',
                              color: '#fff',
                              fontSize: '0.95rem',
                              fontFamily: 'inherit',
                              outline: 'none',
                              transition: 'border-color 0.2s',
                              boxSizing: 'border-box',
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(79,142,247,0.6)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            style={{
                              position: 'absolute',
                              right: '14px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: 'rgba(255,255,255,0.35)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <EyeIcon open={showPassword} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error / Message */}
                    {error && (
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: '#f87171',
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.15)',
                          borderRadius: '10px',
                          padding: '10px 14px',
                        }}
                      >
                        {error}
                      </div>
                    )}
                    {message && (
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: '#60a5fa',
                          background: 'rgba(96,165,250,0.08)',
                          border: '1px solid rgba(96,165,250,0.15)',
                          borderRadius: '10px',
                          padding: '10px 14px',
                        }}
                      >
                        {message}
                      </div>
                    )}

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '13px',
                        background: 'rgba(255,255,255,0.9)',
                        color: '#0a0e17',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        opacity: loading ? 0.5 : 1,
                        marginTop: '4px',
                        transition: 'background 0.2s',
                      }}
                      whileHover={{ scale: loading ? 1 : 1.015 }}
                      whileTap={{ scale: loading ? 1 : 0.985 }}
                      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)' }}
                    >
                      {submitLabel[mode]}
                    </motion.button>
                  </form>

                  {/* Links */}
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    {mode === 'signin' && (
                      <>
                        <button
                          onClick={() => switchMode('forgot')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#4f8ef7',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            padding: 0,
                          }}
                        >
                          Forgot password?
                        </button>
                        <button
                          onClick={() => switchMode('signup')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            padding: 0,
                          }}
                        >
                          Don't have an account?{' '}
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Sign up</span>
                        </button>
                      </>
                    )}
                    {mode === 'signup' && (
                      <button
                        onClick={() => switchMode('signin')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          padding: 0,
                        }}
                      >
                        Already have an account?{' '}
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Sign in</span>
                      </button>
                    )}
                    {mode === 'forgot' && (
                      <button
                        onClick={() => switchMode('signin')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          padding: 0,
                        }}
                      >
                        Back to{' '}
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>sign in</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
