import type { ImapFlow, FetchMessageObject } from "imapflow";
import type { AccountConfig, Config } from "../types.js";
import type { Db } from "../db.js";
import { withAccount } from "./pool.js";
import { log } from "../log.js";

export interface SyncResult {
  synced: boolean;
  skipped?: string;
  inserted: number;
  marked_gone: number;
  uidvalidity_reset: boolean;
}

/**
 * Sync incremental del INBOX de una cuenta contra el cache SQLite.
 * - Nuevos: fetch de envelopes desde last_uid+1 (ventana windowDays).
 * - Reconciliación: seen/gone vía dos SEARCH baratos.
 * - UIDVALIDITY cambiado: gone masivo + resync, re-anclando clasificaciones por Message-ID.
 */
export async function syncAccount(
  db: Db,
  cfg: Config,
  account: AccountConfig,
  opts: { force?: boolean } = {}
): Promise<SyncResult> {
  const folder = "INBOX";
  const state = db
    .prepare(`SELECT uidvalidity, last_uid, last_sync_at FROM sync_state WHERE account_id = ? AND folder = ?`)
    .get(account.id, folder) as { uidvalidity: number; last_uid: number; last_sync_at: string | null } | undefined;

  if (!opts.force && state?.last_sync_at) {
    const ageMs = Date.now() - Date.parse(state.last_sync_at);
    if (ageMs < cfg.sync.refreshSeconds * 1000) {
      return { synced: false, skipped: `sync hace ${Math.round(ageMs / 1000)}s`, inserted: 0, marked_gone: 0, uidvalidity_reset: false };
    }
  }

  const windowStart = new Date(Date.now() - cfg.sync.windowDays * 86_400_000);
  // SEARCH SINCE tiene granularidad de día y usa el reloj del servidor: pedimos un día de margen.
  const sinceImap = new Date(windowStart.getTime() - 86_400_000);

  return withAccount(
    account,
    async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        const mb = client.mailbox;
        if (typeof mb !== "object" || !mb) throw new Error(`${account.id}: no se pudo abrir ${folder}`);
        const uidValidity = Number(mb.uidValidity);

        let lastUid = state?.last_uid ?? 0;
        let uidvalidityReset = false;

        if (state && state.uidvalidity !== uidValidity) {
          log.warn(`${account.id}: UIDVALIDITY cambió (${state.uidvalidity} → ${uidValidity}); resync completo.`);
          db.prepare(`UPDATE messages SET gone = 1 WHERE account_id = ? AND folder = ?`).run(account.id, folder);
          lastUid = 0;
          uidvalidityReset = true;
        }

        // 1) Alta de nuevos (solo envelopes).
        let inserted = 0;
        const insertStmt = db.prepare(
          `INSERT OR IGNORE INTO messages
             (account_id, folder, uid, uidvalidity, message_id, internal_date,
              from_addr, from_name, to_addrs, subject, flags, seen, answered, size, gm_labels)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        const isGmail = account.kind === "gmail";
        let maxUid = lastUid;

        for await (const msg of client.fetch(
          { uid: `${lastUid + 1}:*` },
          { uid: true, envelope: true, flags: true, internalDate: true, size: true, ...(isGmail ? { labels: true } : {}) },
          { uid: true }
        )) {
          // `uid: "N:*"` con N > máximo devuelve igualmente el último mensaje: filtrar.
          if (msg.uid <= lastUid) continue;
          if (msg.uid > maxUid) maxUid = msg.uid;
          const date = msg.internalDate ? new Date(msg.internalDate) : new Date();
          if (date < windowStart) continue;
          insertRow(insertStmt, account.id, folder, uidValidity, msg, date);
          inserted++;
        }

        // Re-anclaje tras reset de UIDVALIDITY: heredar clasificación de filas gone con mismo Message-ID.
        if (uidvalidityReset) {
          db.exec(`
            UPDATE messages AS m SET
              classification = (SELECT g.classification FROM messages g
                                WHERE g.account_id = m.account_id AND g.gone = 1
                                  AND g.message_id = m.message_id AND g.classification IS NOT NULL
                                LIMIT 1),
              classified_at = (SELECT g.classified_at FROM messages g
                               WHERE g.account_id = m.account_id AND g.gone = 1
                                 AND g.message_id = m.message_id AND g.classification IS NOT NULL
                               LIMIT 1)
            WHERE m.gone = 0 AND m.classification IS NULL AND m.message_id IS NOT NULL
          `);
        }

        // 2) Reconciliación barata de vivos y no-leídos dentro de la ventana.
        const liveUids = new Set(await client.search({ since: sinceImap }, { uid: true }) || []);
        const unseenUids = new Set(await client.search({ seen: false, since: sinceImap }, { uid: true }) || []);

        const cached = db
          .prepare(`SELECT id, uid FROM messages WHERE account_id = ? AND folder = ? AND uidvalidity = ? AND gone = 0`)
          .all(account.id, folder, uidValidity) as Array<{ id: number; uid: number }>;

        let markedGone = 0;
        const goneStmt = db.prepare(`UPDATE messages SET gone = 1 WHERE id = ?`);
        const seenStmt = db.prepare(`UPDATE messages SET seen = ? WHERE id = ? AND seen != ?`);
        for (const row of cached) {
          if (!liveUids.has(row.uid)) {
            goneStmt.run(row.id);
            markedGone++;
          } else {
            const seen = unseenUids.has(row.uid) ? 0 : 1;
            seenStmt.run(seen, row.id, seen);
          }
        }

        db.prepare(
          `INSERT INTO sync_state (account_id, folder, uidvalidity, last_uid, last_sync_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(account_id, folder) DO UPDATE SET uidvalidity = excluded.uidvalidity,
             last_uid = excluded.last_uid, last_sync_at = excluded.last_sync_at`
        ).run(account.id, folder, uidValidity, maxUid, new Date().toISOString());

        log.info(`${account.id}: sync ok (+${inserted}, gone ${markedGone})`);
        return { synced: true, inserted, marked_gone: markedGone, uidvalidity_reset: uidvalidityReset };
      } finally {
        lock.release();
      }
    },
    { timeoutMs: 120_000 } // el primer sync de 90 días puede tardar
  );
}

function insertRow(
  stmt: ReturnType<Db["prepare"]>,
  accountId: string,
  folder: string,
  uidValidity: number,
  msg: FetchMessageObject,
  date: Date
): void {
  const env = msg.envelope;
  const from = env?.from?.[0];
  const to = (env?.to ?? []).map((a) => ({ name: a.name || null, address: a.address || null }));
  const flags = msg.flags ? [...msg.flags] : [];
  stmt.run(
    accountId,
    folder,
    msg.uid,
    uidValidity,
    env?.messageId ?? null,
    date.toISOString(),
    from?.address ?? null,
    from?.name || null,
    JSON.stringify(to),
    env?.subject ?? null,
    JSON.stringify(flags),
    flags.includes("\\Seen") ? 1 : 0,
    flags.includes("\\Answered") ? 1 : 0,
    msg.size ?? null,
    msg.labels ? JSON.stringify([...msg.labels]) : null
  );
}

/** Sync de varias cuentas en paralelo; los errores no tumban al resto. */
export async function syncAccounts(
  db: Db,
  cfg: Config,
  accounts: AccountConfig[],
  opts: { force?: boolean } = {}
): Promise<Record<string, SyncResult | { error: string }>> {
  const out: Record<string, SyncResult | { error: string }> = {};
  await Promise.all(
    accounts.map(async (a) => {
      try {
        out[a.id] = await syncAccount(db, cfg, a, opts);
      } catch (e) {
        log.warn(`${a.id}: sync falló: ${(e as Error).message}`);
        out[a.id] = { error: (e as Error).message };
      }
    })
  );
  return out;
}
