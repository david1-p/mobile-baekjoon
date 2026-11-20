import script from './generated/editor';
import type { Draft } from './model';

const escapeScript = (value: string) => value.replace(/</g, '\\u003c');

export function editorHtml(draft: Draft) {
  return `<!doctype html><html lang="ko"><head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
      <style>html,body,#editor{height:100%;margin:0}</style></head><body><div id="editor"></div>
      <script>window.initial=${escapeScript(JSON.stringify({ code: draft.code, lang: draft.lang }))}</script>
      <script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
}
