import { openDatabaseSync } from 'expo-sqlite';
import { templates, type Draft, type Language, type Problem } from './model';

let connection: ReturnType<typeof openDatabaseSync> | undefined;
function db() {
  if (!connection) {
    const c = openDatabaseSync('pocket-judge.db');
    c.execSync(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS drafts (
        id INTEGER NOT NULL, lang TEXT NOT NULL, title TEXT NOT NULL, code TEXT NOT NULL,
        modified INTEGER NOT NULL, PRIMARY KEY (id, lang)
      );`);
    connection = c;
  }
  return connection;
}
export function recent(): (Problem & { lang: Language })[] {
  return db().getAllSync<Problem & { lang: Language }>(
    'SELECT id, lang, title FROM drafts ORDER BY modified DESC, rowid DESC LIMIT 30',
  );
}
export function loadDraft(problem: Problem, lang: Language): Draft {
  return (
    db().getFirstSync<Draft>(
      'SELECT id, lang, title, code FROM drafts WHERE id=? AND lang=?',
      problem.id,
      lang,
    ) ?? { ...problem, lang, code: templates[lang] }
  );
}
export function saveDraft(draft: Draft) {
  db().runSync(
    `INSERT INTO drafts(id,lang,title,code,modified) VALUES (?,?,?,?,?)
    ON CONFLICT(id,lang) DO UPDATE SET title=excluded.title,code=excluded.code,modified=excluded.modified`,
    draft.id,
    draft.lang,
    draft.title,
    draft.code,
    Date.now(),
  );
}
