// CLI manual de pruebas por fase. Uso: npx tsx scripts/try.ts <cmd> [args]
//   config                      — muestra la config cargada (pass ofuscada)
//   connect <account>           — capabilities + carpetas + últimos 10 envelopes
//   sync <account> [--force]    — sync incremental del INBOX
//   list [--unread] [--account id] — lista desde el cache SQLite
//   get <id> [--raw]            — mensaje completo normalizado
//   classify <id> <clase>       — clasifica y aplica en el buzón
//   seen <id> <true|false>      — marca leído/no leído
import { loadConfig, maskedAccount, profilesPath } from "../src/config.js";
import { hardenStdout } from "../src/log.js";

hardenStdout();

const [cmd, ...args] = process.argv.slice(2);

function out(v: unknown): void {
  // try.ts NO es el servidor MCP: aquí sí imprimimos a stdout para el humano.
  process.stdout.write(JSON.stringify(v, null, 2) + "\n");
}

async function main(): Promise<void> {
  switch (cmd) {
    case "config": {
      const cfg = loadConfig();
      out({
        profiles: profilesPath(),
        dbPath: cfg.dbPath,
        sync: cfg.sync,
        classification: cfg.classification,
        accounts: cfg.accounts.map(maskedAccount),
      });
      break;
    }
    case "connect": {
      const cfg = loadConfig();
      const { withAccount } = await import("../src/imap/pool.js");
      const account = cfg.accounts.find((a) => a.id === args[0]);
      if (!account) throw new Error(`Cuenta desconocida: ${args[0]}. Hay: ${cfg.accounts.map((a) => a.id).join(", ")}`);
      await withAccount(account, async (client) => {
        out({ capabilities: [...client.capabilities.keys()], gmail: client.capabilities.has("X-GM-EXT-1") });
        const folders = await client.list();
        out(folders.map((f) => ({ path: f.path, delimiter: f.delimiter, specialUse: f.specialUse ?? null })));
        const lock = await client.getMailboxLock("INBOX");
        try {
          const mb = client.mailbox;
          const total = typeof mb === "object" && mb ? mb.exists : 0;
          out({ inbox_total: total, uidValidity: typeof mb === "object" && mb ? String(mb.uidValidity) : null });
          if (total > 0) {
            const from = Math.max(1, total - 9);
            for await (const msg of client.fetch(`${from}:*`, { envelope: true, flags: true, internalDate: true })) {
              out({
                uid: msg.uid,
                date: msg.internalDate,
                from: msg.envelope?.from?.[0]?.address,
                subject: msg.envelope?.subject,
                seen: msg.flags?.has("\\Seen"),
              });
            }
          }
        } finally {
          lock.release();
        }
      });
      break;
    }
    case "sync": {
      const cfg = loadConfig();
      const { openDb } = await import("../src/db.js");
      const { syncAccount } = await import("../src/imap/sync.js");
      const db = openDb(cfg.dbPath);
      const ids = args[0] && !args[0].startsWith("--") ? [args[0]] : cfg.accounts.map((a) => a.id);
      for (const id of ids) {
        const account = cfg.accounts.find((a) => a.id === id);
        if (!account) throw new Error(`Cuenta desconocida: ${id}`);
        const res = await syncAccount(db, cfg, account, { force: args.includes("--force") });
        out({ account: id, ...res });
      }
      break;
    }
    case "list": {
      const cfg = loadConfig();
      const { openDb } = await import("../src/db.js");
      const { queryInbox } = await import("../src/db.js");
      const db = openDb(cfg.dbPath);
      const accountFlag = args.indexOf("--account");
      const res = queryInbox(db, {
        accounts: accountFlag >= 0 ? [args[accountFlag + 1]] : undefined,
        unreadOnly: args.includes("--unread"),
        limit: 20,
      });
      out(res);
      break;
    }
    case "get": {
      const cfg = loadConfig();
      const { openDb } = await import("../src/db.js");
      const { getMessage } = await import("../src/message.js");
      const db = openDb(cfg.dbPath);
      const res = await getMessage(db, cfg, Number(args[0]), { raw: args.includes("--raw") });
      out(res);
      break;
    }
    case "classify": {
      const cfg = loadConfig();
      const { openDb } = await import("../src/db.js");
      const { classifyMessages } = await import("../src/imap/actions.js");
      const db = openDb(cfg.dbPath);
      const res = await classifyMessages(db, cfg, [Number(args[0])], args[1], true);
      out(res);
      break;
    }
    case "seen": {
      const cfg = loadConfig();
      const { openDb } = await import("../src/db.js");
      const { markSeen } = await import("../src/imap/actions.js");
      const db = openDb(cfg.dbPath);
      const res = await markSeen(db, cfg, [Number(args[0])], args[1] !== "false");
      out(res);
      break;
    }
    default:
      process.stderr.write(
        "Comandos: config | connect <acc> | sync [acc] [--force] | list [--unread] [--account id] | get <id> [--raw] | classify <id> <clase> | seen <id> <bool>\n"
      );
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    process.stderr.write(`ERROR: ${(e as Error).message}\n`);
    process.exit(1);
  });
