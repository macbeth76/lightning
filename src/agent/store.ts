/**
 * ConversationStore — SQLite-backed memory for the Lightning agent.
 * Persists messages, file contexts, and graph snapshots across turns.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface FileContext {
  filePath: string;
  content: string;
  segmentIndex?: number;
}

function openDb(): Database.Database {
  const dbDir = process.env.LIGHTNING_DB_DIR ?? path.join(os.homedir(), '.lightning');
  const dbPath = path.join(dbDir, 'conversations.db');
  fs.mkdirSync(dbDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      cwd TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_call_id TEXT,
      tool_name TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS file_contexts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      file_path TEXT NOT NULL,
      content TEXT NOT NULL,
      segment_index INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

export class ConversationStore {
  private db: Database.Database;
  private sessionId: string;

  constructor(sessionId: string, cwd: string = process.cwd()) {
    this.db = openDb();
    this.sessionId = sessionId;
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO sessions (id, created_at, updated_at, cwd)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
    `).run(sessionId, now, now, cwd);
  }

  addMessage(msg: Message): void {
    this.db.prepare(`
      INSERT INTO messages (session_id, role, content, tool_call_id, tool_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      this.sessionId,
      msg.role,
      msg.content,
      msg.toolCallId ?? null,
      msg.toolName ?? null,
      Date.now()
    );
    this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?')
      .run(Date.now(), this.sessionId);
  }

  getMessages(): Message[] {
    return this.db.prepare(`
      SELECT role, content, tool_call_id as toolCallId, tool_name as toolName
      FROM messages WHERE session_id = ? ORDER BY id ASC
    `).all(this.sessionId) as Message[];
  }

  addFileContext(ctx: FileContext): void {
    this.db.prepare(`
      INSERT INTO file_contexts (session_id, file_path, content, segment_index, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(this.sessionId, ctx.filePath, ctx.content, ctx.segmentIndex ?? null, Date.now());
  }

  getFileContexts(): FileContext[] {
    return this.db.prepare(`
      SELECT file_path as filePath, content, segment_index as segmentIndex
      FROM file_contexts WHERE session_id = ? ORDER BY id ASC
    `).all(this.sessionId) as FileContext[];
  }

  clear(): void {
    this.db.prepare('DELETE FROM messages WHERE session_id = ?').run(this.sessionId);
    this.db.prepare('DELETE FROM file_contexts WHERE session_id = ?').run(this.sessionId);
  }

  close(): void {
    this.db.close();
  }
}
