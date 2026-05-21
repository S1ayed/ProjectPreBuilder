import fs from 'fs'
import path from 'path'

const logDir = path.resolve('logs')
const authLogPath = path.join(logDir, 'auth.log')

const ensureLogDir = () => {
  fs.mkdirSync(logDir, { recursive: true })
}

export const logAuthEvent = (event, payload = {}) => {
  ensureLogDir()
  const record = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  }
  fs.appendFileSync(authLogPath, `${JSON.stringify(record)}\n`, 'utf8')
}
