# A380 TO Xwind

A380 이륙 측풍·배풍 제한 판정기. Airbus FOT 999.0069/26 Rev 00 (12-OCT-2026)의 엔진별 envelope을 CDU 스타일 화면으로 계산합니다.

> 참고용 계산기입니다. AFM/FCOM과 회사 규정이 우선합니다. Envelope 수치는 FOT 도표 판독값(잠정)이며 AFM advance copy 확보 후 `data/envelopes.json`만 수정하면 됩니다.

## 판정 규칙
| 항목 | 규칙 |
|---|---|
| 판정 입력 | 정상풍만 사용 (Gust는 참조 표시) |
| 반올림 | 측풍·배풍 성분 0.1 kt 사사오입 후 판정 |
| 배풍 | TW < 10.0 kt (10.0 = NO GO) |
| 측풍 | TW 0: 35 kt 이하 GO / TW 0~10: RR 35−0.6·TW, EA 35−1.0·TW (한계 표시는 0.1 kt 내림) |
| 방위 | 활주로 MAG. 바람 기본 MAG(ATIS), TRUE(METAR/TAF) 선택 시 VAR로 변환 (MAG = TRUE − VAR, E+ / W−) |

## 구조
```
data/envelopes.json   엔진별 envelope (RR Trent 970/972, EA GP7270)
data/airports.json    공항 프리셋 (RKSI 154/334, RJAA 157/337, KLAX 071/251)
js/calc.js            계산 코어 (정수 0.1 kt 단위 연산)
src/app.html          CDU 화면 템플릿
tools/build.py        calc.js + data → index.html 단일 파일 빌드
tests/calc.test.mjs   경계값 테스트
```

## 실행
```
python3 tools/build.py      # index.html 생성
npm test                    # 경계값 테스트
python3 -m http.server 8080 # 로컬 확인
```
GitHub Pages: Settings → Pages → Branch `main` / root.
