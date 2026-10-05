# 후쿠오카 여행 지도

2026년 10월 6일부터 10일까지의 후쿠오카·유후인 일정을 날짜별 지도와 시간순 코스로 보여주는 정적 웹사이트다.

## 실행

```powershell
node dev-server.mjs
```

브라우저에서 `http://127.0.0.1:4173`을 연다. Google Maps API 키는 Git에 포함되지 않는 `config.local.js`에서 읽는다. 새 환경에서는 `config.example.js`를 복사해 키를 입력한다.

## GitHub Pages 배포

`.github/workflows/pages.yml`은 Pull Request에서 일정 데이터·테스트·JavaScript 문법을 검사하고, `main` 브랜치에 반영되면 GitHub Pages로 자동 배포한다. GitHub Free에서 Pages를 무료로 사용하려면 저장소를 public으로 만들어야 한다.

처음 한 번 저장소에서 다음 설정을 한다.

1. **Settings → Pages → Build and deployment → Source**에서 `GitHub Actions`를 선택한다.
2. **Settings → Secrets and variables → Actions → New repository secret**에서 이름을 `GOOGLE_MAPS_API_KEY`로 하고 Maps JavaScript API 키를 저장한다.
3. 키의 HTTP referrer 제한에 `https://<계정>.github.io/*`를 추가한다. 저장소 사이트 전용으로 좁히려면 `https://<계정>.github.io/<저장소>/*`도 추가한다. Google Cloud에서 Maps JavaScript API를 허용하고 예산 알림·쿼터도 설정한다.
4. 코드를 `main`에 push한다. Actions의 `Validate and deploy` 완료 후 Pages URL에서 사이트를 확인한다.

배포 파일은 Actions가 `dist/`에 만들며, `config.local.js`에는 Secret에서 읽은 브라우저용 API 키가 들어간다. Google Maps 브라우저 키는 방문자 브라우저로 전달되므로 비밀값으로 남지 않는다. GitHub Secret은 키를 저장소 코드에 직접 커밋하지 않게 해주며, 실제 사용 제한은 Google Cloud의 HTTP referrer 제한과 API 쿼터로 설정한다. 로컬 개발은 기존 `config.local.js` 방식을 그대로 사용한다.

## 일정 데이터 수정

기본 일정은 `src/data/trip.json`, 대체 코스는 `plans.json`, 식당·카페 후보는 `choices.json`, 지도 확대 구역은 `focus-groups.json`에서 관리한다. 모두 `src/data/`에 있으며 화면 코드를 수정하지 않고 편집할 수 있다.

코스 ID는 `일차-순서` 형식으로 작성한다.

- `03-01`: 3일차 첫 번째 코스
- `03-02`: 3일차 두 번째 코스
- `05-04`: 5일차 네 번째 코스

```json
{
  "id": "03-05",
  "category": "food",
  "name": "식당 이름",
  "time": "18:30",
  "description": "예약자 이름과 메모",
  "details": ["예약 완료", "현금 결제"],
  "location": {
    "lat": 33.267,
    "lng": 131.367
  },
  "includeInBounds": true,
  "routeFromPrevious": {
    "mode": "bicycling",
    "label": "자전거 약 2km",
    "draw": true
  }
}
```

`routeFromPrevious.mode`는 다음 값을 지원한다.

- `walking`: Google 경로를 계산해 실제 도보 경로를 표시한다.
- `transit`: 지하철·JR·버스 대중교통 경로를 표시한다.
- `bicycling`: 자전거 경로를 주황색으로 표시한다.
- `driving`: 택시·셔틀 차량 경로를 표시한다.
- `connection`: 항공·장거리 지정열차처럼 별도 경로인 두 지점을 점선으로 연결한다.

`routeFromPrevious.draw`를 `false`로 지정하면 복귀 지점의 마커와 일정은 유지하면서 지도 선만 생략한다. `includeInBounds`가 `false`인 지점도 마커로 표시되지만 날짜를 처음 열었을 때의 지도 범위에서는 제외된다. 지도에서 **전체 보기**를 누르면 모든 마커가 보인다.

같은 이동수단이 연속되면 Google Routes 요청으로 묶고, 성공한 경로는 브라우저에 저장한다. 좌표 순서와 이동 방식이 같으면 plan이나 식당 옵션 이름이 달라도 캐시를 공유하고, 진행 중인 동일 요청도 공유한다. 대중교통·자전거 경로가 제공되지 않는 구간은 요청 실패로 처리되며 일정의 이동 안내는 계속 확인할 수 있다. 경로는 현지 내비게이션이나 확정 운행 시간표를 대신하지 않는다.

데이터를 수정한 뒤 검증한다.

```powershell
node scripts/validate-trip.mjs
```

검증기는 네 JSON을 함께 읽어 일차 ID, 코스 순서, 좌표, 이동 방식, Plan B·선택 슬롯·확대 구역의 참조 오류를 확인한다.

## 모바일 사용

날짜 5개를 가로 스크롤 없이 표시한다. 지도는 위쪽에 유지되고 아래 일정 영역만 스크롤된다. `지도 넓게`로 두 영역의 비중을 바꿀 수 있다. 장소를 선택하면 지도 중심으로 확대하고 아래 카드에서 메뉴·비용·설명을 펼친다. 지도 빈 곳, 다른 영역, Escape 키로 선택을 해제한다.

`코스 · 식당 변경`을 펼쳐 대안을 선택한다. 이미 선택한 옵션을 다시 눌러도 해당 장소로 이동한다. 메뉴는 방향키·Enter·Escape도 지원한다. 데스크톱에서는 지도 팝업도 함께 표시한다.

## 구조

```text
src/
  data/
    trip.json          기본 장소와 일정
    plans.json         대체 일정 순서와 경로 변경
    choices.json       음식·카페 후보, 메뉴와 맥락
    focus-groups.json  일자별 지도 확대 구역
  js/
    main.js            앱 상태와 이벤트 연결
    data/              JSON 로딩, 검증, 선택한 일정 조합
    map/               Google 로딩, 지도, 경로 캐시, 마커·팝업
    ui/                일정 렌더링, 선택 메뉴, 날짜·DOM 유틸리티
    state/             URL 읽기·쓰기
  styles/
    app.css            스타일 진입점
    base.css           기본 토큰과 리셋
    components.css     탭, 코스, 지도 UI
    layout.css         페이지 레이아웃
    responsive.css     모바일 레이아웃
```

## 검증

`npm test`로 모든 대체 코스·식당 선택, 데이터 참조 오류, 경로 캐시 키를 확인한다.

브라우저 검증은 개발 서버 실행 후 `node tests/browser.mjs`로 실행한다(Playwright와 Chrome 필요). 프로젝트 외부에 Playwright가 있으면 두 번째 인자로 해당 `index.mjs` 절대 경로를 전달할 수 있다. 320·390·768·844·1440px에서 메뉴, 반복 선택, 줌 유지, 마커 해제, 키보드 조작, Plan B를 검사한다. 지도 계약 모형을 사용하므로 Google API 호출 비용은 발생하지 않는다.
