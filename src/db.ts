import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { MessageRow } from "./types.js";

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS sync_state (
  account_id   TEXT NOT NULL,
  folder       TEXT NOT NULL DEFAULT 'INBOX',
  uidvalidity  INTEGER NOT NULL,
  last_uid     INTEGER NOT NULL DEFAULT 0,
  last_sync_at TEXT,
  PRIMARY KEY (account_id, folder)
);

CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY,
  account_id    TEXT NOT NULL,
  folder        TEXT NOT NULL DEFAULT 'INBOX',
  uid           INTEGER NOT NULL,
  uidvalidity   INTEGER NOT NULL,
  message_id    TEXT,
  internal_date TEXT NOT NULL,
  from_addr     TEXT,
  from_name     TEXT,
  to_addrs      TEXT,
  subject       TEXT,
  snippet       TEXT,
  body_text     TEXT,
  flags         TEXT,
  seen          INTEGER NOT NULL DEFAULT 0,
  answered      INTEGER NOT NULL DEFAULT 0,
  has_attachments INTEGER,
  size          INTEGER,
  gm_labels     TEXT,
  classification TEXT,
  classified_at  TEXT,
  classified_applied INTEGER DEFAULT 0,
  gone          INTEGER NOT NULL DEFAULT 0,
  UNIQUE (account_id, folder, uidvalidity, uid)
);
CREATE INDEX IF NOT EXISTS idx_msg_date  ON messages(internal_date DESC);
CREATE INDEX IF NOT EXISTS idx_msg_list  ON messages(account_id, gone, seen, internal_date);
CREATE INDEX IF NOT EXISTS idx_msg_class ON messages(classification);
CREATE INDEX IF NOT EXISTS idx_msg_mid   ON messages(account_id, message_id);
`;

export type Db = DatabaseSync;

export function openDb(dbPath: string): Db {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  return db;
}

export interface InboxQuery {
  accounts?: string[];
  unreadOnly?: boolean;
  since?: string;
  until?: string;
  query?: string;
  classification?: string; // clase concreta o "unclassified"
  limit?: number;
  offset?: number;
}

export interface InboxItem {
  id: number;
  account: string;
  date: string;
  from: string | null;
  subject: string | null;
  snippet: string | null;
  seen: boolean;
  classification: string | null;
}

export function queryInbox(db: Db, q: InboxQuery): { total_matching: number; items: InboxItem[] } {
  const where: string[] = ["gone = 0"];
  const params: (string | number)[] = [];

  if (q.accounts && q.accounts.length > 0) {
    where.push(`account_id IN (${q.accounts.map(() => "?").join(",")})`);
    params.push(...q.accounts);
  }
  if (q.unreadOnly) where.push("seen = 0");
  if (q.since) {
    where.push("internal_date >= ?");
    params.push(normalizeDate(q.since));
  }
  if (q.until) {
    where.push("internal_date <= ?");
    params.push(normalizeDate(q.until, true));
  }
  if (q.query) {
    where.push("(from_addr LIKE ? OR from_name LIKE ? OR subject LIKE ? OR snippet LIKE ?)");
    const like = `%${q.query}%`;
    params.push(like, like, like, like);
  }
  if (q.classification === "unclassified") {
    where.push("classification IS NULL");
  } else if (q.classification) {
    where.push("classification = ?");
    params.push(q.classification);
  }

  const whereSql = where.join(" AND ");
  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM messages WHERE ${whereSql}`)
    .get(...params) as { n: number };

  const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
  const offset = Math.max(q.offset ?? 0, 0);
  const rows = db
    .prepare(
      `SELECT id, account_id, internal_date, from_addr, from_name, subject, snippet, seen, classification
       FROM messages WHERE ${whereSql}
       ORDER BY internal_date DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Array<{
    id: number;
    account_id: string;
    internal_date: string;
    from_addr: string | null;
    from_name: string | null;
    subject: string | null;
    snippet: string | null;
    seen: number;
    classification: string | null;
  }>;

  return {
    total_matching: total.n,
    items: rows.map((r) => ({
      id: r.id,
      account: r.account_id,
      date: r.internal_date,
      from: r.from_name ? `${r.from_name} <${r.from_addr ?? ""}>` : r.from_addr,
      subject: r.subject,
      snippet: r.snippet,
      seen: r.seen === 1,
      classification: r.classification,
    })),
  };
}

function normalizeDate(d: string, endOfDay = false): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return endOfDay ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`;
  }
  return new Date(d).toISOString();
}

export function getMessageRow(db: Db, id: number): MessageRow | undefined {
  return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id) as MessageRow | undefined;
}
