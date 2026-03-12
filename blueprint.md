# 스마트 대출 계산기 (Smart Loan Calculator) - Blueprint

## Overview
트래픽 증대 및 고단가(CPC) 금융 광고 수익 창출을 목적으로 하는 모바일 최적화 웹 애플리케이션입니다. 사용자가 대출 금액, 금리, 기간, 상환 방식을 입력하면 실시간으로 월 상환액과 총 이자를 계산하여 보여줍니다. 핀테크(Fintech) 스타일의 깔끔하고 신뢰감 있는 UI를 제공하며, 광고 배너가 사용자 경험을 해치지 않으면서도 클릭률(CTR)을 높일 수 있는 전략적 위치에 배치됩니다.

## Current Architecture & Features
*   **HTML5 (index.html):** 시맨틱 태그 구조. 웹 컴포넌트 `<ad-placeholder>`를 활용한 모듈화된 광고 배너 영역 적용.
*   **CSS3 (style.css):** 
    *   CSS Variables를 활용한 일관된 컬러 팔레트 (신뢰감을 주는 블루/그레이 톤).
    *   Flexbox 및 Grid 기반의 모바일 퍼스트 반응형 레이아웃.
    *   부드러운 전환(Transition) 및 그림자(Box-shadow) 효과로 모던한 앱 느낌 부여.
*   **JavaScript (main.js):** 
    *   Vanilla JS를 활용한 가볍고 빠른 구동.
    *   3가지 주요 상환 방식(원리금균등, 원금균등, 만기일시) 계산 로직 구현.
    *   사용자 입력 시 즉각적으로 결과가 업데이트되는 실시간 반응 로직.
    *   한국어 화폐 단위(원) 포맷팅.

## Current Plan (March 2026)
1.  **프로젝트 스캐폴딩 및 Blueprint 작성:** `blueprint.md` 생성 (완료)
2.  **HTML 마크업:** `index.html`에 계산기 폼, 결과 출력 영역, 광고 배치 영역(상/중/하) 구성.
3.  **스타일링:** `style.css`에 토스/뱅크샐러드 등 최신 핀테크 앱 스타일의 모던 UI/UX 적용.
4.  **로직 구현:** `main.js`에 대출 이자 계산 알고리즘 및 실시간 DOM 업데이트 로직, 커스텀 웹 컴포넌트(`<ad-placeholder>`) 구현.
5.  **테스트 및 검증:** 입력값 변화에 따른 실시간 계산 정확성 및 UI 반응성 확인.