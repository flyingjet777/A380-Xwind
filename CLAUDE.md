# CLAUDE.md — a380-to-xwind 인수인계

## 목적
A380 이륙 측풍제한(Airbus FOT 999.0069/26) CDU 스타일 판정 web app. 사용자: 아시아나 A380 기장(RR Trent 970). KE 기체는 EA GP7270.

## 확정된 규칙 (기장님 지정, 2026-11-06) — 임의 변경 금지
- 판정은 정상풍만. Gust는 성분만 참조 표시.
- 성분은 0.1 kt 사사오입 후 판정. 측풍 한계 표시는 0.1 kt 내림.
- 배풍 10.0 kt = NO GO (strict <). 측풍 = 한계값이면 GO (<=).
- 활주로 MAG. 바람 기본 MAG(ATIS), TRUE 옵션은 공항 VAR로 변환.
- Envelope: TW 0에서 35 kt, TW 10에서 RR 29 / EA 25로 선형 감소 (FOT 도표 픽셀 측정, 꺾임점 TW≈0 확인). AFM 확보 시 교체.

## 공항 프리셋 (기장님 확인값)
RKSI 154/334 (VAR 9W) · RJAA 157/337 (VAR 8W) · KLAX 071/251 (VAR 12E)
YSSY 062/242 (07/25, 기장님 확인), 155/335 (VAR 13E, ERSA) · VTBS 015/195 (VAR 0.6W, 기장님 확인)
APT 페이지: 5개/페이지 (L1-L5, 우측 VAR 표시), R6 MORE> 로 페이지 순환

## 작업 방식
- `dev`에서 개발, 검증 후 `main` 병합. `python3 -m http.server 8080`로 로컬 확인.
- 수정 후 반드시 `python3 tools/build.py` → `npm test`.
- 계산 로직 변경 시 독립 구현(Python 등)과 전수 비교로 교차검증.

## 남은 일
- AFM/FCOM advance copy 수치로 envelopes.json 확정
- 노선 공항 추가 (A380 운항 공항)
- PWA(manifest, service worker) 추가
