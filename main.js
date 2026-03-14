/**
 * Smart Financial Hub - main.js (Stable Version)
 */

// --- 공통 유틸리티 ---
const formatCurrency = (num) => {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};

const parseNum = (str) => {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// --- 세율 및 공제 로직 ---
const getPropertyTax = (base, isSpecial) => {
  if (isSpecial) {
    if (base <= 60000000) return base * 0.0005;
    if (base <= 150000000) return 30000 + (base - 60000000) * 0.001;
    if (base <= 300000000) return 120000 + (base - 150000000) * 0.002;
    return 420000 + (base - 300000000) * 0.0035;
  }
  if (base <= 60000000) return base * 0.001;
  if (base <= 150000000) return 60000 + (base - 60000000) * 0.0015;
  if (base <= 300000000) return 195000 + (base - 150000000) * 0.0025;
  return 570000 + (base - 300000000) * 0.004;
};

const getCompTax = (base, isMulti) => {
  if (base <= 0) return 0;
  if (isMulti) {
    if (base <= 300000000) return base * 0.005;
    if (base <= 600000000) return base * 0.007 - 600000;
    if (base <= 1200000000) return base * 0.01 - 2400000;
    if (base <= 2500000000) return base * 0.02 - 14400000;
    return base * 0.05 - 89400000;
  }
  if (base <= 300000000) return base * 0.005;
  if (base <= 600000000) return base * 0.007 - 600000;
  if (base <= 1200000000) return base * 0.01 - 2400000;
  if (base <= 2500000000) return base * 0.012 - 4800000;
  return base * 0.027 - 42300000;
};

// --- 메인 실행부 ---
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

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      sections.forEach(s => s.classList.remove('active'));
      
      const target = document.getElementById(tabId);
      if (target) target.classList.add('active');
      
      if (headerTitle) headerTitle.textContent = item.getAttribute('data-title') || headerTitle.textContent;
      if (headerDesc) headerDesc.textContent = item.getAttribute('data-desc') || headerDesc.textContent;
      window.scrollTo(0, 0);
    });
  });

  // 2. 대출 계산기
  const setupLoan = () => {
    const sec = document.getElementById('calc-loan');
    if (!sec) return;
    const resArea = document.getElementById('loan-result');
    const scheduleBody = document.getElementById('loan-schedule-body');

    const run = () => {
      const amt = parseNum(document.getElementById('loan-amount').value);
      const rate = parseFloat(document.getElementById('loan-rate').value);
      const term = parseInt(document.getElementById('loan-term').value, 10);
      const type = document.querySelector('input[name="loan-type"]:checked')?.value;

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

      document.getElementById('loan-monthly-payment').textContent = formatCurrency((amt + totalInterest) / term) + ' 원';
      document.getElementById('loan-total-interest').textContent = formatCurrency(totalInterest) + ' 원';
      document.getElementById('loan-total-repayment').textContent = formatCurrency(amt + totalInterest) + ' 원';
      if (scheduleBody) scheduleBody.innerHTML = rows.join('');
      if (resArea) resArea.style.display = 'block';
    };

    sec.querySelectorAll('input').forEach(el => el.addEventListener('input', (e) => {
      if (e.target.id === 'loan-amount') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      run();
    }));
    sec.querySelectorAll('input[name="loan-type"]').forEach(r => r.addEventListener('change', run));

    sec.querySelectorAll('.btn-add-loan').forEach(btn => btn.addEventListener('click', () => {
      const input = document.getElementById('loan-amount');
      input.value = formatCurrency(parseNum(input.value) + parseInt(btn.getAttribute('data-val'), 10));
      run();
    }));
    sec.querySelectorAll('.btn-term-loan').forEach(btn => btn.addEventListener('click', () => {
      document.getElementById('loan-term').value = btn.getAttribute('data-term');
      run();
    }));
    sec.querySelector('.btn-clear')?.addEventListener('click', () => {
      sec.querySelectorAll('input[type="text"], input[type="number"]').forEach(i => i.value = '');
      if (resArea) resArea.style.display = 'none';
    });
  };

  // 3. 연봉 계산기
  const setupSalary = () => {
    const sec = document.getElementById('calc-salary');
    if (!sec) return;
    const resArea = document.getElementById('salary-result');

    const run = () => {
      const annual = parseNum(document.getElementById('salary-amount').value);
      const taxfree = parseNum(document.getElementById('salary-taxfree').value);
      if (!annual || annual < 1000000) { if (resArea) resArea.style.display = 'none'; return; }

      const monthly = annual / 12;
      const taxable = Math.max(0, monthly - taxfree);
      const pension = Math.min(taxable * 0.045, 265500);
      const health = taxable * 0.03545;
      const care = health * 0.1295;
      const employ = taxable * 0.009;
      
      let incomeTax = 0;
      const taxableYear = taxable * 12;
      if (taxableYear <= 14000000) incomeTax = (taxableYear * 0.06) / 12;
      else if (taxableYear <= 50000000) incomeTax = (840000 + (taxableYear - 14000000) * 0.15) / 12;
      else incomeTax = (6240000 + (taxableYear - 50000000) * 0.24) / 12;

      const totalDed = pension + health + care + employ + incomeTax * 1.1;
      
      const update = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatCurrency(val) + ' 원'; };
      update('stub-gross-pay', monthly);
      update('stub-taxable-pay', taxable);
      update('stub-taxfree-pay', taxfree);
      update('stub-pension', pension);
      update('stub-health', health);
      update('stub-care', care);
      update('stub-employ', employ);
      update('stub-income-tax', incomeTax);
      update('stub-local-tax', incomeTax * 0.1);
      update('stub-total-deduction', totalDed);
      update('stub-net-pay', monthly - totalDed);
      if (resArea) resArea.style.display = 'block';
    };

    sec.querySelectorAll('input').forEach(el => el.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      run();
    }));
    sec.querySelectorAll('.btn-add-salary').forEach(btn => btn.addEventListener('click', () => {
      document.getElementById('salary-amount').value = formatCurrency(parseNum(btn.getAttribute('data-val')));
      run();
    }));
    sec.querySelector('.btn-clear')?.addEventListener('click', () => {
      document.getElementById('salary-amount').value = '';
      if (resArea) resArea.style.display = 'none';
    });
  };

  // 4. 예적금 계산기
  const setupSavings = () => {
    const sec = document.getElementById('calc-savings');
    if (!sec) return;
    const resArea = document.getElementById('sav-result');

    const run = () => {
      const amt = parseNum(document.getElementById('sav-amount').value);
      const term = parseInt(document.getElementById('sav-term').value, 10);
      const rate = parseFloat(document.getElementById('sav-rate').value);
      const type = document.querySelector('input[name="sav-type"]:checked')?.value;
      const taxType = document.querySelector('input[name="sav-tax-type"]:checked')?.value;

      if (!amt || isNaN(rate) || !term) { if (resArea) resArea.style.display = 'none'; return; }

      let principal = type === 'deposit' ? amt : amt * term;
      let interest = type === 'deposit' ? amt * (rate/100) * (term/12) : amt * (term*(term+1)/2) * (rate/100/12);
      
      const taxRate = taxType === 'normal' ? 0.154 : (taxType === 'prefer' ? 0.014 : 0);
      const taxAmt = interest * taxRate;

      document.getElementById('sav-total-receive').textContent = formatCurrency(principal + interest - taxAmt) + ' 원';
      const details = document.getElementById('sav-result-details');
      if (details) details.innerHTML = `<div class="row"><span>원금 합계</span><span>${formatCurrency(principal)} 원</span></div><div class="row"><span>세전이자</span><span>${formatCurrency(interest)} 원</span></div><div class="row"><span>이자소득세</span><span>-${formatCurrency(taxAmt)} 원</span></div>`;
      if (resArea) resArea.style.display = 'block';
    };

    sec.querySelectorAll('input').forEach(el => el.addEventListener('input', (e) => {
      if (e.target.id === 'sav-amount') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      run();
    }));
    sec.querySelectorAll('input[type="radio"]').forEach(r => r.addEventListener('change', run));
  };

  // 5. 세금 계산기
  const setupTax = () => {
    const sec = document.getElementById('calc-tax');
    if (!sec) return;
    const select = document.getElementById('tax-category-select');
    const resArea = document.getElementById('tax-result');

    const run = () => {
      const type = select.value;
      const finalAmt = document.getElementById('tax-final-amount');
      const details = document.getElementById('tax-result-details');
      let res = null;

      if (type === 'holding') {
        const val = parseNum(document.getElementById('holding-value').value);
        const isH1 = document.querySelector('input[name="holding-h1"]:checked')?.value === 'yes';
        const houseCount = document.querySelector('input[name="holding-count"]:checked')?.value || '1';
        const assetType = document.getElementById('holding-asset-type').value;

        if (val > 0) {
          const fmv = assetType === 'house' ? 0.6 : 0.7;
          const propTax = getPropertyTax(val * fmv, isH1 && val <= 900000000);
          let compTax = 0;
          if (assetType === 'house') {
            const compBase = Math.max(0, val - (isH1 ? 1200000000 : 900000000)) * 0.6;
            compTax = getCompTax(compBase, houseCount === '3') * 0.8;
          }
          res = { main: propTax + compTax, details: `<div class="row"><span>재산세 상세</span><span>${formatCurrency(propTax)} 원</span></div><div class="row"><span>종부세 상세</span><span>${formatCurrency(compTax)} 원</span></div>` };
        }
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy').value);
        const sell = parseNum(document.getElementById('gain-sell').value);
        if (buy > 0 && sell > 0) {
          res = { main: (sell - buy) * 0.2, details: '<div class="row"><span>양도차익 기본 계산</span><span>20% 적용</span></div>' };
        }
      } else {
        const val = parseNum(document.querySelector(`#tax-input-${type} input[type="text"]`)?.value || 0);
        if (val > 0) res = { main: val * 0.1, details: '<div class="row"><span>간이 계산 결과</span><span>10% 기준</span></div>' };
      }

      if (res) {
        finalAmt.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        details.innerHTML = res.details;
        resArea.style.display = 'block';
      } else { resArea.style.display = 'none'; }
    };

    select.addEventListener('change', () => {
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${select.value}`) ? 'block' : 'none');
      run();
    });
    sec.querySelectorAll('input, select').forEach(el => el.addEventListener('input', (e) => {
      if (e.target.type === 'text' && !e.target.id.includes('year')) e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      run();
    }));
    sec.querySelector('.btn-clear')?.addEventListener('click', () => {
      sec.querySelectorAll('input[type="text"], input[type="number"]').forEach(i => i.value = '');
      if (resArea) resArea.style.display = 'none';
    });
    
    // 초기 로드
    document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${select.value}`) ? 'block' : 'none');
  };

  // 모든 계산기 모듈 실행
  try { setupLoan(); } catch(e) {}
  try { setupSalary(); } catch(e) {}
  try { setupSavings(); } catch(e) {}
  try { setupTax(); } catch(e) {}

});