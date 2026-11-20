import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
const result = await build({
  entryPoints: ['editor/main.ts'],
  bundle: true,
  write: false,
  minify: true,
  target: ['safari15', 'chrome100'],
  legalComments: 'eof',
  format: 'iife',
});
await mkdir('src/generated', { recursive: true });
await writeFile(
  'src/generated/editor.ts',
  'export default ' + JSON.stringify(result.outputFiles[0].text) + ';\n',
);
