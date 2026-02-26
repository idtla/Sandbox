#!/usr/bin/env node
/**
 * Sincroniza datos del Project Timer a un JSON estático.
 * Uso:
 *   node scripts/sync-to-json.js                    → lee desde SUPABASE (si hay env) o muestra ayuda
 *   node scripts/sync-to-json.js <ruta-al-json>     → copia ese archivo a data/store.json
 *   node scripts/sync-to-json.js --stdin             → lee JSON desde stdin y escribe en data/store.json
 *
 * Variables de entorno (opcional, para Supabase):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_TABLE (default: timer_data)
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const OUT_FILE = path.join(DATA_DIR, "store.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeStore(data) {
  ensureDataDir();
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(OUT_FILE, json, "utf8");
  console.log("Guardado en:", OUT_FILE);
}

function copyFromFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    console.error("No existe el archivo:", abs);
    process.exit(1);
  }
  const raw = fs.readFileSync(abs, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("El archivo no es un JSON válido:", e.message);
    process.exit(1);
  }
  writeStore(data);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let chunks = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (chunks += c));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(chunks));
      } catch (e) {
        reject(e);
      }
    });
    process.stdin.on("error", reject);
  });
}

async function fetchFromSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const table = process.env.SUPABASE_TABLE || "timer_data";
  if (!url || !key) {
    console.error("Para usar Supabase define SUPABASE_URL y SUPABASE_ANON_KEY");
    process.exit(1);
  }
  const res = await fetch(`${url}/rest/v1/${table}?limit=1&order=updated_at.desc`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    console.error("Error Supabase:", res.status, await res.text());
    process.exit(1);
  }
  const rows = await res.json();
  const data = rows?.[0]?.payload ?? rows?.[0];
  if (!data) {
    console.error("No hay filas o payload en la tabla. Asegúrate de tener una columna 'payload' (jsonb) o que la fila sea el store.");
    process.exit(1);
  }
  writeStore(data);
}

function showHelp() {
  console.log(`
Uso:
  node scripts/sync-to-json.js <archivo.json>   Copia archivo a data/store.json
  node scripts/sync-to-json.js --stdin           Lee JSON por stdin → data/store.json
  node scripts/sync-to-json.js                   Si hay SUPABASE_* → descarga y guarda

Ejemplos:
  # Exportas desde la app "Guardar todo en JSON", luego:
  node scripts/sync-to-json.js C:/Users/.../Descargas/project-timer-2025-02-26.json

  # Con Supabase (tabla con columna payload jsonb):
  set SUPABASE_URL=https://xxx.supabase.co
  set SUPABASE_ANON_KEY=eyJ...
  node scripts/sync-to-json.js
`);
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--help" || arg === "-h") {
    showHelp();
    return;
  }
  if (arg === "--stdin") {
    const data = await readStdin();
    writeStore(data);
    return;
  }
  if (arg) {
    copyFromFile(arg);
    return;
  }
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    await fetchFromSupabase();
    return;
  }
  showHelp();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
