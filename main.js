// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// 종합부동산세 세율표 (2024-2025 개인/주택 기준)
const getCompTaxRate = (base, isMulti) => {
  if (!isMulti) {
    // 일반 (2주택 이하)
    if (base <= 300000000) return { rate: 0.005, deduct: 0 };
    if (base <= 600000000) return { rate: 0.007, deduct: 600000 };
    if (base <= 1200000000) return { rate: 0.010, deduct: 2400000 };
    if (base <= 2500000000) return { rate: 0.012, deduct: 4800000 };
    if (base <= 5000000000) return { rate: 0.015, deduct: 9800000 };
    if (base <= 9400000000) return { rate: 0.020, deduct: 24800000 };
    return { rate: 0.027, deduct: 71800000 };
  } else {
    // 다주택 (3주택 이상 & 과표 12억 초과 시 중과)
    // 실제 법은 복잡하지만 간이 계산을 위해 통합 테이블 사용
    if (base <= 300000000) return { rate: 0.005, deduct: 0 };
    if (base <= 600000000) return { rate: 0.007, deduct: 600000 };
    if (base <= 1200000000) return { rate: 0.010, deduct: 2400000 };
    if (base <= 2500000000) return { rate: 0.020, deduct: 14400000 };
    if (base <= 5000000000) return { rate: 0.030, deduct: 39400000 };
    if (base <= 9400000000) return { rate: 0.040, deduct: 89400000 };
    return { rate: 0.050, deduct: 183400000 };
  }
};

// 메인 앱 초기화
const initApp = () => {
  
  // 1. SPA 네비게이션 (생략 가능하나 유지)
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.calc-section');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      sections.forEach(sec => sec.classList.remove('active'));
      const targetSec = document.getElementById(tabId);
      if (targetSec) targetSec.classList.add('active');
      document.getElementById('header-title').textContent = item.getAttribute('data-title');
      document.getElementById('header-desc').textContent = item.getAttribute('data-desc');
      window.scrollTo(0, 0);
    });
  });

  // 2. 세금 계산기 (종부세 정밀화 통합)
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    if (!categorySelect) return;
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');

    const calculate = () => {
      const type = categorySelect.value;
      let res = null;

      if (type === 'comp') {
        const val = parseNum(document.getElementById('comp-value')?.value || 0);
        const ownerType = document.querySelector('input[name="comp-owner"]:checked')?.value; // ind(개인), corp(법인)
        const assetType = document.getElementById('comp-asset-type')?.value; // house, land
        const houseCount = document.querySelector('input[name="comp-house-count"]:checked')?.value; // h1, h2, h3
        
        if (val > 0) {
          let deduct = 0;
          if (ownerType === 'ind') {
            deduct = houseCount === 'h1' ? 1200000000 : 900000000;
          }
          
          const fmvRate = 0.6; // 공정시장가액비율 60%
          const base = Math.max(0, val - deduct) * fmvRate;
          
          let tax = 0;
          let detailHtml = `<div class="row"><span>기본 공제액</span><span>-${formatCurrency(deduct)} 원</span></div>`;
          detailHtml += `<div class="row"><span>공정시장가액비율</span><span>${fmvRate * 100}% 적용</span></div>`;
          detailHtml += `<div class="row"><span>과세표준</span><span>${formatCurrency(base)} 원</span></div>`;

          if (ownerType === 'corp') {
            const rate = houseCount === 'h3' ? 0.05 : 0.027;
            tax = base * rate;
            detailHtml += `<div class="row"><span>법인 단일세율</span><span>${(rate * 100).toFixed(1)}%</span></div>`;
          } else {
            const rInfo = getCompTaxRate(base, houseCount === 'h3');
            tax = base * rInfo.rate - rInfo.deduct;
            detailHtml += `<div class="row"><span>적용 세율</span><span>${(rInfo.rate * 100).toFixed(1)}%</span></div>`;
          }

          res = { main: Math.max(0, tax), details: detailHtml };
        }
      } else if (type === 'gain') {
        // 기존 양도세 정밀 로직 (유지)
        const buy = parseNum(document.getElementById('gain-buy')?.value || 0);
        const sell = parseNum(document.getElementById('gain-sell')?.value || 0);
        const exp = parseNum(document.getElementById('gain-expenses')?.value || 0);
        const holdY = parseInt(document.getElementById('gain-hold-year')?.value || 0, 10);
        const resideY = parseInt(document.getElementById('gain-reside-year')?.value || 0, 10);
        const isH1 = document.querySelector('input[name="gain-asset-type"]:checked')?.value === 'house1';

        if (buy > 0 && sell > 0) {
          let profit = sell - buy - exp;
          let taxableProfit = isH1 ? (sell <= 1200000000 ? 0 : profit * (sell - 1200000000) / sell) : profit;
          
          let deductRate = holdY < 3 ? 0 : (isH1 && resideY >= 2 ? Math.min(holdY * 0.04, 0.4) + Math.min(resideY * 0.04, 0.4) : Math.min(holdY * 0.02, 0.3));
          const base = Math.max(0, taxableProfit * (1 - deductRate) - 2500000);
          
          // 양도세율 간이 적용
          const tax = base * (base <= 50000000 ? 0.15 : 0.24) * 1.1; 
          res = { main: taxableProfit === 0 ? 0 : tax, details: `<div class="row"><span>장기보유특별공제</span><span>${(deductRate * 100).toFixed(0)}% 적용</span></div><div class="row"><span>과세표준</span><span>${formatCurrency(base)} 원</span></div>` };
        }
      } else {
        // 기타 세목 간이
        const group = document.getElementById(`tax-input-${type}`);
        const input = group?.querySelector('input[type="text"]');
        if (input && parseNum(input.value) > 0) {
          res = { main: parseNum(input.value) * 0.01, details: '1% 기준 간이 계산' };
        }
      }

      if (res) {
        finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      } else { resultArea.style.display = 'none'; }
    };

    categorySelect.addEventListener('change', () => {
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
      calculate();
    });

    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') {
          const v = parseNum(e.target.value);
          e.target.value = v ? formatCurrency(v) : '';
        }
        calculate();
      });
    });

    // 초기 상태
    document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
  };

  initTax();
};

document.addEventListener('DOMContentLoaded', initApp);