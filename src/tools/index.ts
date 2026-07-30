import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../types.js";
import type { Db } from "../db.js";
import { queryInbox } from "../db.js";
import { syncAccounts } from "../imap/sync.js";
import { searchGmail } from "../imap/search.js";
import { getMessage } from "../message.js";
import { classifyMessages, markSeen } from "../imap/actions.js";

interface Ctx {
  db: Db;
  cfg: Config;
}

function jsonResult(v: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(v, null, 2) }] };
}

function errorResult(e: unknown) {
  return {
    content: [{ type: "text" as const, text: (e as Error).message }],
    isError: true,
  };
}

export function registerAllTools(server: McpServer, ctx: Ctx): void {
  const { db, cfg } = ctx;
  const accountIds = cfg.accounts.map((a) => a.id);
  const classes = cfg.classification.classes;

  server.registerTool(
    "mail_list_accounts",
    {
      title: "Listar cuentas de correo",
      description:
        "Lista las cuentas configuradas con sus contadores de cache (total y no leídos) y última sincronización.",
      inputSchema: {},
    },
    async () => {
      try {
        const rows = cfg.accounts.map((a) => {
          const stats = db
            .prepare(
              `SELECT COUNT(*) AS total, SUM(CASE WHEN seen = 0 THEN 1 ELSE 0 END) AS unread
               FROM messages WHERE account_id = ? AND gone = 0`
            )
            .get(a.id) as { total: number; unread: number | null };
          const state = db
            .prepare(`SELECT last_sync_at FROM sync_state WHERE account_id = ? AND folder = 'INBOX'`)
            .get(a.id) as { last_sync_at: string | null } | undefined;
          return {
            id: a.id,
            label: a.label,
            email: a.user,
            kind: a.kind,
            last_sync_at: state?.last_sync_at ?? null,
            cached_total: stats.total,
            cached_unread: stats.unread ?? 0,
          };
        });
        return jsonResult(rows);
      } catch (e) {
        return errorResult(e);
      }
    }
  );

  server.registerTool(
    "mail_list_inbox",
    {
      title: "Bandeja de entrada unificada",
      description:
        "Lista correos del INBOX de todas las cuentas (o las indicadas), ordenados por fecha descendente. " +
        "Sincroniza con IMAP antes de listar (con throttle; refresh=true lo fuerza). " +
        "Devuelve filas ligeras; usa mail_get_message para leer un correo completo.",
      inputSchema: {
        accounts: z.array(z.enum(accountIds as [string, ...string[]])).optional()
          .describe("Ids de cuentas; por defecto todas"),
        unread_only: z.boolean().optional().describe("Solo no leídos"),
        since: z.string().optional().describe("Fecha mínima, ISO o YYYY-MM-DD"),
        until: z.string().optional().describe("Fecha máxima, ISO o YYYY-MM-DD"),
        query: z.string().optional().describe("Búsqueda simple en remitente/asunto/snippet (cache local)"),
        classification: z.string().optional()
          .describe(`Filtra por clase (${classes.join(", ")}) o "unclassified"`),
        limit: z.number().int().min(1).max(200).optional().describe("Máximo de filas (default 50)"),
        offset: z.number().int().min(0).optional(),
        refresh: z.boolean().optional().describe("Fuerza sync IMAP ignorando el throttle"),
      },
    },
    async (args) => {
      try {
        const accounts = args.accounts?.length
          ? cfg.accounts.filter((a) => args.accounts!.includes(a.id))
          : cfg.accounts;
        const syncInfo = await syncAccounts(db, cfg, accounts, { force: args.refresh });
        const res = queryInbox(db, {
          accounts: args.accounts,
          unreadOnly: args.unread_only,
          since: args.since,
          until: args.until,
          query: args.query,
          classification: args.classification,
          limit: args.limit,
          offset: args.offset,
        });
        const syncErrors = Object.entries(syncInfo)
          .filter(([, v]) => "error" in v)
          .map(([k, v]) => `${k}: ${(v as { error: string }).error}`);
        return jsonResult({
          ...(syncErrors.length ? { sync_warnings: syncErrors } : {}),
          ...res,
        });
      } catch (e) {
        return errorResult(e);
      }
    }
  );

  server.registerTool(
    "mail_get_message",
    {
      title: "Leer un correo completo",
      description:
        "Devuelve un correo completo (cuerpo en texto limpio, sin firmas ni citas). " +
        "raw=true devuelve el texto sin recortar.",
      inputSchema: {
        id: z.number().int().describe("Id del mensaje (de mail_list_inbox o mail_search_gmail)"),
        raw: z.boolean().optional().describe("Texto completo sin recorte de firmas/citas"),
      },
    },
    async (args) => {
      try {
        return jsonResult(await getMessage(db, cfg, args.id, { raw: args.raw }));
      } catch (e) {
        return errorResult(e);
      }
    }
  );

  const gmailAccounts = cfg.accounts.filter((a) => a.kind === "gmail").map((a) => a.id);
  if (gmailAccounts.length > 0) {
    server.registerTool(
      "mail_search_gmail",
      {
        title: "Búsqueda con sintaxis Gmail",
        description:
          "Busca en una cuenta Gmail con su sintaxis nativa (X-GM-RAW), p.ej. " +
          '"from:banco has:attachment newer_than:7d". Solo busca dentro de INBOX.',
        inputSchema: {
          account: z.enum(gmailAccounts as [string, ...string[]]).describe("Cuenta Gmail donde buscar"),
          raw_query: z.string().min(1).describe("Consulta en sintaxis de búsqueda de Gmail"),
          limit: z.number().int().min(1).max(100).optional().describe("Máximo de resultados (default 30)"),
        },
      },
      async (args) => {
        try {
          const account = cfg.accounts.find((a) => a.id === args.account)!;
          const items = await searchGmail(db, cfg, account, args.raw_query, args.limit ?? 30);
          return jsonResult({ total: items.length, items });
        } catch (e) {
          return errorResult(e);
        }
      }
    );
  }

  server.registerTool(
    "mail_classify",
    {
      title: "Clasificar correos",
      description:
        `Asigna una clase (${classes.join(", ")}) a uno o varios correos. ` +
        "En Gmail añade la etiqueta correspondiente (p.ej. AI/facturas-recibos) sin sacar el correo del INBOX. " +
        "La clasificación se guarda también en el cache local.",
      inputSchema: {
        ids: z.array(z.number().int()).min(1).describe("Ids de mensajes a clasificar"),
        classification: z.enum(classes as [string, ...string[]]).describe("Clase de la taxonomía"),
        apply_to_mailbox: z.boolean().optional()
          .describe("Aplicar también en el buzón real (default true)"),
      },
    },
    async (args) => {
      try {
        return jsonResult(
          await classifyMessages(db, cfg, args.ids, args.classification, args.apply_to_mailbox ?? true)
        );
      } catch (e) {
        return errorResult(e);
      }
    }
  );

  server.registerTool(
    "mail_mark_read",
    {
      title: "Marcar leído/no leído",
      description: "Marca correos como leídos o no leídos (\\Seen) en el buzón real y en el cache.",
      inputSchema: {
        ids: z.array(z.number().int()).min(1).describe("Ids de mensajes"),
        seen: z.boolean().describe("true = leído, false = no leído"),
      },
    },
    async (args) => {
      try {
        return jsonResult(await markSeen(db, cfg, args.ids, args.seen));
      } catch (e) {
        return errorResult(e);
      }
    }
  );
}
