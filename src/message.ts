import type { Config } from "./types.js";
import type { Db } from "./db.js";
import { getMessageRow } from "./db.js";
import { withAccount } from "./imap/pool.js";
import { parseAndNormalize } from "./normalize.js";

const MAX_FULL_SOURCE = 5 * 1024 * 1024; // 5 MB
const MAX_BODY_CHARS = 100_000;

export interface FullMessage {
  id: number;
  account: string;
  folder: string;
  date: string;
  from: string | null;
  to: unknown;
  subject: string | null;
  flags: unknown;
  gm_labels: unknown;
  classification: string | null;
  seen: boolean;
  has_attachments: boolean | null;
  body_text: string;
  truncated_note?: string;
}

/**
 * Devuelve el mensaje completo. Si el cuerpo no está cacheado, lo descarga,
 * normaliza y persiste. `raw: true` re-parsea sin recorte de firmas/citas.
 */
export async function getMessage(
  db: Db,
  cfg: Config,
  id: number,
  opts: { raw?: boolean } = {}
): Promise<FullMessage> {
  const row = getMessageRow(db, id);
  if (!row) throw new Error(`No existe ningún mensaje con id ${id} en el cache. Usa mail_list_inbox primero.`);
  const account = cfg.accounts.find((a) => a.id === row.account_id);
  if (!account) throw new Error(`El mensaje ${id} pertenece a la cuenta "${row.account_id}", que ya no está configurada.`);

  let bodyText = row.body_text;
  let hasAttachments = row.has_attachments;

  if (bodyText === null || opts.raw) {
    const result = await withAccount(account, async (client) => {
      const lock = await client.getMailboxLock(row.folder);
      try {
        if (row.size !== null && row.size > MAX_FULL_SOURCE) {
          // Mensaje enorme: descargar solo la primera parte de texto.
          const structure = await fetchBodyStructure(client, row.uid);
          const partId = findTextPart(structure);
          if (partId) {
            const dl = await client.download(String(row.uid), partId, { uid: true });
            const chunks: Buffer[] = [];
            for await (const chunk of dl.content) chunks.push(chunk as Buffer);
            const text = Buffer.concat(chunks).toString("utf8");
            return { normalized: null, plainText: text };
          }
        }
        const dl = await client.download(String(row.uid), undefined, { uid: true });
        const chunks: Buffer[] = [];
        for await (const chunk of dl.content) chunks.push(chunk as Buffer);
        const normalized = await parseAndNormalize(Buffer.concat(chunks));
        return { normalized, plainText: null };
      } finally {
        lock.release();
      }
    });

    if (result.normalized) {
      bodyText = opts.raw ? result.normalized.rawText : result.normalized.text;
      hasAttachments = result.normalized.hasAttachments ? 1 : 0;
      // Persistimos siempre la versión recortada (la canónica del cache).
      db.prepare(`UPDATE messages SET body_text = ?, snippet = ?, has_attachments = ? WHERE id = ?`).run(
        result.normalized.text,
        result.normalized.snippet,
        hasAttachments,
        id
      );
    } else if (result.plainText !== null) {
      bodyText = result.plainText;
      db.prepare(`UPDATE messages SET body_text = ?, snippet = ? WHERE id = ?`).run(
        bodyText,
        bodyText.replace(/\s+/g, " ").trim().slice(0, 200),
        id
      );
    } else {
      bodyText = "";
    }
  }

  let truncatedNote: string | undefined;
  if (bodyText.length > MAX_BODY_CHARS) {
    truncatedNote = `Cuerpo truncado a ${MAX_BODY_CHARS} caracteres (original: ${bodyText.length}).`;
    bodyText = bodyText.slice(0, MAX_BODY_CHARS);
  }

  return {
    id: row.id,
    account: row.account_id,
    folder: row.folder,
    date: row.internal_date,
    from: row.from_name ? `${row.from_name} <${row.from_addr ?? ""}>` : row.from_addr,
    to: row.to_addrs ? JSON.parse(row.to_addrs) : [],
    subject: row.subject,
    flags: row.flags ? JSON.parse(row.flags) : [],
    gm_labels: row.gm_labels ? JSON.parse(row.gm_labels) : null,
    classification: row.classification,
    seen: row.seen === 1,
    has_attachments: hasAttachments === null ? null : hasAttachments === 1,
    body_text: bodyText,
    ...(truncatedNote ? { truncated_note: truncatedNote } : {}),
  };
}

async function fetchBodyStructure(client: import("imapflow").ImapFlow, uid: number) {
  const msg = await client.fetchOne(String(uid), { bodyStructure: true }, { uid: true });
  return msg && typeof msg === "object" ? msg.bodyStructure : undefined;
}

type BodyStructureNode = {
  part?: string;
  type?: string;
  childNodes?: BodyStructureNode[];
};

/** Busca la primera parte text/plain (o text/html como fallback) en la estructura MIME. */
function findTextPart(node: BodyStructureNode | undefined): string | undefined {
  if (!node) return undefined;
  const search = (n: BodyStructureNode, want: string): string | undefined => {
    if (n.type === want) return n.part ?? "1";
    for (const child of n.childNodes ?? []) {
      const found = search(child, want);
      if (found) return found;
    }
    return undefined;
  };
  return search(node, "text/plain") ?? search(node, "text/html");
}
