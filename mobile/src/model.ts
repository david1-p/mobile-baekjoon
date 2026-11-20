export const languages = ['Python', 'Java', 'C++', 'JavaScript'] as const;
export type Language = (typeof languages)[number];
export type Problem = { id: number; title: string; level?: number };
export type Draft = Problem & { lang: Language; code: string };
export const templates: Record<Language, string> = {
  Python: '',
  Java: 'import java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        \n    }\n}\n',
  'C++': '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n}\n',
  JavaScript: '',
};
export function bojLinks(id: number, handle = '') {
  if (!Number.isSafeInteger(id) || id < 1) throw Error('올바른 문제 번호가 필요합니다.');
  const base = 'https://acmicpc.net';
  return {
    problem: base + '/problem/' + id,
    submit: base + '/submit/' + id,
    status:
      base +
      '/status?problem_id=' +
      id +
      (handle.trim() ? '&user_id=' + encodeURIComponent(handle.trim()) : ''),
  };
}
