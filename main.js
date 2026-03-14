/**
 * Smart Financial Hub - main.js
 * 종합 금융/세무 계산기 정밀 로직 및 UI 연동
 */

// --- 공통 유틸리티 ---
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};

const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// --- 세율 테이블 (2024-2025 현행 세법) ---

// 재산세 누진계산
const getPropertyTax = (base, isSpecial) => {
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

// 종부세 누진계산
const getCompTax = (base, isMulti) => {
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

// 증여/상속 누진계산
const getGiftTax = (base) => {
  if (base <= 0) return 0;
  if (base <= 100000000) return base * 0.1;
  if (base <= 500000000) return base * 0.2 - 10000000;
  if (base <= 1000000000) return base * 0.3 - 60000000;
  if (base <= 3000000000) return base * 0.4 - 160000000;
  return base * 0.5 - 460000000;
};

// --- 모듈별 초기화 함수 ---

document.addEventListener('DOMContentLoaded', () => {

  // 1. SPA 네비게이션
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.calc-section');
  const headerTitle = document.getElementById('header-title');
  const headerDesc = document.getElementById('header-desc');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      if (!tabId) return;

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

  // 2. 대출 계산기
  const initLoan = () => {
    const sec = document.getElementById('calc-loan');
    if (!sec) return;
    const resArea = sec.querySelector('#loan-result');
    const scheduleBody = sec.querySelector('#loan-schedule-body');

    const calc = () => {
      const amt = parseNum(sec.querySelector('#loan-amount').value);
      const rate = parseFloat(sec.querySelector('#loan-rate').value);
      const term = parseInt(sec.querySelector('#loan-term').value, 10);
      const type = sec.querySelector('input[name="loan-type"]:checked')?.value;

      if (!amt || isNaN(rate) || !term) { if (resArea) resArea.style.display = 'none'; return; }

      const mRate = (rate / 100) / 12;
      let totalInterest = 0, balance = amt, rows = [];

      for (let i = 1; i <= term; i++) {
        let interest = balance * mRate, principal = 0, total = 0;
        if (type === 'equal_principal_interest') {
          total = (amt * mRate * Math.pow(1 + mRate, term)) / (Math.pow(1 + mRate, term) - 1);
          principal = total - interest;
        } else if (type === 'equal_principal') {
          principal = amt / term;
          total = principal + interest;
        } else {
          principal = (i === term) ? amt : 0;
          total = principal + interest;
        }
        balance -= principal; totalInterest += interest;
        if (i <= 120) rows.push(`<tr><td>${i}회</td><td>${formatCurrency(principal)}</td><td>${formatCurrency(interest)}</td><td>${formatCurrency(total)}</td><td>${formatCurrency(Math.max(0, balance))}</td></tr>`);
      }

      sec.querySelector('#loan-monthly-payment').textContent = formatCurrency((amt + totalInterest) / term) + ' 원';
      sec.querySelector('#loan-total-interest').textContent = formatCurrency(totalInterest) + ' 원';
      sec.querySelector('#loan-total-repayment').textContent = formatCurrency(amt + totalInterest) + ' 원';
      if (scheduleBody) scheduleBody.innerHTML = rows.join('');
      if (resArea) resArea.style.display = 'block';
    };

    sec.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.id === 'loan-amount') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calc();
    }));
    sec.querySelectorAll('input[name="loan-type"]').forEach(r => r.addEventListener('change', calc));

    sec.querySelectorAll('.btn-add-loan').forEach(btn => btn.addEventListener('click', () => {
      const input = sec.querySelector('#loan-amount');
      input.value = formatCurrency(parseNum(input.value) + parseInt(btn.getAttribute('data-val'), 10));
      calc();
    }));
    sec.querySelectorAll('.btn-term-loan').forEach(btn => btn.addEventListener('click', () => {
      sec.querySelector('#loan-term').value = btn.getAttribute('data-term');
      calc();
    }));
    sec.querySelector('.btn-clear')?.addEventListener('click', () => {
      sec.querySelectorAll('input[type="text"], input[type="number"]').forEach(i => i.value = '');
      if (resArea) resArea.style.display = 'none';
    });
  };

  // 3. 연봉 계산기
  const initSalary = () => {
    const sec = document.getElementById('calc-salary');
    if (!sec) return;
    const resArea = sec.querySelector('#salary-result');

    const calc = () => {
      const annual = parseNum(sec.querySelector('#salary-amount').value);
      const taxfree = parseNum(sec.querySelector('#salary-taxfree').value);
      if (!annual || annual < 1000000) { if (resArea) resArea.style.display = 'none'; return; }

      const monthly = annual / 12;
      const taxable = Math.max(0, monthly - taxfree);
      const pension = Math.min(taxable * 0.045, 265500);
      const health = taxable * 0.03545;
      const care = health * 0.1295;
      const employ = taxable * 0.009;
      
      let incomeTax = 0; // 간이 누진
      const annualTaxable = taxable * 12;
      if (annualTaxable <= 14000000) incomeTax = (annualTaxable * 0.06) / 12;
      else if (annualTaxable <= 50000000) incomeTax = (840000 + (annualTaxable - 14000000) * 0.15) / 12;
      else if (annualTaxable <= 88000000) incomeTax = (6240000 + (annualTaxable - 50000000) * 0.24) / 12;
      else incomeTax = (15360000 + (annualTaxable - 88000000) * 0.35) / 12;

      const localTax = incomeTax * 0.1;
      const totalDeduction = pension + health + care + employ + incomeTax + localTax;

      const update = (id, val) => { const el = sec.querySelector('#' + id); if (el) el.textContent = formatCurrency(val) + ' 원'; };
      update('stub-gross-pay', monthly);
      update('stub-taxable-pay', taxable);
      update('stub-taxfree-pay', taxfree);
      update('stub-pension', pension);
      update('stub-health', health);
      update('stub-care', care);
      update('stub-employ', employ);
      update('stub-income-tax', incomeTax);
      update('stub-local-tax', localTax);
      update('stub-total-deduction', totalDeduction);
      update('stub-net-pay', monthly - totalDeduction);
      if (resArea) resArea.style.display = 'block';
    };

    sec.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calc();
    }));
    sec.querySelectorAll('.btn-add-salary').forEach(btn => btn.addEventListener('click', () => {
      sec.querySelector('#salary-amount').value = formatCurrency(parseNum(btn.getAttribute('data-val')));
      calc();
    }));
    sec.querySelector('.btn-clear')?.addEventListener('click', () => {
      sec.querySelector('#salary-amount').value = '';
      if (resArea) resArea.style.display = 'none';
    });
  };

  // 4. 예적금 계산기
  const initSavings = () => {
    const sec = document.getElementById('calc-savings');
    if (!sec) return;
    const resArea = sec.querySelector('#sav-result');

    const calc = () => {
      const amt = parseNum(sec.querySelector('#sav-amount').value);
      const term = parseInt(sec.querySelector('#sav-term').value, 10);
      const rate = parseFloat(sec.querySelector('#sav-rate').value);
      const type = sec.querySelector('input[name="sav-type"]:checked')?.value;
      const taxType = sec.querySelector('input[name="sav-tax-type"]:checked')?.value;

      if (!amt || isNaN(rate) || !term) { if (resArea) resArea.style.display = 'none'; return; }

      let totalPrincipal = 0, totalInterest = 0;
      if (type === 'deposit') { totalPrincipal = amt; totalInterest = amt * (rate/100) * (term/12); }
      else { totalPrincipal = amt * term; totalInterest = amt * (term*(term+1)/2) * (rate/100/12); }

      const taxRate = taxType === 'normal' ? 0.154 : (taxType === 'prefer' ? 0.014 : 0);
      const taxAmt = totalInterest * taxRate;
      
      sec.querySelector('#sav-total-receive').textContent = formatCurrency(totalPrincipal + totalInterest - taxAmt) + ' 원';
      const details = sec.querySelector('#sav-result-details');
      if (details) details.innerHTML = `<div class="row"><span>세전이자</span><span>${formatCurrency(totalInterest)} 원</span></div><div class="row"><span>이자소득세</span><span>-${formatCurrency(taxAmt)} 원</span></div>`;
      if (resArea) resArea.style.display = 'block';
    };

    sec.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.id === 'sav-amount') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calc();
    }));
    sec.querySelectorAll('input[type="radio"]').forEach(r => r.addEventListener('change', calc));
  };

  // 5. 세금 계산기 (통합 보유세 및 정밀 로직)
  const initTax = () => {
    const sec = document.getElementById('calc-tax');
    if (!sec) return;
    const categorySelect = sec.querySelector('#tax-category-select');
    const resArea = sec.querySelector('#tax-result');

    const calculate = () => {
      const type = categorySelect.value;
      const finalAmtEl = sec.querySelector('#tax-final-amount');
      const detailsEl = sec.querySelector('#tax-result-details');
      let res = null;

      if (type === 'holding') {
        const val = parseNum(sec.querySelector('#holding-value')?.value || 0);
        const isH1 = sec.querySelector('input[name="holding-h1"]:checked')?.value === 'yes';
        const houseCount = sec.querySelector('input[name="holding-count"]:checked')?.value;
        const assetType = sec.querySelector('#holding-asset-type')?.value;

        if (val > 0) {
          const propFmv = assetType === 'house' ? 0.6 : 0.7;
          const propTax = getPropertyTax(val * propFmv, isH1 && val <= 900000000);
          let compTax = 0;
          if (assetType === 'house') {
            const compBase = Math.max(0, val - (isH1 ? 1200000000 : 900000000)) * 0.6;
            compTax = getCompTax(compBase, houseCount === '3') * 0.8; // 중복분 공제 간이
          }
          res = { main: propTax + compTax, details: `<div class="row" style="font-weight:700"><span>[재산세]</span><span>${formatCurrency(propTax)} 원</span></div><div class="row" style="font-weight:700"><span>[종부세]</span><span>${formatCurrency(compTax)} 원</span></div>` };
        }
      } else if (type === 'gain') {
        const buy = parseNum(sec.querySelector('#gain-buy')?.value || 0), sell = parseNum(sec.querySelector('#gain-sell')?.value || 0);
        const holdY = parseInt(sec.querySelector('#gain-hold-year')?.value || 0, 10), resideY = parseInt(sec.querySelector('#gain-reside-year')?.value || 0, 10);
        const isH1 = sec.querySelector('input[name="gain-asset-type"]:checked')?.value === 'house1';
        if (buy > 0 && sell > 0) {
          let profit = sell - buy - parseNum(sec.querySelector('#gain-expenses')?.value || 0);
          let taxableProfit = isH1 ? (sell <= 1200000000 ? 0 : profit * (sell - 1200000000) / sell) : profit;
          let dRate = holdY < 3 ? 0 : (isH1 && resideY >= 2 ? Math.min(holdY * 0.04, 0.4) + Math.min(resideY * 0.04, 0.4) : Math.min(holdY * 0.02, 0.3));
          const base = Math.max(0, taxableProfit * (1 - dRate) - 2500000);
          res = { main: base * 0.2, details: `<div class="row"><span>장특공 (${(dRate*100).toFixed(0)}%)</span><span>과표 ${formatCurrency(base)} 원</span></div>` };
        }
      } else if (type === 'gift') {
        const configs = [{id:'spouse', l:'배우자', d:600000000}, {id:'adult-child', l:'성인자녀', d:50000000}, {id:'minor-child', l:'미성년자녀', d:20000000}];
        let total = 0, b = '';
        configs.forEach(c => {
          const cnt = parseInt(sec.querySelector(`#gift-${c.id}-count`)?.value || 0, 10), amt = parseNum(sec.querySelector(`#gift-${c.id}-amount`)?.value || 0);
          if (cnt > 0 && amt > 0) { const tax = getGiftTax(amt - c.d) * 0.97; total += tax * cnt; b += `<div class="row"><span>${c.l}</span><span>인당 ${formatCurrency(tax)} 원</span></div>`; }
        });
        if (total > 0) res = { main: total, details: b };
      }

      if (res) { finalAmtEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`; detailsEl.innerHTML = res.details; resArea.style.display = 'block'; }
      else { resArea.style.display = 'none'; }
    };

    categorySelect.addEventListener('change', () => {
      sec.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
      calculate();
    });
    sec.querySelectorAll('input, select').forEach(el => el.addEventListener('input', (e) => {
      if (e.target.type === 'text' && !e.target.id.includes('year')) e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calculate();
    }));
    sec.querySelector('.btn-clear')?.addEventListener('click', () => {
      sec.querySelectorAll('input[type="text"], input[type="number"]').forEach(i => i.value = '');
      if (resArea) resArea.style.display = 'none';
    });
    sec.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
  };

  initNav(); initLoan(); initSalary(); initSavings(); initTax();
});