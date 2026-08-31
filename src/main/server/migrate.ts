import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'

/**
 * Applies bundled Prisma-generated migration.sql files in order, tracking
 * what's already applied in a local table. This avoids embedding Prisma's
 * migration engine in the packaged app — the .sql files it already produces
 * during development are the only thing shipped and replayed at runtime.
 */
export function runMigrations(dbPath: string, migrationsDir: string): void {
  const dir = dirname(dbPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(migrationsDir)) return

  const db = new Database(dbPath)
  try {
    db.pragma('journal_mode = WAL')
    db.exec(
      `CREATE TABLE IF NOT EXISTS _app_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )

    const appliedRows = db.prepare('SELECT id FROM _app_migrations').all() as Array<{ id: string }>
    const applied = new Set(appliedRows.map((row) => row.id))

    const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

    for (const folder of migrationFolders) {
      if (applied.has(folder)) continue
      const sqlPath = join(migrationsDir, folder, 'migration.sql')
      if (!existsSync(sqlPath)) continue
      const sql = readFileSync(sqlPath, 'utf-8')
      const applyMigration = db.transaction(() => {
        db.exec(sql)
        db.prepare('INSERT INTO _app_migrations (id) VALUES (?)').run(folder)
      })
      applyMigration()
    }
  } finally {
    db.close()
  }
}
