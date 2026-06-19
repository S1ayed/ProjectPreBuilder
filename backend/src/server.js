import express from 'express'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import authRouter from './routes/auth.js'

dotenv.config()

const app = express()

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

const frontendOrigin = process.env.FRONTEND_ORIGIN
app.use((req, res, next) => {
  const origin = req.headers.origin || ''
  const isDev = process.env.NODE_ENV !== 'production'

  // In dev mode, accept any origin (local dev server, VS Code webview, etc.)
  if (isDev && origin) {
    res.header('Access-Control-Allow-Origin', origin)
  } else if (frontendOrigin) {
    res.header('Access-Control-Allow-Origin', frontendOrigin)
  }

  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  return next()
})

app.get('/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  console.log(`Auth server running on port ${port}`)
})
