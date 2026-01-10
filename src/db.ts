import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";

export interface Command {
  id: number;
  tool_use_id: string;
  command: string;
  description: string | null;
  cwd: string | null;
  stdout: string | null;
  stderr: string | null;
  is_error: number;
  timestamp: string | null;
  session_id: string | null;
}

export interface IndexedFile {
  file_path: string;
  last_byte_offset: number;
  last_modified: number;
}

const DATA_DIR = join(homedir(), ".ran");
const DB_PATH = join(DATA_DIR, "history.db");

let _db: SqlJsDatabase | null = null;
let _dbPath: string | null = null;

function initSchema(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY,
      tool_use_id TEXT UNIQUE,
      command TEXT NOT NULL,
      description TEXT,
      cwd TEXT,
      stdout TEXT,
      stderr TEXT,
      is_error INTEGER DEFAULT 0,
      timestamp TEXT,
      session_id TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS indexed_files (
      file_path TEXT PRIMARY KEY,
      last_byte_offset INTEGER DEFAULT 0,
      last_modified INTEGER DEFAULT 0
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_commands_command ON commands(command)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commands_timestamp ON commands(timestamp)`);
}

export async function createDb(dbPath?: string): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();

  if (dbPath === ":memory:") {
    const db = new SQL.Database();
    initSchema(db);
    return db;
  }

  const path = dbPath ?? DB_PATH;

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  let db: SqlJsDatabase;
  if (existsSync(path)) {
    const buffer = readFileSync(path);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  return db;
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (!_db) {
    _db = await createDb();
    _dbPath = DB_PATH;
  }
  return _db;
}

export function setDb(db: SqlJsDatabase, path?: string): void {
  _db = db;
  _dbPath = path ?? null;
}

export function saveDb(db: SqlJsDatabase, path?: string): void {
  const savePath = path ?? _dbPath ?? DB_PATH;
  const dir = savePath.substring(0, savePath.lastIndexOf("/"));
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(savePath, buffer);
}

export async function insertCommand(cmd: Omit<Command, "id">, db?: SqlJsDatabase): Promise<void> {
  const database = db ?? await getDb();
  database.run(
    `INSERT OR IGNORE INTO commands
    (tool_use_id, command, description, cwd, stdout, stderr, is_error, timestamp, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cmd.tool_use_id,
      cmd.command,
      cmd.description,
      cmd.cwd,
      cmd.stdout,
      cmd.stderr,
      cmd.is_error,
      cmd.timestamp,
      cmd.session_id,
    ]
  );
  if (!db) saveDb(database);
}

export async function updateIndexedFile(filePath: string, byteOffset: number, mtime: number, db?: SqlJsDatabase): Promise<void> {
  const database = db ?? await getDb();
  database.run(
    `INSERT OR REPLACE INTO indexed_files (file_path, last_byte_offset, last_modified)
    VALUES (?, ?, ?)`,
    [filePath, byteOffset, mtime]
  );
  if (!db) saveDb(database);
}

export async function getIndexedFile(filePath: string, db?: SqlJsDatabase): Promise<IndexedFile | null> {
  const database = db ?? await getDb();
  const stmt = database.prepare(`SELECT * FROM indexed_files WHERE file_path = ?`);
  stmt.bind([filePath]);

  if (stmt.step()) {
    const row = stmt.getAsObject() as IndexedFile;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export async function searchCommands(pattern: string, useRegex: boolean, cwd?: string, db?: SqlJsDatabase): Promise<Command[]> {
  const database = db ?? await getDb();

  if (useRegex) {
    const results: Command[] = [];
    const stmt = database.prepare(`SELECT * FROM commands ORDER BY timestamp DESC`);
    const regex = new RegExp(pattern, "i");

    while (stmt.step()) {
      const row = stmt.getAsObject() as Command;
      if (regex.test(row.command) && (!cwd || row.cwd === cwd)) {
        results.push(row);
      }
    }
    stmt.free();
    return results;
  }

  const results: Command[] = [];
  const sql = cwd
    ? `SELECT * FROM commands WHERE command LIKE ? AND cwd = ? ORDER BY timestamp DESC`
    : `SELECT * FROM commands WHERE command LIKE ? ORDER BY timestamp DESC`;
  const params = cwd ? [`%${pattern}%`, cwd] : [`%${pattern}%`];

  const stmt = database.prepare(sql);
  stmt.bind(params);

  while (stmt.step()) {
    results.push(stmt.getAsObject() as Command);
  }
  stmt.free();
  return results;
}

export async function listCommands(limit: number = 20, db?: SqlJsDatabase): Promise<Command[]> {
  const database = db ?? await getDb();
  const results: Command[] = [];

  const stmt = database.prepare(`SELECT * FROM commands ORDER BY timestamp DESC LIMIT ?`);
  stmt.bind([limit]);

  while (stmt.step()) {
    results.push(stmt.getAsObject() as Command);
  }
  stmt.free();
  return results;
}

export async function getStats(db?: SqlJsDatabase): Promise<{ totalCommands: number; indexedFiles: number }> {
  const database = db ?? await getDb();

  const cmdStmt = database.prepare(`SELECT COUNT(*) as count FROM commands`);
  cmdStmt.step();
  const commands = cmdStmt.getAsObject() as { count: number };
  cmdStmt.free();

  const fileStmt = database.prepare(`SELECT COUNT(*) as count FROM indexed_files`);
  fileStmt.step();
  const files = fileStmt.getAsObject() as { count: number };
  fileStmt.free();

  return {
    totalCommands: commands.count,
    indexedFiles: files.count,
  };
}
