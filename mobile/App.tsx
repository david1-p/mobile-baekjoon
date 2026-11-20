import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { CodeEditor, type EditorHandle } from './src/CodeEditor';
import { bojLinks, languages, type Language, type Problem } from './src/model';
import { restore, select, useNotebook } from './src/store';
import { SearchPanel } from './src/SearchPanel';
import { accent, Button, ink, styles } from './src/ui';

function Notebook() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 760 && height >= 480;
  const draft = useNotebook((s) => s.draft);
  const error = useNotebook((s) => s.error);
  const [pane, setPane] = useState<'find' | 'edit'>('edit');
  const [menu, setMenu] = useState<'language' | 'status' | null>(null);
  const [handle, setHandle] = useState('');
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initError, setInitError] = useState('');
  const [historyRevision, setHistoryRevision] = useState(0);
  const editor = useRef<EditorHandle>(null);
  const changing = useRef(false);
  const showEditor = wide || pane === 'edit';
  function boot() {
    try {
      restore();
      setInitError('');
    } catch {
      setInitError('기기의 풀이 저장소를 열 수 없습니다.');
    }
  }
  useEffect(boot, []);
  useEffect(() => {
    let lastSavedKey = '';
    return useNotebook.subscribe((state, prev) => {
      if (
        state.draft &&
        prev.draft &&
        state.draft.id === prev.draft.id &&
        state.draft.lang === prev.draft.lang &&
        state.draft !== prev.draft
      ) {
        setSaved(true);
        const key = state.draft.id + '/' + state.draft.lang;
        if (lastSavedKey !== key) setHistoryRevision((n) => n + 1);
        lastSavedKey = key;
      }
    });
  }, []);
  async function action(fn: (code: string) => Promise<void> | void) {
    if (changing.current || !draft) return;
    changing.current = true;
    try {
      const code = editor.current ? await editor.current.flush() : draft.code;
      await fn(code);
    } catch (e) {
      Alert.alert('작업을 완료하지 못했습니다', (e as Error).message);
    } finally {
      changing.current = false;
    }
  }
  function choose(p: Problem, lang = draft?.lang ?? 'Python') {
    void action(() => {
      Keyboard.dismiss();
      if (p.id !== draft?.id || lang !== draft.lang || !showEditor) {
        setReady(false);
        setSaved(false);
      }
      select(p, lang);
      setMenu(null);
      setPane('edit');
    });
  }
  if (!draft)
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 }}>
        {initError ? (
          <>
            <Text>{initError}</Text>
            <Button label="다시 열기" onPress={boot} />
          </>
        ) : (
          <ActivityIndicator />
        )}
      </SafeAreaView>
    );
  const links = bojLinks(draft.id, handle);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#edf3ef' }}>
      <StatusBar barStyle="dark-content" />
      <View
        style={{
          paddingHorizontal: 16,
          minHeight: 48,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 21, fontWeight: '800', color: ink, letterSpacing: -0.7 }}>
          Pocket Judge
        </Text>
        {!wide && (
          <Button
            label={pane === 'edit' ? '문제 찾기' : '풀이로 돌아가기'}
            onPress={() =>
              void action(() => {
                Keyboard.dismiss();
                setReady(false);
                setPane(pane === 'edit' ? 'find' : 'edit');
              })
            }
          />
        )}
      </View>
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {(wide || pane === 'find') && (
          <View
            style={wide ? { width: 290, borderRightWidth: 1, borderColor: '#cbd8d1' } : { flex: 1 }}
          >
            <SearchPanel onSelect={choose} historyRevision={historyRevision} />
          </View>
        )}
        {showEditor && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, minWidth: 0, padding: 10, gap: 6 }}
          >
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>
                  백준 #{draft.id}
                </Text>
                <Text numberOfLines={1} style={styles.title}>
                  {draft.title}
                </Text>
              </View>
              <Button
                label="문제 원문 ↗"
                onPress={() => void action(() => Linking.openURL(links.problem))}
              />
            </View>
            <View
              style={{
                flex: 1,
                minHeight: 80,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#c5d3cb',
                borderRadius: 12,
                backgroundColor: 'white',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  paddingHorizontal: 8,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f4f7f4',
                }}
              >
                <Button label={draft.lang + ' ▾'} onPress={() => setMenu('language')} />
                <Text style={styles.body}>
                  {error
                    ? '저장 실패'
                    : !ready
                      ? '편집기 여는 중'
                      : saved
                        ? '기기에 저장됨'
                        : '자동 저장 켜짐'}
                </Text>
              </View>
              <CodeEditor
                key={draft.id + '/' + draft.lang}
                ref={editor}
                draft={draft}
                onReady={() => setReady(true)}
              />
            </View>
            {!!error && (
              <Text accessibilityRole="alert" style={{ color: '#923928' }}>
                {error}
              </Text>
            )}
            <View style={styles.row}>
              <Button
                primary
                disabled={!ready}
                label="코드 복사 · 제출 페이지 ↗"
                onPress={() =>
                  void action(async (code) => {
                    if (!code.trim()) throw Error('제출할 코드를 먼저 작성하세요.');
                    if (!(await Clipboard.setStringAsync(code)))
                      throw Error('클립보드에 복사할 수 없습니다.');
                    await Linking.openURL(links.submit);
                  })
                }
              />
              <Button label="채점 현황 ↗" onPress={() => setMenu('status')} />
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <View
          style={{ flex: 1, backgroundColor: '#172c2877', justifyContent: 'center', padding: 24 }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{
              flexGrow: 0,
              backgroundColor: '#fff',
              borderRadius: 16,
              maxWidth: 420,
              width: '100%',
              alignSelf: 'center',
            }}
            contentContainerStyle={{ padding: 20, gap: 12 }}
          >
            <Text style={styles.title}>{menu === 'language' ? '풀이 언어' : '채점 현황'}</Text>
            {menu === 'language' ? (
              languages.map((lang: Language) => (
                <Button
                  key={lang}
                  primary={lang === draft.lang}
                  label={lang}
                  onPress={() => choose(draft, lang)}
                />
              ))
            ) : (
              <>
                <Text style={styles.body}>
                  #{draft.id}의 공식 채점 현황을 엽니다. 백준 아이디를 입력하면 해당 사용자의 제출만
                  표시합니다.
                </Text>
                <TextInput
                  placeholder="백준 아이디 (선택)"
                  accessibilityLabel="백준 아이디"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={handle}
                  onChangeText={setHandle}
                  style={styles.input}
                />
                <Button
                  primary
                  label="백준에서 결과 보기 ↗"
                  onPress={() =>
                    void action(async () => {
                      await Linking.openURL(links.status);
                      setMenu(null);
                    })
                  }
                />
              </>
            )}
            <Button label="닫기" onPress={() => setMenu(null)} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Notebook />
    </SafeAreaProvider>
  );
}
