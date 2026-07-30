import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { hardenStdout, log } from "./log.js";
import { loadConfig } from "./config.js";
import { openDb } from "./db.js";
import { registerAllTools } from "./tools/index.js";
import { closeAll } from "./imap/pool.js";

hardenStdout(); // stdout es solo para JSON-RPC

const cfg = loadConfig();
const db = openDb(cfg.dbPath);

const server = new McpServer({ name: "mail-mcp", version: "0.1.0" });
registerAllTools(server, { db, cfg });

const transport = new StdioServerTransport();
await server.connect(transport);
log.info(
  `mail-mcp arrancado: ${cfg.accounts.length} cuenta(s) [${cfg.accounts.map((a) => a.id).join(", ")}], db=${cfg.dbPath}`
);

async function shutdown(): Promise<void> {
  try {
    await closeAll();
  } finally {
    process.exit(0);
  }
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
