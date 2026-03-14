// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// --- 세율 테이블 (2024-2025 현행 세법) ---

// 1. 재산세 누진계산 (주택)
const calcPropertyTax = (base, isSpecial) => {
  let tax = 0;
  if (isSpecial) {
    if (base <= 60000000) tax = base * 0.0005;
    else if (base <= 150000000) tax = 30000 + (base - 60000000) * 0.001;
    else if (base <= 300000000) tax = 120000 + (base - 150000000) * 0.002;
    else tax = 420000 + (base - 300000000) * 0.0035;
  } else {
    if (base <= 60000000) tax = base * 0.001;
    else if (base <= 150000000) tax = 60000 + (base - 60000000) * 0.0015;
    else if (base <= 300000000) tax = 195000 + (base - 150000000) * 0.0025;
    else tax = 570000 + (base - 300000000) * 0.004;
  }
  return tax;
};

// 2. 종부세 누진계산 (주택/개인)
const calcCompTax = (base, isMulti) => {
  if (base <= 0) return 0;
  if (isMulti) {
    if (base <= 300000000) return base * 0.005;
    if (base <= 600000000) return base * 0.007 - 600000;
    if (base <= 1200000000) return base * 0.01 - 2400000;
    if (base <= 2500000000) return base * 0.02 - 14400000;
    return base * 0.05 - 89400000;
  } else {
    if (base <= 300000000) return base * 0.005;
    if (base <= 600000000) return base * 0.007 - 600000;
    if (base <= 1200000000) return base * 0.01 - 2400000;
    if (base <= 2500000000) return base * 0.012 - 4800000;
    return base * 0.027 - 42300000;
  }
};

// --- 모듈별 초기화 ---

document.addEventListener('DOMContentLoaded', () => {

  // 1. SPA 네비게이션
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

  // 2. 대출 계산기
  const initLoan = () => {
    const section = document.getElementById('calc-loan');
    if (!section) return;
    const resArea = section.querySelector('#loan-result');
    const calc = () => {
      const amt = parseNum(section.querySelector('#loan-amount').value);
      const rate = parseFloat(section.querySelector('#loan-rate').value);
      const term = parseInt(section.querySelector('#loan-term').value, 10);
      if (!amt || isNaN(rate) || !term) { if (resArea) resArea.style.display = 'none'; return; }
      const mRate = (rate / 100) / 12;
      const total = (amt * mRate * Math.pow(1 + mRate, term)) / (Math.pow(1 + mRate, term) - 1);
      section.querySelector('#loan-monthly-payment').textContent = formatCurrency(total) + ' 원';
      if (resArea) resArea.style.display = 'block';
    };
    section.querySelectorAll('input').forEach(i => i.addEventListener('input', calc));
    section.querySelectorAll('.btn-add-loan, .btn-term-loan').forEach(btn => btn.addEventListener('click', () => {
      if (btn.classList.contains('btn-add-loan')) section.querySelector('#loan-amount').value = formatCurrency(parseNum(section.querySelector('#loan-amount').value) + parseInt(btn.getAttribute('data-val')));
      else section.querySelector('#loan-term').value = btn.getAttribute('data-term');
      calc();
    }));
  };

  // 3. 통합 보유세 계산기 (재산세 + 종부세 구분 출력)
  const initTax = () => {
    const section = document.getElementById('calc-tax');
    if (!section) return;
    const categorySelect = section.querySelector('#tax-category-select');
    const resArea = section.querySelector('#tax-result');

    const calculate = () => {
      const type = categorySelect.value;
      const finalAmtEl = section.querySelector('#tax-final-amount');
      const detailsEl = section.querySelector('#tax-result-details');
      let res = null;

      if (type === 'holding') {
        const val = parseNum(section.querySelector('#holding-value')?.value || 0);
        const isH1 = section.querySelector('input[name="holding-h1"]:checked')?.value === 'yes';
        const houseCount = section.querySelector('input[name="holding-count"]:checked')?.value;
        const assetType = section.querySelector('#holding-asset-type')?.value;

        if (val > 0) {
          // 1. 재산세 산출
          const propFmv = assetType === 'house' ? 0.6 : 0.7;
          const propBase = val * propFmv;
          const propTax = calcPropertyTax(propBase, isH1 && val <= 900000000);
          
          // 2. 종부세 산출
          let compTax = 0;
          let compDetail = "대상 아님";
          if (assetType === 'house') {
            const deduct = isH1 ? 1200000000 : 900000000;
            const compBase = Math.max(0, val - deduct) * 0.6;
            if (compBase > 0) {
              const rawComp = calcCompTax(compBase, houseCount === '3');
              // 이중과세 공제 (약식 20% 차감)
              compTax = rawComp * 0.8;
              compDetail = formatCurrency(compTax) + " 원";
            }
          }

          res = {
            main: propTax + compTax,
            details: `
              <div class="row" style="font-weight: 700; color: var(--color-primary); border-bottom: 1px solid var(--color-border); margin-bottom: 8px;">
                <span>[재산세 상세]</span><span>${formatCurrency(propTax)} 원</span>
              </div>
              <div class="row"><span>과세표준 (${propFmv*100}%)</span><span>${formatCurrency(propBase)} 원</span></div>
              <div class="row" style="font-weight: 700; color: var(--color-primary); border-bottom: 1px solid var(--color-border); margin-bottom: 8px; margin-top: 12px;">
                <span>[종부세 상세]</span><span>${compDetail}</span>
              </div>
              ${compTax > 0 ? `<div class="row"><span>기본 공제액</span><span>-${formatCurrency(isH1 ? 1200000000 : 900000000)} 원</span></div>` : ''}
            `
          };
        }
      } else if (type === 'gain') {
        const buy = parseNum(section.querySelector('#gain-buy')?.value || 0), sell = parseNum(section.querySelector('#gain-sell')?.value || 0);
        if (buy > 0 && sell > 0) res = { main: (sell - buy) * 0.2, details: '<div class="row"><span>양도차익 기본 계산</span></div>' };
      }

      if (res) {
        finalAmtEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resArea.style.display = 'block';
      } else { resArea.style.display = 'none'; }
    };

    categorySelect.addEventListener('change', () => {
      section.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
      calculate();
    });
    section.querySelectorAll('input, select').forEach(el => el.addEventListener('input', calculate));
    section.querySelector('.btn-clear')?.addEventListener('click', () => {
      section.querySelectorAll('input').forEach(i => i.value = '');
      resArea.style.display = 'none';
    });
    section.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
  };

  initNav(); initLoan(); initTax();
});