import React, { createContext, useEffect, useState } from 'react'

export const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

  const fetchMe = async () => {
    try {
      const res = await fetch(`${base}/api/auth/me`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        return data
      }
      setUser(null)
      return null
    } catch (e) {
      setUser(null)
      return null
    }
  }

  useEffect(() => {
    let mounted = true
    fetchMe().finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const login = async (username, password) => {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
    if (res.ok) {
      const data = await res.json()
      setUser(data)
      return { ok: true, user: data }
    }
    const err = await res.json().catch(() => ({ message: '登录失败' }))
    return { ok: false, message: err.message }
  }

  const logout = async () => {
    try {
      await fetch(`${base}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    } catch (e) {
      // ignore
    }
    setUser(null)
  }

  const refresh = async () => {
    return fetchMe()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
