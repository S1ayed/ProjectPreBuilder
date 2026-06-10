import React, { useState, useContext } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'
  const { login } = useContext(AuthContext)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const result = await login(username, password)
      if (result.ok) {
        navigate(from, { replace: true })
      } else {
        setError(result.message || '登录失败')
      }
    } catch (err) {
      setError('网络错误')
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__decor login-page__decor--left" aria-hidden="true" />
      <div className="login-page__decor login-page__decor--right" aria-hidden="true" />
      <main className="login-page__shell">
        <section className="login-page__card" aria-labelledby="login-title">
          <div className="login-page__frame login-page__frame--top" aria-hidden="true" />
          <div className="login-page__frame login-page__frame--bottom" aria-hidden="true" />

          <header className="login-page__header">
            <h1 id="login-title">用户登录</h1>
            <p>欢迎回来！请使用您的账号登录。</p>
          </header>

          <form className="login-page__form" onSubmit={handleSubmit} noValidate>
            <label className="login-page__field">
              <span className="login-page__sr-only">用户名</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </label>

            <label className="login-page__field">
              <span className="login-page__sr-only">密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </label>

            {error && (
              <p className="login-page__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="login-page__submit">
              立即登录
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
