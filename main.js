// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// --- 앱 초기화 ---

const initApp = () => {
  
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

  // 2. 대출 계산기 (복구 유지)
  const initLoan = () => {
    const section = document.getElementById('calc-loan');
    if (!section) return;
    const resultArea = document.getElementById('loan-result');
    const scheduleBody = document.getElementById('loan-schedule-body');

    const calculate = () => {
      const loanAmt = parseNum(document.getElementById('loan-amount').value);
      const rate = parseFloat(document.getElementById('loan-rate').value);
      const months = parseInt(document.getElementById('loan-term').value, 10);
      const typeEl = document.querySelector('input[name="loan-type"]:checked');
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
      document.getElementById('loan-monthly-payment').textContent = formatCurrency((loanAmt + totalInterest) / months) + ' 원';
      document.getElementById('loan-total-interest').textContent = formatCurrency(totalInterest) + ' 원';
      document.getElementById('loan-total-repayment').textContent = formatCurrency(loanAmt + totalInterest) + ' 원';
      if (scheduleBody) scheduleBody.innerHTML = rows.join('');
      if (resultArea) resultArea.style.display = 'block';
    };
    section.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calculate();
    }));
    section.querySelectorAll('input[name="loan-type"]').forEach(r => r.addEventListener('change', calculate));
  };

  // 3. 연봉 계산기 (상세 내역 복구)
  const initSalary = () => {
    const section = document.getElementById('calc-salary');
    if (!section) return;
    const resultArea = document.getElementById('salary-result');

    const calculate = () => {
      const annualGross = parseNum(document.getElementById('salary-amount').value);
      const monthlyTaxfree = parseNum(document.getElementById('salary-taxfree').value);
      
      if (!annualGross || annualGross < 1000000) {
        if (resultArea) resultArea.style.display = 'none';
        return;
      }

      const monthlyGross = annualGross / 12;
      const taxablePay = Math.max(0, monthlyGross - monthlyTaxfree);

      // 4대 보험 (2024-2025 기준)
      const pension = Math.min(taxablePay * 0.045, 265500); // 국민연금 상한액 반영
      const health = taxablePay * 0.03545;
      const care = health * 0.1295;
      const employ = taxablePay * 0.009;

      // 소득세 (간이 계산용 누진 로직)
      let incomeTax = 0;
      const annualTaxable = taxablePay * 12;
      if (annualTaxable <= 14000000) incomeTax = (annualTaxable * 0.06) / 12;
      else if (annualTaxable <= 50000000) incomeTax = (840000 + (annualTaxable - 14000000) * 0.15) / 12;
      else if (annualTaxable <= 88000000) incomeTax = (6240000 + (annualTaxable - 50000000) * 0.24) / 12;
      else incomeTax = (15360000 + (annualTaxable - 88000000) * 0.35) / 12;

      const localTax = incomeTax * 0.1;
      const totalDeduction = pension + health + care + employ + incomeTax + localTax;
      const netPay = monthlyGross - totalDeduction;

      // UI 업데이트
      const update = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatCurrency(val) + ' 원'; };
      update('stub-gross-pay', monthlyGross);
      update('stub-taxable-pay', taxablePay);
      update('stub-pension', pension);
      update('stub-health', health);
      update('stub-care', care);
      update('stub-employ', employ);
      update('stub-income-tax', incomeTax);
      update('stub-local-tax', localTax);
      update('stub-total-deduction', totalDeduction);
      update('stub-net-pay', netPay);

      if (resultArea) resultArea.style.display = 'block';
    };

    section.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calculate();
    }));

    // 퀵 추가 버튼
    section.querySelectorAll('.btn-add-salary').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        const input = document.getElementById('salary-amount');
        if (input) { input.value = formatCurrency(parseNum(val)); calculate(); }
      });
    });

    // 초기화 버튼
    const clearBtn = section.querySelector('.btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        section.querySelectorAll('input').forEach(i => i.value = (i.id === 'salary-taxfree' ? '200,000' : ''));
        if (resultArea) resultArea.style.display = 'none';
      });
    }
  };

  // 4. 예적금 계산기 (복구 유지)
  const initSavings = () => {
    const section = document.getElementById('calc-savings');
    if (!section) return;
    const resultArea = document.getElementById('sav-result');
    const calculate = () => {
      const amt = parseNum(document.getElementById('sav-amount').value);
      const months = parseInt(document.getElementById('sav-term').value, 10);
      const rate = parseFloat(document.getElementById('sav-rate').value);
      const type = document.querySelector('input[name="sav-type"]:checked')?.value;
      const taxType = document.querySelector('input[name="sav-tax-type"]:checked')?.value;
      if (!amt || isNaN(rate) || !months) { if (resultArea) resultArea.style.display = 'none'; return; }
      let totalPrincipal = 0, totalInterest = 0;
      if (type === 'deposit') { totalPrincipal = amt; totalInterest = amt * (rate / 100) * (months / 12); }
      else { totalPrincipal = amt * months; totalInterest = amt * (months * (months + 1) / 2) * (rate / 100 / 12); }
      const taxRate = taxType === 'normal' ? 0.154 : (taxType === 'prefer' ? 0.014 : 0);
      const taxAmt = totalInterest * taxRate;
      const netInterest = totalInterest - taxAmt;
      document.getElementById('sav-total-principal').textContent = formatCurrency(totalPrincipal) + ' 원';
      document.getElementById('sav-total-interest').textContent = formatCurrency(totalInterest) + ' 원';
      document.getElementById('sav-tax-amount').textContent = formatCurrency(taxAmt) + ' 원';
      document.getElementById('sav-total-receive').textContent = formatCurrency(totalPrincipal + netInterest) + ' 원';
      if (resultArea) resultArea.style.display = 'block';
    };
    section.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calculate();
    }));
    section.querySelectorAll('input[name="sav-type"], input[name="sav-tax-type"]').forEach(r => r.addEventListener('change', calculate));
  };

  // 5. 통합 세금 계산기 (복구 유지)
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    if (!categorySelect) return;
    const resultArea = document.getElementById('tax-result');
    const calculate = () => {
      const type = categorySelect.value;
      const finalAmountEl = document.getElementById('tax-final-amount');
      const detailsEl = document.getElementById('tax-result-details');
      let res = null;
      if (type === 'holding') {
        const val = parseNum(document.getElementById('holding-value')?.value || 0);
        if (val > 0) res = { main: val * 0.003, details: '<div class="row"><span>통합 보유세</span><span>간이 계산</span></div>' };
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy')?.value || 0), sell = parseNum(document.getElementById('gain-sell')?.value || 0);
        if (buy > 0 && sell > 0) res = { main: (sell - buy) * 0.2, details: '<div class="row"><span>양도차익</span><span>20% 적용</span></div>' };
      }
      if (res) { finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`; detailsEl.innerHTML = res.details; resultArea.style.display = 'block'; }
      else { resultArea.style.display = 'none'; }
    };
    categorySelect.addEventListener('change', () => {
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
      calculate();
    });
    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => el.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calculate();
    }));
    document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
  };

  initLoan();
  initSalary();
  initSavings();
  initTax();
};

document.addEventListener('DOMContentLoaded', initApp);