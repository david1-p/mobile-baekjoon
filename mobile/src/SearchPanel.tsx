import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { recent } from './storage';
import { Button, ink, styles } from './ui';
import type { Language, Problem } from './model';

function apiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && host) return 'http://' + host + ':8000';
  throw Error('모바일 환경변수 EXPO_PUBLIC_API_URL에 서버 주소를 설정하세요.');
}
export function SearchPanel({
  onSelect,
  historyRevision,
}: {
  historyRevision: number;
  onSelect: (p: Problem, lang?: Language) => void;
}) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Problem[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<ReturnType<typeof recent>>([]);
  const active = useRef<AbortController | null>(null);
  const numeric = /^[1-9]\d{0,8}$/.test(query.trim()) ? Number(query.trim()) : null;
  useEffect(() => {
    try {
      setHistory(recent());
    } catch {
      setNotice('저장한 풀이를 읽을 수 없습니다.');
    }
  }, [historyRevision]);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );
  async function search(page = 1) {
    if (!query.trim()) return;
    active.current?.abort();
    const control = new AbortController();
    active.current = control;
    setBusy(true);
    setNotice('');
    if (page === 1) {
      setItems([]);
      setNext(null);
    }
    const timer = setTimeout(() => control.abort(), 12000);
    try {
      const res = await fetch(
        apiUrl() + '/api/problems?q=' + encodeURIComponent(query.trim()) + '&page=' + page,
        { signal: control.signal },
      );
      const data = await res.json();
      if (!res.ok)
        throw Error(typeof data.detail === 'string' ? data.detail : '검색 요청을 확인하세요.');
      if (active.current !== control) return;
      setItems((old) => [
        ...new Map(
          [...(page === 1 ? [] : old), ...data.items].map((p: Problem) => [p.id, p] as const),
        ).values(),
      ]);
      setSearched(true);
      setNext(data.nextPage);
    } catch (e) {
      if (active.current === control)
        setNotice(control.signal.aborted ? '검색 시간이 초과되었습니다.' : (e as Error).message);
    } finally {
      clearTimeout(timer);
      if (active.current === control) setBusy(false);
    }
  }
  const row = (p: Problem, lang?: Language) => (
    <Pressable
      key={p.id + (lang ?? '')}
      accessibilityRole="button"
      onPress={() => onSelect(p, lang)}
      style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#dae4dc', gap: 4 }}
    >
      <Text style={{ color: '#507168', fontWeight: '600' }}>
        #{p.id}
        {lang ? '   ·   ' + lang : ''}
      </Text>
      <Text style={{ color: ink, fontSize: 17, fontWeight: '600' }}>{p.title}</Text>
    </Pressable>
  );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 18, gap: 12 }}
    >
      <Text style={styles.title}>문제 찾기</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TextInput
          accessibilityLabel="문제 번호 또는 제목"
          placeholder="번호 또는 제목"
          placeholderTextColor="#73857e"
          value={query}
          onChangeText={(value) => {
            active.current?.abort();
            active.current = null;
            setQuery(value);
            setItems([]);
            setNext(null);
            setSearched(false);
            setBusy(false);
            setNotice('');
          }}
          onSubmitEditing={() => search()}
          maxLength={100}
          returnKeyType="search"
          style={[styles.input, { flex: 1 }]}
        />
        <Button primary label="검색" disabled={!query.trim() || busy} onPress={() => search()} />
      </View>
      {numeric && (
        <Button
          label={'#' + numeric + ' 번호로 바로 열기'}
          onPress={() => onSelect({ id: numeric, title: 'BOJ ' + numeric })}
        />
      )}
      {busy && <ActivityIndicator accessibilityLabel="검색 중" color="#126454" />}
      {!!notice && (
        <Text accessibilityRole="alert" style={styles.body}>
          {notice}
        </Text>
      )}
      {searched && (
        <Text style={styles.body}>
          {items.length ? '검색 결과 · solved.ac' : '이 페이지에 일치하는 백준 문제가 없습니다.'}
        </Text>
      )}
      {items.map((p) => row(p))}
      {!!next && <Button label="다음 결과" disabled={busy} onPress={() => search(next)} />}
      <Text style={[styles.title, { fontSize: 18, marginTop: 12 }]}>최근 풀이</Text>
      {history.length ? (
        history.map((p) => row(p, p.lang))
      ) : (
        <Text style={styles.body}>작성한 풀이가 여기에 저장됩니다.</Text>
      )}
    </ScrollView>
  );
}
