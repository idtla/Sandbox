export type AccountKind = "gmail" | "generic";

export interface AccountConfig {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  kind: AccountKind;
}

export interface ClassificationConfig {
  classes: string[];
  gmailLabelPrefix: string;
  genericFolderPrefix: string;
  autoCreate: boolean;
  moveOnClassify: { gmail: boolean; generic: boolean };
}

export interface Config {
  accounts: AccountConfig[];
  sync: { windowDays: number; refreshSeconds: number };
  classification: ClassificationConfig;
  dbPath: string;
}

/** Fila ligera para listados. */
export interface MessageRow {
  id: number;
  account_id: string;
  folder: string;
  uid: number;
  uidvalidity: number;
  message_id: string | null;
  internal_date: string;
  from_addr: string | null;
  from_name: string | null;
  to_addrs: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  flags: string | null;
  seen: number;
  answered: number;
  has_attachments: number | null;
  size: number | null;
  gm_labels: string | null;
  classification: string | null;
  classified_at: string | null;
  classified_applied: number;
  gone: number;
}
