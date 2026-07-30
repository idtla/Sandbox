// Smoke test sin credenciales: normalize + db + queryInbox
import { trimSignatureAndQuotes, parseAndNormalize } from "../src/normalize.js";
import { openDb, queryInbox, getMessageRow } from "../src/db.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown): void {
  if (cond) console.error(`  OK  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}`, extra ?? "");
  }
}

// --- normalize: recorte de firmas y citas ---
const reply = `Gracias, me parece bien.

Nos vemos el jueves.

El mar, 28 jul 2026 a las 10:02, Juan Pérez (<juan@example.com>) escribió:
> Hola,
> ¿te viene bien el jueves?
> Un saludo
> Juan`;
const trimmed = trimSignatureAndQuotes(reply);
check("recorta cabecera de reply ES + citas", !trimmed.includes("escribió:") && !trimmed.includes("> Hola"), trimmed);
check("conserva el contenido propio", trimmed.includes("Nos vemos el jueves."));

const signed = `Te confirmo la reserva.

--
Íñigo
Knowmad Project
Tel: 600 000 000`;
const trimmed2 = trimSignatureAndQuotes(signed);
check("recorta firma RFC 3676", !trimmed2.includes("Knowmad"), trimmed2);
check("conserva cuerpo antes de firma", trimmed2.includes("Te confirmo la reserva."));

const shortMail = `-- \nSolo firma`;
check("no recorta si quedaría <20%", trimSignatureAndQuotes(shortMail).length > 0);

// --- normalize: parseo MIME de un correo HTML-only ---
const rawMime = Buffer.from(
  [
    "From: Newsletter <news@example.com>",
    "To: yo@example.com",
    "Subject: =?UTF-8?B?T2ZlcnRhIGRlIHZlcmFubw==?=",
    "Message-ID: <abc123@example.com>",
    "Date: Tue, 29 Jul 2026 08:00:00 +0200",
    "Content-Type: text/html; charset=utf-8",
    "",
    "<html><body><h1>Oferta de verano</h1><p>Hasta el <b>50%</b> de descuento.</p><img src='x.png'><style>.a{}</style></body></html>",
  ].join("\r\n")
);
const norm = await parseAndNormalize(rawMime);
check("HTML → texto", norm.text.includes("Oferta de verano") && norm.text.includes("50%"), norm.text);
check("sin restos de markup", !norm.text.includes("<") && !norm.text.includes(".a{}"));
check("subject decodificado RFC 2047", norm.subject === "Oferta de verano", norm.subject);
check("from parseado", norm.from?.address === "news@example.com");
check("snippet <= 200", norm.snippet.length <= 200 && norm.snippet.length > 0);

// --- db: esquema + inserción + queryInbox ---
const dbPath = join(tmpdir(), `mail-mcp-smoke-${process.pid}.db`);
const db = openDb(dbPath);
const ins = db.prepare(
  `INSERT INTO messages (account_id, folder, uid, uidvalidity, message_id, internal_date, from_addr, from_name, subject, snippet, seen)
   VALUES (?, 'INBOX', ?, 1, ?, ?, ?, ?, ?, ?, ?)`
);
ins.run("gmail-a", 1, "<m1@x>", "2026-07-29T10:00:00.000Z", "ana@x.com", "Ana", "Factura julio", "Adjunto la factura de julio", 0);
ins.run("gmail-a", 2, "<m2@x>", "2026-07-30T09:00:00.000Z", "bob@x.com", "Bob", "Re: reunión", "Confirmo la reunión del viernes", 1);
ins.run("ionos-b", 5, "<m3@x>", "2026-07-30T11:00:00.000Z", "eva@x.com", null, "Presupuesto", "Le envío el presupuesto solicitado", 0);

const all = queryInbox(db, {});
check("queryInbox: 3 mensajes, orden desc", all.total_matching === 3 && all.items[0].subject === "Presupuesto", all);
const unread = queryInbox(db, { unreadOnly: true });
check("filtro unread", unread.total_matching === 2);
const byAcc = queryInbox(db, { accounts: ["gmail-a"] });
check("filtro cuenta", byAcc.total_matching === 2);
const byText = queryInbox(db, { query: "factura" });
check("búsqueda LIKE", byText.total_matching === 1 && byText.items[0].from === "Ana <ana@x.com>");
const bySince = queryInbox(db, { since: "2026-07-30" });
check("filtro since", bySince.total_matching === 2);
check("getMessageRow", getMessageRow(db, 1)?.subject === "Factura julio");
const unclassified = queryInbox(db, { classification: "unclassified" });
check("filtro unclassified", unclassified.total_matching === 3);

db.close();
rmSync(dbPath, { force: true });
try { rmSync(dbPath + "-wal", { force: true }); rmSync(dbPath + "-shm", { force: true }); } catch {}

console.error(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
