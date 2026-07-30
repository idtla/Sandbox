// Logging para un servidor MCP por stdio: TODO va a stderr.
// stdout está reservado en exclusiva para el framing JSON-RPC.

function ts(): string {
  return new Date().toISOString();
}

function write(level: string, msg: string, extra?: unknown): void {
  const line =
    extra === undefined
      ? `[${ts()}] ${level} ${msg}`
      : `[${ts()}] ${level} ${msg} ${safeStringify(extra)}`;
  process.stderr.write(line + "\n");
}

function safeStringify(v: unknown): string {
  try {
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export const log = {
  info: (msg: string, extra?: unknown) => write("INFO ", msg, extra),
  warn: (msg: string, extra?: unknown) => write("WARN ", msg, extra),
  error: (msg: string, extra?: unknown) => write("ERROR", msg, extra),
};

/** Redirige console.log/info a stderr por si alguna dependencia lo usa. */
export function hardenStdout(): void {
  console.log = (...args: unknown[]) => console.error(...args);
  console.info = (...args: unknown[]) => console.error(...args);
}
