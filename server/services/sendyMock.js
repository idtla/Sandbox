import fs from 'fs/promises';

const fixturePath = new URL('../../fixtures/sendy.json', import.meta.url);
const data = JSON.parse(await fs.readFile(fixturePath, 'utf-8'));

export async function getMember(list, email) {
  const members = data.lists[list]?.members || [];
  return members.find(m => m.email === email);
}

export async function upsertMember(list, member) {
  data.lists[list] = data.lists[list] || { members: [] };
  const existing = await getMember(list, member.email);
  if (existing) Object.assign(existing, member);
  else data.lists[list].members.push(member);
  return member;
}
