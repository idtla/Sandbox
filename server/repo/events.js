import db from './db.js';

export function getEventBySlug(slug) {
  return db.prepare('SELECT * FROM events WHERE slug = ?').get(slug);
}

export function insertEvent(event) {
  const stmt = db.prepare(`INSERT INTO events (slug,title,opens_at,state,total,remaining,per_user_limit,location,hero_url,description_md,legal_md)
  VALUES (@slug,@title,@opens_at,@state,@total,@remaining,@per_user_limit,@location,@hero_url,@description_md,@legal_md)`);
  const info = stmt.run(event);
  return { ...event, id: info.lastInsertRowid };
}
