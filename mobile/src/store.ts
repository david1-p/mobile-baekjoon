import { create } from 'zustand';
import type { Language, Problem } from './model';
import { loadDraft, recent, saveDraft } from './storage';

function initial() {
  const last = recent()[0];
  return last ? loadDraft(last, last.lang) : loadDraft({ id: 1000, title: 'BOJ 1000' }, 'Python');
}
export const useNotebook = create(() => ({
  draft: null as ReturnType<typeof initial> | null,
  error: '',
}));
export function restore() {
  useNotebook.setState({ draft: initial(), error: '' });
}
export function select(problem: Problem, lang: Language) {
  useNotebook.setState({ draft: loadDraft(problem, lang), error: '' });
}
export function persist(problem: Problem, lang: Language, code: string) {
  const draft = { ...problem, lang, code };
  saveDraft(draft);
  const current = useNotebook.getState().draft;
  if (current?.id === problem.id && current.lang === lang)
    useNotebook.setState({ draft, error: '' });
}
