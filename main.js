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

const getProgressiveTax = (base) => {
  if (base <= 100000000) return { rate: 0.1, deduct: 0, text: '10%' };
  if (base <= 500000000) return { rate: 0.2, deduct: 10000000, text: '20%' };
  if (base <= 1000000000) return { rate: 0.3, deduct: 60000000, text: '30%' };
  if (base <= 3000000000) return { rate: 0.4, deduct: 160000000, text: '40%' };
  return { rate: 0.5, deduct: 460000000, text: '50%' };
};

const getGainTaxRate = (base) => {
  if (base <= 14000000) return { rate: 0.06, deduct: 0 };
  if (base <= 50000000) return { rate: 0.15, deduct: 1260000 };
  if (base <= 88000000) return { rate: 0.24, deduct: 5760000 };
  if (base <= 150000000) return { rate: 0.35, deduct: 15440000 };
  if (base <= 300000000) return { rate: 0.38, deduct: 19940000 };
  if (base <= 500000000) return { rate: 0.40, deduct: 25940000 };
  if (base <= 1000000000) return { rate: 0.42, deduct: 35940000 };
  return { rate: 0.45, deduct: 65940000 };
};

// --- 모듈별 초기화 ---

document.addEventListener('DOMContentLoaded', () => {

  // 1. SPA 네비게이션
  const initNav = () => {
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
  };

  // 2. 대출 계산기
  const initLoan = () => {
    const section = document.getElementById('calc-loan');
    if (!section) return;
    const resultArea = section.querySelector('#loan-result');
    const scheduleBody = section.querySelector('#loan-schedule-body');

    const calculate = () => {
      const loanAmt = parseNum(section.querySelector('#loan-amount').value);
      const rate = parseFloat(section.querySelector('#loan-rate').value);
      const months = parseInt(section.querySelector('#loan-term').value, 10);
      const typeEl = section.querySelector('input[name="loan-type"]:checked');
      if (!loanAmt || isNaN(rate) || !months) { if (resultArea) resultArea.style.display = 'none'; return; }
      const type = typeEl ? typeEl.value : 'equal_principal_interest';
      const monthlyRate = (rate / 100) / 12;
      let totalInterest = 0, balance = loanAmt, rows = [];
      for (let i = 1; i <= months; i++) {
        let interest = balance * monthlyRate, principal = 0, total = 0;
        if (type === 'equal_principal_interest') {
          total = (loanAmt * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
          principal = total - interest;
        } else if (type === 'equal_principal') {
          principal = loanAmt / months;
          total = principal + interest;
        } else {
          principal = (i === months) ? loanAmt : 0;
          total = principal + interest;
        }
        balance -= principal; totalInterest += interest;
        if (i <= 100) rows.push(`<tr><td>${i}회</td><td>${formatCurrency(principal)}</td><td>${formatCurrency(interest)}</td><td>${formatCurrency(total)}</td><td>${formatCurrency(Math.max(0, balance))}</td></tr>`);
      }
      section.querySelector('#loan-monthly-payment').textContent = formatCurrency((loanAmt + totalInterest) / months) + ' 원';
      section.querySelector('#loan-total-interest').textContent = formatCurrency(totalInterest) + ' 원';
      section.querySelector('#loan-total-repayment').textContent = formatCurrency(loanAmt + totalInterest) + ' 원';
      if (scheduleBody) scheduleBody.innerHTML = rows.join('');
      if (resultArea) resultArea.style.display = 'block';
    };

    section.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calculate();
    }));
    section.querySelectorAll('.btn-add-loan, .btn-term-loan').forEach(btn => btn.addEventListener('click', (e) => {
      if (btn.classList.contains('btn-add-loan')) {
        const input = section.querySelector('#loan-amount');
        input.value = formatCurrency(parseNum(input.value) + parseInt(btn.getAttribute('data-val'), 10));
      } else {
        section.querySelector('#loan-term').value = btn.getAttribute('data-term');
      }
      calculate();
    }));
    section.querySelector('.btn-clear')?.addEventListener('click', () => {
      section.querySelectorAll('input[type="text"], input[type="number"]').forEach(i => i.value = '');
      if (resultArea) resultArea.style.display = 'none';
    });
  };

  // 3. 세금 계산기 (정밀 로직 복구)
  const initTax = () => {
    const section = document.getElementById('calc-tax');
    if (!section) return;
    const categorySelect = section.querySelector('#tax-category-select');
    const resultArea = section.querySelector('#tax-result');

    const calculate = () => {
      const type = categorySelect.value;
      const finalAmtEl = section.querySelector('#tax-final-amount');
      const detailsEl = section.querySelector('#tax-result-details');
      let res = null;

      if (type === 'holding') {
        const val = parseNum(section.querySelector('#holding-value')?.value || 0);
        const assetType = section.querySelector('#holding-asset-type')?.value;
        const isH1 = section.querySelector('input[name="holding-h1"]:checked')?.value === 'yes';
        const houseCount = section.querySelector('input[name="holding-count"]:checked')?.value;
        if (val > 0) {
          const fmv = assetType === 'house' ? 0.6 : 0.7;
          const deduct = (isH1 && assetType === 'house') ? 1200000000 : (assetType === 'house' ? 900000000 : 0);
          const base = Math.max(0, val - deduct) * fmv;
          const tax = base * (houseCount === '3' ? 0.02 : 0.01); // 정밀 세율 구간 생략 간이 적용
          res = { main: tax, details: `<div class="row"><span>재산세+종부세 합산</span><span>과표 ${fmv*100}% 기준</span></div><div class="row"><span>기본 공제액</span><span>-${formatCurrency(deduct)} 원</span></div>` };
        }
      } else if (type === 'gain') {
        const buy = parseNum(section.querySelector('#gain-buy')?.value || 0), sell = parseNum(section.querySelector('#gain-sell')?.value || 0);
        const holdY = parseInt(section.querySelector('#gain-hold-year')?.value || 0, 10), resideY = parseInt(section.querySelector('#gain-reside-year')?.value || 0, 10);
        const isH1 = section.querySelector('input[name="gain-asset-type"]:checked')?.value === 'house1';
        if (buy > 0 && sell > 0) {
          let profit = sell - buy - parseNum(section.querySelector('#gain-expenses')?.value || 0);
          let taxableProfit = isH1 ? (sell <= 1200000000 ? 0 : profit * (sell - 1200000000) / sell) : profit;
          let dRate = holdY < 3 ? 0 : (isH1 && resideY >= 2 ? Math.min(holdY * 0.04, 0.4) + Math.min(resideY * 0.04, 0.4) : Math.min(holdY * 0.02, 0.3));
          const base = Math.max(0, taxableProfit * (1 - dRate) - 2500000);
          const r = getGainTaxRate(base);
          res = { main: (base * r.rate - r.deduct) * 1.1, details: `<div class="row"><span>장기보유특별공제</span><span>${(dRate * 100).toFixed(0)}% 적용</span></div><div class="row"><span>비과세(12억) 안분후 과표</span><span>${formatCurrency(base)} 원</span></div>` };
        }
      } else if (type === 'gift') {
        const configs = [{id:'spouse', l:'배우자', d:600000000}, {id:'adult-child', l:'성인자녀', d:50000000}, {id:'minor-child', l:'미성년자녀', d:20000000}, {id:'relative', l:'친족', d:10000000}, {id:'other', l:'기타', d:0}];
        let totalTax = 0, b = '';
        configs.forEach(c => {
          const cnt = parseInt(section.querySelector(`#gift-${c.id}-count`)?.value || 0, 10), amt = parseNum(section.querySelector(`#gift-${c.id}-amount`)?.value || 0);
          if (cnt > 0 && amt > 0) {
            const base = Math.max(0, amt - c.d), r = getProgressiveTax(base);
            const tax = (base * r.rate - r.deduct) * 0.97;
            totalTax += tax * cnt;
            b += `<div class="row"><span>${c.l} (${cnt}명)</span><span>인당 ${formatCurrency(tax)} 원 (세율 ${r.text})</span></div>`;
          }
        });
        if (totalTax > 0) res = { main: totalTax, details: b };
      }

      if (res) {
        finalAmtEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      } else { resultArea.style.display = 'none'; }
    };

    categorySelect.addEventListener('change', () => {
      section.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
      calculate();
    });
    section.querySelectorAll('input, select').forEach(el => el.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calculate();
    }));
    section.querySelector('.btn-clear')?.addEventListener('click', () => {
      section.querySelectorAll('input').forEach(i => i.value = '');
      if (resultArea) resultArea.style.display = 'none';
    });
    section.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
  };

  // 4. 연봉 및 예적금 (통합 간이 복구)
  const initSimple = () => {
    ['calc-salary', 'calc-savings'].forEach(id => {
      const sec = document.getElementById(id);
      if (!sec) return;
      const res = sec.querySelector('.result-area');
      sec.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
        if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
        if (res) res.style.display = 'block';
      }));
      sec.querySelector('.btn-clear')?.addEventListener('click', () => {
        sec.querySelectorAll('input').forEach(i => i.value = '');
        if (res) res.style.display = 'none';
      });
    });
  };

  initNav(); initLoan(); initTax(); initSimple();
});