import React, { useState } from 'react'
import { Shield, Lock, User, RefreshCw } from 'lucide-react'

interface AuthScreenProps {
  onLoginSuccess: (token: string, username: string, role: string) => void
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('Quality Inspector')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        // Prepare Form Data for FastAPI OAuth2 Password flow
        const formData = new URLSearchParams()
        formData.append('username', username)
        formData.append('password', password)

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        })

        if (!response.ok) {
          const detail = await response.json().then(d => d.detail || 'Login failed')
          throw new Error(detail)
        }

        const data = await response.json()
        onLoginSuccess(data.access_token, data.username, data.role)
      } else {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            password,
            full_name: fullName || username,
            role
          })
        })

        if (!response.ok) {
          const detail = await response.json().then(d => d.detail || 'Registration failed')
          throw new Error(detail)
        }

        // Auto login on success
        setIsLogin(true)
        alert('Registration successful! Please login with your credentials.')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] px-4 relative overflow-hidden">
      {/* Background visual decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl relative z-10 glow-cyan border border-white/10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-cyan-500/20 border border-cyan-400/30 rounded-2xl flex items-center justify-center text-cyan-400 mb-4 shadow-lg glow-cyan">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-wide">VisionGuard AI</h2>
          <p className="text-slate-400 mt-1 text-sm text-center">
            Enterprise Quality Inspection Control Platform
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                placeholder="Enter username"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                  placeholder="Enter full name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                placeholder="Enter password"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">User Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-cyan-400 transition"
              >
                <option value="Quality Inspector">Quality Inspector</option>
                <option value="Engineer">Engineer</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/20 transition duration-200"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <span>{isLogin ? 'Sign In' : 'Register Account'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          <span>{isLogin ? "Need a new account? " : "Already have an account? "}</span>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-cyan-400 hover:underline font-medium focus:outline-none"
          >
            {isLogin ? 'Create one here' : 'Sign in here'}
          </button>
        </div>
      </div>
    </div>
  )
}
