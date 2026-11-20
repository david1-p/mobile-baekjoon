import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { bojLinks } from '../src/model.ts';

// Run the production storage and Zustand code with SQLite itself. Substitute
// only the four expo-sqlite calls that normally cross the native bridge.
async function notebook(database) {
  const bundle = await build({
    stdin: {
      contents: "export * from './src/store'; export { recent } from './src/storage';",
      resolveDir: process.cwd(),
    },
    platform: 'node',
    format: 'cjs',
    bundle: true,
    write: false,
    plugins: [
      {
        name: 'native-sqlite',
        setup(b) {
          b.onResolve({ filter: /^expo-sqlite$/ }, () => ({
            path: 'adapter',
            namespace: 'native',
          }));
          b.onLoad({ filter: /.*/, namespace: 'native' }, () => ({
            contents: 'exports.openDatabaseSync = () => adapter;',
          }));
        },
      },
    ],
  });
  const adapter = {
    execSync: (sql) => database.exec(sql),
    runSync: (sql, ...p) => database.prepare(sql).run(...p),
    getFirstSync: (sql, ...p) => database.prepare(sql).get(...p),
    getAllSync: (sql, ...p) => database.prepare(sql).all(...p),
  };
  const module = { exports: {} };
  Function(
    'module',
    'exports',
    'adapter',
    bundle.outputFiles[0].text,
  )(module, module.exports, adapter);
  return module.exports;
}
test('official links use the selected BOJ number and encode the optional handle', () => {
  assert.deepEqual(bojLinks(1000), {
    problem: 'https://acmicpc.net/problem/1000',
    submit: 'https://acmicpc.net/submit/1000',
    status: 'https://acmicpc.net/status?problem_id=1000',
  });
  assert.equal(
    bojLinks(42, ' a&b ').status,
    'https://acmicpc.net/status?problem_id=42&user_id=a%26b',
  );
  assert.throws(() => bojLinks(NaN));
});
test('production persistence isolates languages, handles late writes and restores intentionally empty code', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const app = await notebook(db);
    const one = { id: 1000, title: 'test' },
      two = { id: 1001, title: 'test 2' };
    app.restore();
    app.persist(one, 'Python', 'print("한글")');
    app.select(one, 'Java');
    app.persist(one, 'Java', 'class Main {}');
    app.select(two, 'Python');
    app.persist(two, 'Python', 'print(2)');
    app.persist(one, 'Java', '// late message');
    assert.equal(app.useNotebook.getState().draft.id, 1001);
    app.select(one, 'Python');
    assert.equal(app.useNotebook.getState().draft.code, 'print("한글")');
    app.select(one, 'Java');
    app.persist(one, 'Java', '');
    // Force deterministic ordering even on hosts with millisecond-resolution clocks.
    db.prepare('UPDATE drafts SET modified=modified+1000 WHERE id=1000 AND lang=?').run('Java');
    const fresh = await notebook(db);
    fresh.restore();
    assert.equal(fresh.useNotebook.getState().draft.lang, 'Java');
    assert.equal(fresh.useNotebook.getState().draft.code, '');
    assert.equal(fresh.recent().length, 3);
  } finally {
    db.close();
  }
});
test('both native targets and iPad are configured', () => {
  const { expo } = JSON.parse(readFileSync('app.json', 'utf8'));
  assert.deepEqual(expo.platforms, ['android', 'ios']);
  assert.equal(expo.ios.supportsTablet, true);
});
