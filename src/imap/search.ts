import type { AccountConfig, Config } from "../types.js";
import type { Db } from "../db.js";
import { withAccount } from "./pool.js";

export interface GmailSearchItem {
  id: number;
  account: string;
  date: string;
  from: string | null;
  subject: string | null;
  seen: boolean;
  classification: string | null;
}

/**
 * Búsqueda con sintaxis nativa de Gmail (X-GM-RAW), p.ej. "from:banco has:attachment newer_than:7d".
 * Los UIDs que no estén en el cache se insertan al vuelo (solo envelope).
 */
export async function searchGmail(
  db: Db,
  cfg: Config,
  account: AccountConfig,
  rawQuery: string,
  limit: number
): Promise<GmailSearchItem[]> {
  if (account.kind !== "gmail") {
    throw new Error(`La cuenta "${account.id}" no es Gmail; mail_search_gmail solo funciona en cuentas Gmail.`);
  }

  const uids = await withAccount(account, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const mb = client.mailbox;
      const uidValidity = typeof mb === "object" && mb ? Number(mb.uidValidity) : 0;
      const found = (await client.search({ gmraw: rawQuery }, { uid: true })) || [];
      const recent = found.slice(-limit); // los UIDs más altos = más recientes
      if (recent.length === 0) return { uidValidity, uids: [] as number[] };

      // ¿Cuáles faltan en el cache?
      const placeholders = recent.map(() => "?").join(",");
      const cached = new Set(
        (
          db
            .prepare(
              `SELECT uid FROM messages WHERE account_id = ? AND folder = 'INBOX' AND uidvalidity = ? AND uid IN (${placeholders})`
            )
            .all(account.id, uidValidity, ...recent) as Array<{ uid: number }>
        ).map((r) => r.uid)
      );
      const missing = recent.filter((u) => !cached.has(u));

      if (missing.length > 0) {
        const insertStmt = db.prepare(
          `INSERT OR IGNORE INTO messages
             (account_id, folder, uid, uidvalidity, message_id, internal_date,
              from_addr, from_name, to_addrs, subject, flags, seen, answered, size, gm_labels)
           VALUES (?, 'INBOX', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for await (const msg of client.fetch(
          missing.join(","),
          { uid: true, envelope: true, flags: true, internalDate: true, size: true, labels: true },
          { uid: true }
        )) {
          const env = msg.envelope;
          const from = env?.from?.[0];
          const flags = msg.flags ? [...msg.flags] : [];
          insertStmt.run(
            account.id,
            msg.uid,
            uidValidity,
            env?.messageId ?? null,
            (msg.internalDate ? new Date(msg.internalDate) : new Date()).toISOString(),
            from?.address ?? null,
            from?.name || null,
            JSON.stringify((env?.to ?? []).map((a) => ({ name: a.name || null, address: a.address || null }))),
            env?.subject ?? null,
            JSON.stringify(flags),
            flags.includes("\\Seen") ? 1 : 0,
            flags.includes("\\Answered") ? 1 : 0,
            msg.size ?? null,
            msg.labels ? JSON.stringify([...msg.labels]) : null
          );
        }
      }
      return { uidValidity, uids: recent };
    } finally {
      lock.release();
    }
  });

  if (uids.uids.length === 0) return [];
  const placeholders = uids.uids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT id, account_id, internal_date, from_addr, from_name, subject, seen, classification
       FROM messages
       WHERE account_id = ? AND folder = 'INBOX' AND uidvalidity = ? AND uid IN (${placeholders})
       ORDER BY internal_date DESC`
    )
    .all(account.id, uids.uidValidity, ...uids.uids) as Array<{
    id: number;
    account_id: string;
    internal_date: string;
    from_addr: string | null;
    from_name: string | null;
    subject: string | null;
    seen: number;
    classification: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    account: r.account_id,
    date: r.internal_date,
    from: r.from_name ? `${r.from_name} <${r.from_addr ?? ""}>` : r.from_addr,
    subject: r.subject,
    seen: r.seen === 1,
    classification: r.classification,
  }));
}
