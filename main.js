// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// 정밀 세율표 및 로직
const getProgressiveTax = (base) => {
  if (base <= 100000000) return { rate: 0.1, deduct: 0, text: '10%' };
  if (base <= 500000000) return { rate: 0.2, deduct: 10000000, text: '20%' };
  if (base <= 1000000000) return { rate: 0.3, deduct: 60000000, text: '30%' };
  if (base <= 3000000000) return { rate: 0.4, deduct: 160000000, text: '40%' };
  return { rate: 0.5, deduct: 460000000, text: '50%' };
};

const getAcqRate = (amt, houseCount, isRegArea) => {
  if (houseCount === '1') {
    if (amt <= 600000000) return 0.01;
    if (amt <= 900000000) return (amt * 2 / 300000000 - 3) / 100;
    return 0.03;
  }
  if (houseCount === '2') return isRegArea ? 0.08 : 0.01;
  return isRegArea ? 0.12 : 0.08;
};

// 메인 앱 초기화
const initApp = () => {
  
  // 1. SPA 네비게이션
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.calc-section');
  const headerTitle = document.getElementById('header-title');
  const headerDesc = document.getElementById('header-desc');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      sections.forEach(sec => sec.classList.remove('active'));
      const targetSec = document.getElementById(tabId);
      if (targetSec) targetSec.classList.add('active');
      if (headerTitle) headerTitle.textContent = item.getAttribute('data-title');
      if (headerDesc) headerDesc.textContent = item.getAttribute('data-desc');
      window.scrollTo(0, 0);
    });
  });

  // 2. 세금 계산기 (정밀 로직 통합)
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    if (!categorySelect) return;
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');

    const calculate = () => {
      const type = categorySelect.value;
      let res = null;

      if (type === 'gift') {
        const configs = [
          { id: 'spouse', label: '배우자', deduct: 600000000 },
          { id: 'adult-child', label: '성인자녀', deduct: 50000000 },
          { id: 'minor-child', label: '미성년자녀', deduct: 20000000 },
          { id: 'relative', label: '친족', deduct: 10000000 },
          { id: 'other', label: '기타', deduct: 0 }
        ];
        let totalTax = 0, totalAmt = 0, b = '';
        configs.forEach(c => {
          const count = parseInt(document.getElementById(`gift-${c.id}-count`)?.value || 0, 10);
          const amt = parseNum(document.getElementById(`gift-${c.id}-amount`)?.value || 0);
          if (count > 0 && amt > 0) {
            totalAmt += amt * count;
            const base = Math.max(0, amt - c.deduct);
            const rInfo = getProgressiveTax(base);
            const tax = (base * rInfo.rate - rInfo.deduct) * 0.97;
            totalTax += tax * count;
            b += `<div class="row"><span>${c.label} (${count}명)</span><span>인당 ${formatCurrency(tax)} 원</span></div>`;
          }
        });
        const prop = parseNum(document.getElementById('gift-prop-amount')?.value || 0);
        if (totalAmt > 0) res = { main: totalTax + prop * 0.04, details: b + (prop > 0 ? `<div class="row"><span>부동산 취득세(4%)</span><span>${formatCurrency(prop * 0.04)} 원</span></div>` : '') };
      } else if (type === 'inherit') {
        const total = parseNum(document.getElementById('inherit-amount')?.value || 0);
        const hasSpouse = document.getElementById('inherit-has-spouse')?.checked;
        const childCount = parseInt(document.getElementById('inherit-child-count')?.value || 0, 10);
        if (total > 0) {
          const deduct = Math.max(500000000, 200000000 + childCount * 50000000) + (hasSpouse ? 500000000 : 0);
          const base = Math.max(0, total - deduct);
          const rInfo = getProgressiveTax(base);
          const tax = (base * rInfo.rate - rInfo.deduct) * 0.97;
          res = { main: tax, details: `<div class="row"><span>총 공제액</span><span>${formatCurrency(deduct)} 원</span></div><div class="row"><span>적용 세율</span><span>${rInfo.text}</span></div>` };
        }
      } else if (type === 'acq') {
        const amt = parseNum(document.getElementById('acq-amount')?.value || 0);
        const houseCount = document.querySelector('input[name="acq-house"]:checked')?.value || '1';
        const isReg = document.querySelector('input[name="acq-area"]:checked')?.value === 'reg';
        if (amt > 0) {
          const rate = getAcqRate(amt, houseCount, isReg);
          const tax = amt * rate;
          res = { main: tax * 1.1, details: `<div class="row"><span>적용 취득세율</span><span>${(rate * 100).toFixed(2)}%</span></div><div class="row"><span>지방교육세 포함(1.1배)</span><span>${formatCurrency(tax * 1.1)} 원</span></div>` };
        }
      } else if (type === 'prop') {
        const val = parseNum(document.getElementById('prop-value')?.value || 0);
        const isH1 = document.querySelector('input[name="prop-h1"]:checked')?.value === 'yes';
        if (val > 0) {
          const base = val * 0.6; // 공정시장가액비율 60%
          let rate = 0.001; // 간이 최저세율
          if (base > 300000000) rate = 0.004;
          const tax = base * (isH1 ? rate - 0.0005 : rate);
          res = { main: tax, details: `<div class="row"><span>과세표준(60%)</span><span>${formatCurrency(base)} 원</span></div>` };
        }
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy')?.value || 0);
        const sell = parseNum(document.getElementById('gain-sell')?.value || 0);
        const exp = parseNum(document.getElementById('gain-expenses')?.value || 0);
        const isH1 = document.querySelector('input[name="gain-asset-type"]:checked')?.value === 'house1';
        if (buy > 0 && sell > 0) {
          let profit = sell - buy - exp;
          if (isH1 && sell <= 1200000000) { res = { main: 0, details: '1세대 1주택 12억 비과세' }; }
          else {
            if (isH1) profit = profit * (sell - 1200000000) / sell;
            const base = Math.max(0, profit - 2500000);
            res = { main: base * 0.2, details: `양도차익(비과세 제외): ${formatCurrency(profit)} 원` };
          }
        }
      } else {
        const group = document.getElementById(`tax-input-${type}`);
        const input = group?.querySelector('input[type="text"]');
        if (input && parseNum(input.value) > 0) {
          res = { main: parseNum(input.value) * 0.1, details: '10% 기준 간이 계산' };
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

  // 3. 나머지 계산기 (간이)
  const initOthers = () => {
    const ids = ['calc-loan', 'calc-salary', 'calc-savings'];
    ids.forEach(id => {
      const sec = document.getElementById(id);
      if (!sec) return;
      sec.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
        const res = sec.querySelector('.result-area') || sec.querySelector('.pay-stub') || sec.querySelector('.loan-schedule');
        if (res) res.style.display = 'block';
      }));
    });
  };

  initTax();
  initOthers();
};

document.addEventListener('DOMContentLoaded', initApp);