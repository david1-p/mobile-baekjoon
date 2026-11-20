import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { editorHtml } from './editorHtml';
import type { Draft } from './model';
import { persist, useNotebook } from './store';

export type EditorHandle = { flush: () => Promise<string> };
type Pending = {
  resolve: (code: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
export const CodeEditor = forwardRef<EditorHandle, { draft: Draft; onReady: () => void }>(
  function CodeEditor({ draft, onReady }, ref) {
    const web = useRef<WebView<object>>(null);
    const serial = useRef(0);
    const pending = useRef(new Map<number, Pending>()).current;
    // A WebView belongs to one (problem, language). Never reload on a keystroke.
    const [source] = useState(() => ({ html: editorHtml(draft) }));
    useEffect(
      () => () => {
        for (const p of pending.values()) {
          clearTimeout(p.timer);
          p.reject(Error('편집기가 닫혔습니다.'));
        }
        pending.clear();
      },
      [pending],
    );
    useImperativeHandle(
      ref,
      () => ({
        flush: () =>
          new Promise<string>((resolve, reject) => {
            const ticket = ++serial.current;
            const timer = setTimeout(() => {
              pending.delete(ticket);
              reject(Error('편집기가 응답하지 않습니다. 다시 시도하세요.'));
            }, 3500);
            pending.set(ticket, { resolve, reject, timer });
            web.current?.injectJavaScript(`window.snapshot && window.snapshot(${ticket}); true;`);
          }),
      }),
      [pending],
    );
    return (
      <WebView<object>
        ref={web}
        source={source}
        originWhitelist={['*']}
        scrollEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        keyboardDisplayRequiresUserAction={false}
        onShouldStartLoadWithRequest={(r) =>
          r.url === 'about:blank' || r.url === 'about:srcdoc' || r.url.startsWith('data:text/html')
        }
        onMessage={(event) => {
          let msg;
          try {
            msg = JSON.parse(event.nativeEvent.data);
          } catch {
            return;
          }
          if (msg?.kind === 'ready') {
            onReady();
            return;
          }
          if (!msg || typeof msg.code !== 'string' || !['snapshot', 'change'].includes(msg.kind))
            return;
          const waiter = msg.kind === 'snapshot' ? pending.get(msg.ticket) : undefined;
          if (waiter) {
            clearTimeout(waiter.timer);
            pending.delete(msg.ticket);
          }
          try {
            const current = useNotebook.getState().draft;
            if (
              msg.kind === 'change' ||
              current?.code !== msg.code ||
              useNotebook.getState().error
            ) {
              persist(draft, draft.lang, msg.code);
            }
            waiter?.resolve(msg.code);
          } catch {
            const error = '기기에 저장하지 못했습니다. 편집기를 유지하고 저장 공간을 확인하세요.';
            useNotebook.setState({ error });
            waiter?.reject(Error(error));
          }
        }}
      />
    );
  },
);
