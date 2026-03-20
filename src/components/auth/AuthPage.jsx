import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CanvasRevealEffect } from '@/components/sign-in-flow-1'
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

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setMessage('')
  }

  return (
    <div className={cn('flex w-full flex-col min-h-screen bg-black relative')}>
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
          <div className="w-full max-w-sm">
            <AnimatePresence mode="wait">
              {mode === 'signin' && (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, x: -80 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -80 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="space-y-6 text-center"
                >
                  <div className="space-y-1">
                    <h1 className="text-[2.2rem] font-bold leading-[1.1] tracking-tight text-white">
                      <span style={{ color: '#4f8ef7' }}>ES</span> Academy
                    </h1>
                    <p className="text-[1.1rem] text-white/50 font-light">Sign in to your account</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full backdrop-blur-[2px] text-white bg-white/5 border border-white/10 rounded-full py-3 px-5 focus:outline-none focus:border-white/30 placeholder:text-white/30"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      className="w-full backdrop-blur-[2px] text-white bg-white/5 border border-white/10 rounded-full py-3 px-5 focus:outline-none focus:border-white/30 placeholder:text-white/30"
                    />

                    {error && (
                      <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl py-2 px-4">
                        {error}
                      </div>
                    )}
                    {message && (
                      <div className="text-sm text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-xl py-2 px-4">
                        {message}
                      </div>
                    )}

                    <motion.button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-full bg-white text-black font-semibold py-3 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </motion.button>
                  </form>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => switchMode('signup')}
                      className="text-sm text-white/40 hover:text-white/60 transition-colors"
                    >
                      Don't have an account? <span className="text-white/70 font-medium">Sign up</span>
                    </button>
                    <br />
                    <button
                      onClick={() => switchMode('forgot')}
                      className="text-sm text-white/30 hover:text-white/50 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                </motion.div>
              )}

              {mode === 'signup' && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 80 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 80 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="space-y-6 text-center"
                >
                  <div className="space-y-1">
                    <h1 className="text-[2.2rem] font-bold leading-[1.1] tracking-tight text-white">
                      Create Account
                    </h1>
                    <p className="text-[1.1rem] text-white/50 font-light">Start your trading journey</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full backdrop-blur-[2px] text-white bg-white/5 border border-white/10 rounded-full py-3 px-5 focus:outline-none focus:border-white/30 placeholder:text-white/30"
                    />
                    <input
                      type="password"
                      placeholder="Password (min 6 characters)"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full backdrop-blur-[2px] text-white bg-white/5 border border-white/10 rounded-full py-3 px-5 focus:outline-none focus:border-white/30 placeholder:text-white/30"
                    />

                    {error && (
                      <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl py-2 px-4">
                        {error}
                      </div>
                    )}
                    {message && (
                      <div className="text-sm text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-xl py-2 px-4">
                        {message}
                      </div>
                    )}

                    <motion.button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-full bg-white text-black font-semibold py-3 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                    >
                      {loading ? 'Creating...' : 'Create Account'}
                    </motion.button>
                  </form>

                  <button
                    onClick={() => switchMode('signin')}
                    className="text-sm text-white/40 hover:text-white/60 transition-colors"
                  >
                    Already have an account? <span className="text-white/70 font-medium">Sign in</span>
                  </button>
                </motion.div>
              )}

              {mode === 'forgot' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: 80 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 80 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="space-y-6 text-center"
                >
                  <div className="space-y-1">
                    <h1 className="text-[2.2rem] font-bold leading-[1.1] tracking-tight text-white">
                      Reset Password
                    </h1>
                    <p className="text-[1.1rem] text-white/50 font-light">We'll send you a reset link</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full backdrop-blur-[2px] text-white bg-white/5 border border-white/10 rounded-full py-3 px-5 focus:outline-none focus:border-white/30 placeholder:text-white/30"
                    />

                    {error && (
                      <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl py-2 px-4">
                        {error}
                      </div>
                    )}
                    {message && (
                      <div className="text-sm text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-xl py-2 px-4">
                        {message}
                      </div>
                    )}

                    <motion.button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-full bg-white text-black font-semibold py-3 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </motion.button>
                  </form>

                  <button
                    onClick={() => switchMode('signin')}
                    className="text-sm text-white/40 hover:text-white/60 transition-colors"
                  >
                    Back to <span className="text-white/70 font-medium">sign in</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
