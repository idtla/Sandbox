import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { Config } from "./types.js";
import { log } from "./log.js";

const accountSchema = z.object({
  label: z.string().min(1).optional(),
  host: z.string().min(1),
  port: z.number().int().positive().default(993),
  secure: z.boolean().default(true),
  user: z.string().min(3),
  pass: z.string().min(1),
  kind: z.enum(["gmail", "generic"]).optional(),
});

const configSchema = z.object({
  accounts: z.record(z.string().min(1), accountSchema),
  sync: z
    .object({
      windowDays: z.number().int().positive().max(3650).default(90),
      refreshSeconds: z.number().int().nonnegative().default(60),
    })
    .default({}),
  classification: z
    .object({
      classes: z
        .array(z.string().regex(/^[a-z0-9-]+$/, "solo minúsculas, dígitos y guiones"))
        .min(1)
        .default([
          "accion-requerida",
          "facturas-recibos",
          "citas-eventos",
          "personal",
          "newsletters",
          "notificaciones-automaticas",
          "promociones",
          "spam-sospechoso",
        ]),
      gmailLabelPrefix: z.string().default("AI/"),
      genericFolderPrefix: z.string().default("INBOX.AI-"),
      autoCreate: z.boolean().default(true),
      moveOnClassify: z
        .object({
          gmail: z.boolean().default(false),
          generic: z.boolean().default(false),
        })
        .default({}),
    })
    .default({}),
  dbPath: z.string().optional(),
});

export function defaultDataDir(): string {
  const base =
    process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? ".", "AppData", "Local");
  return join(base, "mail-mcp");
}

export function profilesPath(): string {
  return process.env.IMAP_MCP_CONFIG ?? join(defaultDataDir(), "profiles.json");
}

export function loadConfig(): Config {
  const path = profilesPath();
  if (!existsSync(path)) {
    log.error(
      `No existe el archivo de perfiles: ${path}\n` +
        `Créalo a partir de imap.profiles.example.json (en la raíz del repo) ` +
        `o define IMAP_MCP_CONFIG con la ruta correcta.`
    );
    process.exit(1);
  }

  let rawText: string;
  try {
    rawText = readFileSync(path, "utf8");
  } catch (e) {
    log.error(`No se pudo leer ${path}: ${(e as Error).message}`);
    process.exit(1);
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawText);
  } catch (e) {
    log.error(`${path} no es JSON válido: ${(e as Error).message}`);
    process.exit(1);
  }

  const parsed = configSchema.safeParse(rawJson);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(raíz)"}: ${i.message}`)
      .join("\n");
    log.error(`Configuración inválida en ${path}:\n${issues}`);
    process.exit(1);
  }

  const cfg = parsed.data;
  const accounts = Object.entries(cfg.accounts).map(([id, a]) => {
    const kind = a.kind ?? (a.host === "imap.gmail.com" ? "gmail" : "generic");
    return {
      id,
      label: a.label ?? id,
      host: a.host,
      port: a.port,
      secure: a.secure,
      user: a.user,
      // Google muestra las app passwords con espacios ("abcd efgh ..."): los quitamos.
      pass: a.pass.replace(/\s+/g, ""),
      kind,
    };
  });

  if (accounts.length === 0) {
    log.error(`${path} no define ninguna cuenta en "accounts".`);
    process.exit(1);
  }

  return {
    accounts,
    sync: cfg.sync,
    classification: cfg.classification,
    dbPath: cfg.dbPath ?? join(defaultDataDir(), "mail.db"),
  };
}

/** Para logs y try.ts: nunca imprimir la contraseña. */
export function maskedAccount(a: { id: string; label: string; host: string; user: string; kind: string }) {
  return { id: a.id, label: a.label, host: a.host, user: a.user, kind: a.kind, pass: "••••••••" };
}
