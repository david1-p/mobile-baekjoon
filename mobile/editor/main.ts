import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { javascript } from '@codemirror/lang-javascript';

const modes = { Java: java, Python: python, 'C++': cpp, JavaScript: javascript };
declare global {
  interface Window {
    initial: { lang: keyof typeof modes; code: string };
    ReactNativeWebView: { postMessage(data: string): void };
    snapshot: (ticket: number) => void;
  }
}
const send = (value: object) => window.ReactNativeWebView.postMessage(JSON.stringify(value));
const view = new EditorView({
  parent: document.getElementById('editor')!,
  state: EditorState.create({
    doc: window.initial.code,
    extensions: [
      basicSetup,
      modes[window.initial.lang](),
      keymap.of([indentWithTab]),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        'aria-label': '풀이 코드',
        autocapitalize: 'off',
        autocorrect: 'off',
        spellcheck: 'false',
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) send({ kind: 'change', code: update.state.doc.toString() });
      }),
      EditorView.theme({
        '&': { height: '100%', color: '#192d3e', backgroundColor: '#fff' },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '16px',
          lineHeight: '1.65',
        },
        '.cm-gutters': {
          backgroundColor: '#f4f7f9',
          color: '#657985',
          borderRight: '1px solid #dce4e8',
        },
        '.cm-content': { paddingTop: '12px' },
      }),
    ],
  }),
});
window.snapshot = (ticket) => send({ kind: 'snapshot', ticket, code: view.state.doc.toString() });
send({ kind: 'ready' });
