import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type DB = BetterSQLite3Database<typeof schema>

let _db: DB | null = null
let _sqlite: Database.Database | null = null

/** Caminho do arquivo do banco: raiz do projeto em dev, userData em produção. */
function resolveDbPath(): string {
  if (app.isPackaged) {
    return join(app.getPath('userData'), 'deposito.db')
  }
  return join(app.getAppPath(), 'deposito.db')
}

/** Localiza a pasta de migrations (empacotada em resources na build). */
function resolveMigrationsFolder(): string {
  const candidates = [
    join(process.resourcesPath ?? '', 'migrations'),
    join(app.getAppPath(), 'src/main/database/migrations'),
    join(app.getAppPath(), 'out/migrations')
  ]
  return candidates.find((p) => p && existsSync(p)) ?? candidates[1]
}

/** Inicializa a conexão, aplica migrations e devolve a instância do Drizzle. */
export function initDatabase(): DB {
  if (_db) return _db

  const dbPath = resolveDbPath()
  _sqlite = new Database(dbPath)
  _sqlite.pragma('journal_mode = WAL')
  _sqlite.pragma('foreign_keys = ON')

  _db = drizzle(_sqlite, { schema })

  const migrationsFolder = resolveMigrationsFolder()
  try {
    migrate(_db, { migrationsFolder })
    console.log(`✅ Banco inicializado em ${dbPath}`)
  } catch (err) {
    console.error('❌ Falha ao aplicar migrations:', err)
    throw err
  }

  seedDefaults()
  return _db
}

export function getDb(): DB {
  if (!_db) return initDatabase()
  return _db
}

/** Acesso ao driver bruto para transações síncronas (better-sqlite3). */
export function getSqlite(): Database.Database {
  if (!_sqlite) initDatabase()
  return _sqlite as Database.Database
}

/** Insere configurações padrão na primeira execução. */
function seedDefaults(): void {
  const db = _db!
  const defaults: Record<string, string> = {
    fiscal_enabled: 'false',
    financial_password: '', // vazio = sem senha configurada ainda
    store_name: 'Depósito de Bebidas'
  }
  const insert = _sqlite!.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )
  const tx = _sqlite!.transaction(() => {
    for (const [key, value] of Object.entries(defaults)) insert.run(key, value)
  })
  tx()
  void db
}

export function closeDatabase(): void {
  _sqlite?.close()
  _sqlite = null
  _db = null
}
