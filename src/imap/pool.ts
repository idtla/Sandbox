import { ImapFlow } from "imapflow";
import type { AccountConfig } from "../types.js";
import { log } from "../log.js";

const IDLE_CLOSE_MS = 120_000;
const OP_TIMEOUT_MS = 30_000;

interface PoolEntry {
  client: ImapFlow | null;
  connecting: Promise<ImapFlow> | null;
  queue: Promise<unknown>;
  idleTimer: NodeJS.Timeout | null;
}

const pool = new Map<string, PoolEntry>();

function entryFor(id: string): PoolEntry {
  let e = pool.get(id);
  if (!e) {
    e = { client: null, connecting: null, queue: Promise.resolve(), idleTimer: null };
    pool.set(id, e);
  }
  return e;
}

function friendlyConnectError(account: AccountConfig, err: unknown): Error {
  const msg = String((err as Error)?.message ?? err);
  const resp = String((err as { responseText?: string })?.responseText ?? "");
  const all = `${msg} ${resp}`;
  if (/AUTHENTICATIONFAILED|Invalid credentials|LOGIN failed|authentication/i.test(all)) {
    return new Error(
      `Autenticación fallida en ${account.id} (${account.user}@${account.host}). ` +
        (account.kind === "gmail"
          ? `Revisa la app password (requiere 2FA activado en la cuenta Google) en el archivo de perfiles.`
          : `Revisa usuario/contraseña en el archivo de perfiles.`)
    );
  }
  if (/Too many simultaneous connections/i.test(all)) {
    return new Error(
      `${account.id}: Gmail rechaza la conexión por "Too many simultaneous connections". ` +
        `Cierra otros clientes IMAP (Thunderbird, móvil…) o espera unos minutos.`
    );
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i.test(all)) {
    return new Error(
      `${account.id}: no se pudo conectar a ${account.host}:${account.port} (${msg}). ` +
        `Revisa red/host. En IONOS el host puede ser imap.ionos.es o imap.ionos.com según dónde se contrató.`
    );
  }
  return new Error(`${account.id}: error IMAP: ${msg}`);
}

async function connect(account: AccountConfig): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: { user: account.user, pass: account.pass },
    logger: false,
    socketTimeout: 60_000,
  });
  try {
    await client.connect();
  } catch (e) {
    throw friendlyConnectError(account, e);
  }
  if (account.kind === "gmail" && !client.capabilities.has("X-GM-EXT-1")) {
    log.warn(`${account.id}: marcada como gmail pero el servidor no anuncia X-GM-EXT-1; tratada como generic.`);
    account.kind = "generic";
  }
  log.info(`${account.id}: conectado a ${account.host}`);
  return client;
}

async function getClient(account: AccountConfig): Promise<ImapFlow> {
  const e = entryFor(account.id);
  if (e.client && e.client.usable) return e.client;
  if (e.connecting) return e.connecting;

  e.connecting = connect(account).then(
    (client) => {
      e.client = client;
      e.connecting = null;
      const drop = () => {
        if (e.client === client) {
          e.client = null;
          log.info(`${account.id}: conexión cerrada`);
        }
      };
      client.on("close", drop);
      client.on("error", (err: Error) => {
        log.warn(`${account.id}: error de conexión: ${err.message}`);
        drop();
      });
      return client;
    },
    (err) => {
      e.connecting = null;
      throw err;
    }
  );
  return e.connecting;
}

function scheduleIdleClose(account: AccountConfig): void {
  const e = entryFor(account.id);
  if (e.idleTimer) clearTimeout(e.idleTimer);
  e.idleTimer = setTimeout(() => {
    const c = e.client;
    e.client = null;
    if (c) {
      c.logout().catch(() => c.close());
      log.info(`${account.id}: cerrada por inactividad`);
    }
  }, IDLE_CLOSE_MS);
  e.idleTimer.unref?.();
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout (${ms / 1000}s) ${what}`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Ejecuta `fn` con la conexión de la cuenta. Serializa todas las operaciones
 * por cuenta (cola de promesas) para evitar interleaving sobre la misma sesión IMAP.
 */
export function withAccount<T>(
  account: AccountConfig,
  fn: (client: ImapFlow) => Promise<T>,
  opts: { timeoutMs?: number } = {}
): Promise<T> {
  const e = entryFor(account.id);
  if (e.idleTimer) clearTimeout(e.idleTimer);
  const run = e.queue.then(async () => {
    const client = await getClient(account);
    return withTimeout(
      fn(client),
      opts.timeoutMs ?? OP_TIMEOUT_MS,
      `hablando con ${account.host} (cuenta ${account.id})`
    );
  });
  // La cola nunca debe quedarse rechazada o se atascan las siguientes llamadas.
  e.queue = run.catch(() => undefined).finally(() => scheduleIdleClose(account));
  return run;
}

/** Cierre ordenado de todas las conexiones (al terminar el proceso). */
export async function closeAll(): Promise<void> {
  for (const [id, e] of pool) {
    if (e.idleTimer) clearTimeout(e.idleTimer);
    const c = e.client;
    e.client = null;
    if (c) {
      try {
        await c.logout();
      } catch {
        c.close();
      }
      log.info(`${id}: desconectado`);
    }
  }
}
