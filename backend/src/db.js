import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const dbPath = process.env.DB_PATH || './data/auth.db'
const resolvedPath = path.resolve(dbPath)
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })

const db = new Database(resolvedPath)

export const query = (text, params = []) => {
  const isSelect = /^\s*select/i.test(text)
  const statement = db.prepare(text)

  if (isSelect) {
    const rows = statement.all(params)
    return { rows, rowCount: rows.length }
  }

  const result = statement.run(params)
  return {
    rows: [],
    rowCount: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  }
}

export const closePool = () => db.close()
