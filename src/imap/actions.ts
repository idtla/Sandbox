/**
 * ÚNICA superficie de escritura sobre los buzones de todo el proyecto.
 *
 * Operaciones permitidas, y ninguna más:
 *   - añadir/quitar la flag \Seen
 *   - añadir/quitar etiquetas Gmail derivadas de la taxonomía (X-GM-LABELS)
 *   - messageMove a carpetas derivadas de la taxonomía
 *   - mailboxCreate de esas mismas etiquetas/carpetas
 *
 * Aquí no existe (ni debe existir nunca) messageDelete, append ni la flag \Deleted.
 */
import type { AccountConfig, Config } from "../types.js";
import type { Db } from "../db.js";
import { getMessageRow } from "../db.js";
import { withAccount } from "./pool.js";
import { log } from "../log.js";

export interface ActionResult {
  updated: number[];
  applied_in_mailbox: boolean;
  errors: Array<{ id: number; reason: string }>;
}

function labelForClass(cfg: Config, cls: string): string {
  return `${cfg.classification.gmailLabelPrefix}${cls}`;
}

function folderForClass(cfg: Config, cls: string): string {
  return `${cfg.classification.genericFolderPrefix}${cls}`;
}

function assertValidClass(cfg: Config, cls: string): void {
  if (!cfg.classification.classes.includes(cls)) {
    throw new Error(
      `Clasificación inválida: "${cls}". Las válidas son: ${cfg.classification.classes.join(", ")}`
    );
  }
}

/**
 * Clasifica mensajes: persiste en SQLite y (opcionalmente) lo aplica en el buzón.
 * Gmail: añade la etiqueta AI/<clase> (y quita la etiqueta AI/* anterior si reclasifica).
 * Generic (IONOS): si moveOnClassify.generic, messageMove a la carpeta; si no, solo SQLite.
 */
export async function classifyMessages(
  db: Db,
  cfg: Config,
  ids: number[],
  cls: string,
  applyToMailbox: boolean
): Promise<ActionResult> {
  assertValidClass(cfg, cls);
  const result: ActionResult = { updated: [], applied_in_mailbox: false, errors: [] };
  const now = new Date().toISOString();

  for (const id of ids) {
    const row = getMessageRow(db, id);
    if (!row) {
      result.errors.push({ id, reason: "id no encontrado en el cache" });
      continue;
    }
    const account = cfg.accounts.find((a) => a.id === row.account_id);
    if (!account) {
      result.errors.push({ id, reason: `cuenta "${row.account_id}" ya no configurada` });
      continue;
    }

    const previousClass = row.classification;
    let applied = 0;

    if (applyToMailbox) {
      try {
        if (account.kind === "gmail") {
          await applyGmailLabel(cfg, account, row.folder, row.uid, cls, previousClass);
          applied = 1;
          result.applied_in_mailbox = true;
        } else if (cfg.classification.moveOnClassify.generic) {
          await moveToFolder(cfg, account, row.folder, row.uid, cls);
          applied = 1;
          result.applied_in_mailbox = true;
          // El mensaje ya no está en INBOX: lo marcamos gone para que no aparezca en listados.
          db.prepare(`UPDATE messages SET gone = 1 WHERE id = ?`).run(id);
        }
        // generic sin moveOnClassify: no se toca el buzón, solo SQLite (decisión de config).
      } catch (e) {
        result.errors.push({ id, reason: (e as Error).message });
        // Persistimos la clasificación igualmente, con applied=0.
      }
    }

    db.prepare(
      `UPDATE messages SET classification = ?, classified_at = ?, classified_applied = ? WHERE id = ?`
    ).run(cls, now, applied, id);
    result.updated.push(id);
  }
  return result;
}

async function applyGmailLabel(
  cfg: Config,
  account: AccountConfig,
  folder: string,
  uid: number,
  cls: string,
  previousClass: string | null
): Promise<void> {
  const label = labelForClass(cfg, cls);
  await withAccount(account, async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const range = String(uid);
      const doAdd = () => client.messageFlagsAdd(range, [label], { uid: true, useLabels: true });
      let ok = await doAdd();
      if (!ok && cfg.classification.autoCreate) {
        // La etiqueta puede no existir: crearla (crear un mailbox en Gmail crea la etiqueta) y reintentar.
        try {
          await client.mailboxCreate(label);
          log.info(`${account.id}: etiqueta creada: ${label}`);
        } catch {
          // ALREADYEXISTS u otro: el reintento decidirá.
        }
        ok = await doAdd();
      }
      if (!ok) {
        throw new Error(
          `No se pudo aplicar la etiqueta "${label}" en ${account.id}` +
            (cfg.classification.autoCreate ? "." : `. Créala en Gmail o activa classification.autoCreate.`)
        );
      }
      if (previousClass && previousClass !== cls) {
        const oldLabel = labelForClass(cfg, previousClass);
        await client.messageFlagsRemove(range, [oldLabel], { uid: true, useLabels: true });
      }
    } finally {
      lock.release();
    }
  });
}

async function moveToFolder(
  cfg: Config,
  account: AccountConfig,
  folder: string,
  uid: number,
  cls: string
): Promise<void> {
  const dest = folderForClass(cfg, cls);
  await withAccount(account, async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const range = String(uid);
      try {
        const res = await client.messageMove(range, dest, { uid: true });
        if (!res) throw new Error("messageMove devolvió false");
      } catch (e) {
        if (!cfg.classification.autoCreate) {
          throw new Error(
            `No existe la carpeta "${dest}" en ${account.id}. Créala o activa classification.autoCreate. (${(e as Error).message})`
          );
        }
        await client.mailboxCreate(dest);
        log.info(`${account.id}: carpeta creada: ${dest}`);
        const res = await client.messageMove(range, dest, { uid: true });
        if (!res) throw new Error(`No se pudo mover a "${dest}" en ${account.id} tras crear la carpeta.`);
      }
    } finally {
      lock.release();
    }
  });
}

/** Marca mensajes como leídos/no leídos (\Seen) en el buzón y en el cache. */
export async function markSeen(db: Db, cfg: Config, ids: number[], seen: boolean): Promise<ActionResult> {
  const result: ActionResult = { updated: [], applied_in_mailbox: false, errors: [] };

  for (const id of ids) {
    const row = getMessageRow(db, id);
    if (!row) {
      result.errors.push({ id, reason: "id no encontrado en el cache" });
      continue;
    }
    const account = cfg.accounts.find((a) => a.id === row.account_id);
    if (!account) {
      result.errors.push({ id, reason: `cuenta "${row.account_id}" ya no configurada` });
      continue;
    }
    try {
      await withAccount(account, async (client) => {
        const lock = await client.getMailboxLock(row.folder);
        try {
          const range = String(row.uid);
          const ok = seen
            ? await client.messageFlagsAdd(range, ["\\Seen"], { uid: true })
            : await client.messageFlagsRemove(range, ["\\Seen"], { uid: true });
          if (!ok) throw new Error(`el servidor rechazó el cambio de \\Seen`);
        } finally {
          lock.release();
        }
      });
      db.prepare(`UPDATE messages SET seen = ? WHERE id = ?`).run(seen ? 1 : 0, id);
      result.updated.push(id);
      result.applied_in_mailbox = true;
    } catch (e) {
      result.errors.push({ id, reason: (e as Error).message });
    }
  }
  return result;
}
