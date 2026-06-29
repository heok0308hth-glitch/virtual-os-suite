# Virtual OS Suite TODO

## DB & Server
- [x] DB 스키마: notes, files, wallet, market_apps, installed_apps 테이블
- [x] tRPC 라우터: notes CRUD
- [x] tRPC 라우터: files CRUD
- [x] tRPC 라우터: wallet (잔액, 충전, 차감)
- [x] tRPC 라우터: market (앱 목록, 설치, 삭제)
- [x] tRPC 라우터: ai (LLM 프록시 - 서버 사이드 안전 처리)
- [x] tRPC 라우터: search (DuckDuckGo 스크래핑 + Gemini 요약)
- [x] tRPC 라우터: settings (사용자 설정 저장/불러오기)

## 데스크톱 OS 셸
- [x] 멀티 윈도우 시스템 (드래그·리사이즈·최소화·최대화)
- [x] 작업표시줄 (열린 창 목록, 독)
- [x] 바탕화면 아이콘
- [x] 시작 메뉴 (Ctrl+K)
- [x] 전역 검색 (앱·메모·파일 통합)
- [x] 토스트 알림
- [x] 배경화면 (Aurora·Sunset·Ocean)
- [x] 다크/라이트 테마

## 앱 구현
- [x] AI 비서 앱 (채팅, 서버 프록시, 로컬 폴백)
- [x] 고급 에이전트 모드 (plan·act·observe)
- [x] 메모 앱 (CRUD, AI 전송, 파일 변환)
- [x] 파일 앱 (CRUD, 메모 변환)
- [x] 설정 앱 (API 키, 모델, 테마, 배경, 데이터 내보내기/가져오기)
- [x] 앱 마켓 (토큰 기반 설치)
- [x] 지갑 앱 (잔액, 모의 충전)

## The 구글 v2.5
- [x] 검색 UI (DuckDuckGo 결과)
- [x] Gemini 요약 패널
- [x] URL 직접 열기 / 페이지 프록시

## 테스트
- [x] tRPC 라우터 vitest 테스트 (9개 통과)


## 사용자 요청 개선사항
- [x] 로그인 화면 구현 (AI 모델 + API 키 입력)
- [x] 마켓 앱 비우기
- [x] 토큰 초기화 (0개)
- [x] 설정 앱에서 AI 모델 변경 기능 추가
- [x] The 구글 v2.5 → "구글"로 이름 변경 + 구글 스타일 디자인
- [x] 파일 앱과 메모 앱 차이 명확화 (메모 앱에 설명 추가)
- [x] 파일 앱 기능 확장 (다운로드, 복제, 검색, 정렬)
- [x] 메모 앱 기능 확장 (내보내기, 복제, 파일 변환)
