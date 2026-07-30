import { simpleParser, type ParsedMail } from "mailparser";
import { convert } from "html-to-text";

export interface NormalizedMail {
  text: string;
  rawText: string;
  snippet: string;
  hasAttachments: boolean;
  from: { name: string | null; address: string | null } | null;
  to: Array<{ name: string | null; address: string | null }>;
  subject: string | null;
  messageId: string | null;
  date: Date | null;
}

export async function parseAndNormalize(source: Buffer | string): Promise<NormalizedMail> {
  // skipHtmlToText: si el correo es solo-HTML, mailparser generaría su propio `text`
  // (encabezados en mayúsculas, [imagen.png]...); preferimos nuestra conversión controlada.
  const parsed = await simpleParser(source, { skipHtmlToText: true, skipTextToHtml: true });
  return normalizeParsed(parsed);
}

export function normalizeParsed(parsed: ParsedMail): NormalizedMail {
  const rawText = extractText(parsed);
  const text = collapseBlankLines(trimSignatureAndQuotes(rawText));
  const fromAddr = parsed.from?.value?.[0];
  const toList = Array.isArray(parsed.to) ? parsed.to : parsed.to ? [parsed.to] : [];
  return {
    text,
    rawText: collapseBlankLines(rawText),
    snippet: text.replace(/\s+/g, " ").trim().slice(0, 200),
    hasAttachments: (parsed.attachments ?? []).some((a) => a.contentDisposition !== "inline"),
    from: fromAddr ? { name: fromAddr.name || null, address: fromAddr.address ?? null } : null,
    to: toList.flatMap((t) => t.value).map((a) => ({ name: a.name || null, address: a.address ?? null })),
    subject: parsed.subject ?? null,
    messageId: parsed.messageId ?? null,
    date: parsed.date ?? null,
  };
}

function extractText(parsed: ParsedMail): string {
  if (parsed.text && parsed.text.trim().length > 0) return parsed.text;
  if (parsed.html) {
    return convert(parsed.html, {
      wordwrap: false,
      selectors: [
        { selector: "img", format: "skip" },
        { selector: "style", format: "skip" },
        { selector: "script", format: "skip" },
        { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
        { selector: "h1", options: { uppercase: false } },
        { selector: "h2", options: { uppercase: false } },
        { selector: "h3", options: { uppercase: false } },
        { selector: "h4", options: { uppercase: false } },
        { selector: "h5", options: { uppercase: false } },
        { selector: "h6", options: { uppercase: false } },
      ],
    });
  }
  return "";
}

/**
 * Recorte pragmático de firmas y cadenas de respuesta, línea a línea.
 * Primera coincidencia gana. Nunca recorta si dejaría menos del 20% del texto.
 */
export function trimSignatureAndQuotes(text: string): string {
  const lines = text.split(/\r?\n/);
  let cut = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Firma RFC 3676 ("-- ") o "--" solo.
    if (/^--\s?$/.test(line)) {
      cut = i;
      break;
    }
    // Cabeceras de respuesta ES/EN.
    if (
      /^(El|On) .{4,120} (escribió|escribió|wrote):\s*$/u.test(line) ||
      /^-{3,}\s*(Mensaje original|Original Message|Forwarded message|Mensaje reenviado)/iu.test(line)
    ) {
      cut = i;
      break;
    }
    // Bloque De:/From: + Enviado:/Sent: consecutivos (estilo Outlook).
    if (
      /^(De|From):\s/.test(line) &&
      i + 1 < lines.length &&
      /^(Enviado|Sent|Date|Fecha):\s/.test(lines[i + 1])
    ) {
      cut = i;
      break;
    }
    // Primera racha de >=3 líneas citadas con ">".
    if (line.startsWith(">")) {
      let j = i;
      while (j < lines.length && (lines[j].startsWith(">") || lines[j].trim() === "")) j++;
      if (j - i >= 3) {
        cut = i;
        break;
      }
      i = j;
    }
  }

  if (cut === lines.length) return text.trim();
  const trimmed = lines.slice(0, cut).join("\n").trim();
  if (trimmed.length < text.trim().length * 0.2) return text.trim();
  return trimmed;
}

function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
