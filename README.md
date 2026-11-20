# Pocket Judge · 모바일 백준 풀이 노트

Android, iPhone, iPad에서 백준 문제를 찾고 코드를 작성하는 비공식 앱입니다. 풀이 초안은 기기 안의 SQLite에 저장합니다. 백준 로그인·제출·채점은 사용자의 기본 브라우저에서 진행합니다.

## 처음 실행하기

개발 기준 환경은 Node.js 24 LTS, npm, Python 3.12, Expo SDK 58입니다. 휴대폰과 개발 PC를 같은 Wi-Fi에 연결하세요.

```sh
git clone https://github.com/david1-p/mobile-baekjoon.git
cd mobile-baekjoon
```

### 1. FastAPI 서버

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

[solved.ac 개발자 콘솔](https://backstage.solved.ac/developer/apps)에서 앱을 등록한 뒤 발급받은 값을 **backend/.env**의 `SOLVED_CLIENT_ID`, `SOLVED_CLIENT_SECRET`에 입력하세요. 서버를 시작합니다.

```sh
python -m uvicorn app.main:app --env-file .env --host 0.0.0.0 --port 8000
```

Windows PowerShell에서는 `py -3.12 -m venv .venv`, `.\.venv\Scripts\Activate.ps1`, `Copy-Item .env.example .env`를 사용합니다. 상태 확인은 <http://localhost:8000/health>, API 명세는 <http://localhost:8000/docs>에서 가능합니다.

### 2. Expo 앱

새 터미널에서 저장소 루트를 기준으로 실행합니다.

```sh
cd mobile
npm ci
npm start -- --lan
```

Expo SDK 58과 호환되는 **Expo Go**로 QR 코드를 엽니다. 처음부터 에디터를 사용해 볼 때는 서버나 앱 키가 없어도 됩니다. **문제 찾기 → 1000 입력 → #1000 번호로 바로 열기**를 선택하세요. 번호 직접 열기는 백준에 등록된 번호인지 사전 조회하지 않습니다.

문제 검색에는 FastAPI 주소가 필요합니다. 기본값은 Expo 개발 서버의 호스트와 포트 8000입니다. 휴대폰 브라우저에서 `http://PC의-LAN-IP:8000/health`가 열리는지 확인하세요. 별도 서버나 터널을 사용할 때는 `mobile/.env.example`을 `mobile/.env`로 복사하고 `EXPO_PUBLIC_API_URL`에 주소를 지정한 뒤 Expo를 재시작합니다. Android 기본 에뮬레이터에서 호스트 PC는 `http://10.0.2.2:8000`, iOS 시뮬레이터는 `http://127.0.0.1:8000`입니다. WSL2에서 LAN 접근이 어려우면 Windows에서 서버를 실행하거나 기기에서 접근 가능한 HTTPS 주소를 사용하세요. 설치 배포용 번들을 만들 때에는 접근 가능한 HTTPS 서버 URL을 빌드 환경에 설정하세요.

## 한 문제 풀기

1. **문제 찾기**에서 제목이나 번호를 검색합니다. solved.ac에서 제공한 제목과 백준 문제 번호를 표시합니다. **문제 원문 ↗**을 누르면 백준의 공식 문제 페이지가 열립니다.
2. 앱으로 돌아와 Python, Java, C++, JavaScript 중 언어를 선택하고 코드를 작성합니다. 문제와 언어마다 별도 초안이 생깁니다. 문서를 비운 상태도 저장합니다. 최근 작성한 풀이 30개를 목록에서 열 수 있으며 더 오래된 풀이는 문제 번호와 언어로 다시 열 수 있습니다.
3. **코드 복사 · 제출 페이지 ↗**을 누릅니다. 앱은 마지막 입력을 확인해 기기에 저장한 뒤 코드를 클립보드에 복사하고 백준 제출 페이지를 엽니다. 브라우저에서 로그인하고 **언어 선택 → 코드 붙여넣기 → 제출**을 직접 수행합니다.
4. **채점 현황 ↗**에서 백준 아이디를 입력하면 해당 문제에서 내 제출로 범위를 좁힙니다. 비워 두면 문제 전체 제출을 봅니다. 백준에서 부여한 결과가 공식 페이지에 표시됩니다.

너비 760포인트 이상, 높이 480포인트 이상에서는 검색과 편집기를 나란히 표시합니다. 작은 화면이나 좁은 iPad 분할 창에서는 두 화면을 전환합니다.

## 프로젝트 구조

| 경로 | 역할 |
| --- | --- |
| `mobile/App.tsx` | 스마트폰·태블릿 레이아웃, 언어 선택, 브라우저 연결 |
| `mobile/editor/main.ts` | CodeMirror 6과 언어별 문법 지원 |
| `mobile/scripts/build-editor.mjs` | 에디터를 앱에 포함할 로컬 JavaScript로 번들링 |
| `mobile/src/CodeEditor.tsx`, `editorHtml.ts` | WebView 생성, 입력 전달, 화면 전환 전 마지막 편집 내용 확인 |
| `mobile/src/storage.ts`, `store.ts` | SQLite 저장과 복원, Zustand 상태 |
| `mobile/src/SearchPanel.tsx`, `model.ts` | 검색·최근 풀이·백준 URL |
| `backend/app/main.py` | FastAPI 검색 어댑터, 자격 증명 관리, 오류 변환 |
| `mobile/tests/`, `backend/tests/` | 링크·초안 저장·편집기·API 테스트 |

## API와 데이터 흐름

`GET /api/problems?q=검색어&page=1`은 서버에서 [solved.ac 공식 v4](https://backstage.solved.ac/developer/docs)의 `GET /api/v4/problems`를 호출합니다. 요청 헤더의 `x-client-id`와 `x-client-secret`은 서버 환경에서만 읽습니다. `judgeIds` 중 BOJ 항목으로 링크를 만들며 각 페이지에서 백준 항목만 선별합니다. 결과가 없는 페이지에도 다음 페이지가 있을 수 있습니다. 응답은 `items: [{id, title, level}]`와 `nextPage`로 구성됩니다. 앱 키 미설정은 503, 상류 호출 제한은 429와 Retry-After, 상류 장애·응답 지연은 502·504로 반환합니다.

에디터는 앱 안에 번들링되어 오프라인에서도 열립니다. 백엔드는 작성 코드, 백준 비밀번호, 로그인 쿠키, 제출 기록을 수집하지 않습니다. 사용자가 버튼을 누르면 시스템 클립보드에 풀이가 복사됩니다. 문제 본문 재배포, 백준 HTML 수집, 자동 제출, 채점 결과 폴링은 구현하지 않았습니다.

## 테스트 및 빌드

```sh
# backend/ (가상환경 활성화 후)
python -m unittest discover -s tests -v

# mobile/
npm ci
npm run typecheck
npm test
npx playwright-core install --only-shell chromium
npm run test:editor
npm run build
```

`test:editor`는 Chromium에서 실제 에디터 번들을 열고 스마트폰·태블릿 화면 크기에서 입력과 최종 코드 전달을 확인합니다. 기존 Chromium을 사용할 때는 `CHROMIUM_PATH`에 실행 파일 경로를 지정하세요. `npm run build`는 Android·iOS 배포용 JavaScript/Hermes 번들을 `mobile/dist`에 생성합니다. CodeMirror 번들은 `npm ci`와 빌드 때 자동 생성됩니다. 에디터 확장을 수정했다면 `npm run editor`를 실행하세요.

네이티브 앱은 Android Studio/SDK를 설치한 PC에서 `npx expo run:android`, Xcode와 CocoaPods를 설치한 Mac에서 `npx expo run:ios`로 빌드하고 실행합니다. iPad 시뮬레이터를 고르려면 `npx expo run:ios --device`를 사용하세요. 백준 계정의 실제 제출은 수동 검증 항목입니다.

### GitHub에서 네이티브 빌드 확인

[Native build](https://github.com/david1-p/mobile-baekjoon/actions/workflows/native-build.yml)에서 Android ARM64 디버그 APK와 iOS 시뮬레이터 컴파일 결과를 확인할 수 있습니다. 실행 상세 화면의 **Artifacts → android-debug-arm64**에서 APK를 받습니다. 산출물 보관 기간은 5일이며 저장소 소유자는 **Run workflow**로 다시 빌드할 수 있습니다. 디버그 APK를 사용할 때는 Metro 개발 서버를 함께 실행하세요. 처음 실행하는 경우 위 Expo Go 절차가 가장 짧습니다.

## 라이선스

프로젝트에서 작성한 코드는 [MIT License](LICENSE)로 공개합니다. 저작권자는 David입니다. 의존성은 각 패키지의 라이선스를 따릅니다. 이 저장소의 라이선스는 백준 문제·상표·사용자 제출물이나 solved.ac 데이터에 대한 권리를 부여하지 않습니다. 외부 서비스 이용에는 각 운영자의 정책이 적용됩니다. [백준](https://acmicpc.net/) · [solved.ac 개발자 약관](https://solved.ac/developer-terms)
