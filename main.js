// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// --- 앱 초기화 (전체 복구 버전) ---

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

    // 퀵 추가 버튼 바인딩
    section.querySelectorAll('.quick-add button:not(.btn-clear)').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('loan-amount');
        const val = btn.textContent.includes('억') ? parseNum(btn.textContent) * 100000000 : parseNum(btn.textContent) * 10000;
        if (input) { input.value = formatCurrency(parseNum(input.value) + val); calculate(); }
      });
    });

    // 초기화 버튼
    const clearBtn = section.querySelector('.btn-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      section.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
      if (resultArea) resultArea.style.display = 'none';
    });
  };

  // 3. 연봉 계산기
  const initSalary = () => {
    const section = document.getElementById('calc-salary');
    if (!section) return;
    const resultArea = document.getElementById('salary-result');

    const calculate = () => {
      const annualGross = parseNum(document.getElementById('salary-amount').value);
      if (!annualGross || annualGross < 1000000) { if (resultArea) resultArea.style.display = 'none'; return; }
      const monthlyGross = annualGross / 12;
      const netPay = monthlyGross * 0.85; // 간이
      document.getElementById('stub-gross-pay').textContent = formatCurrency(monthlyGross) + ' 원';
      document.getElementById('stub-net-pay').textContent = formatCurrency(netPay) + ' 원';
      if (resultArea) resultArea.style.display = 'block';
    };

    section.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calculate();
    }));

    section.querySelectorAll('.btn-add-salary').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('salary-amount');
        if (input) { input.value = formatCurrency(parseNum(btn.getAttribute('data-val'))); calculate(); }
      });
    });

    const clearBtn = section.querySelector('.btn-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      section.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
      if (resultArea) resultArea.style.display = 'none';
    });
  };

  // 4. 예적금 계산기
  const initSavings = () => {
    const section = document.getElementById('calc-savings');
    if (!section) return;
    const resultArea = document.getElementById('sav-result');

    const calculate = () => {
      const amt = parseNum(document.getElementById('sav-amount').value);
      const months = parseInt(document.getElementById('sav-term').value, 10);
      const rate = parseFloat(document.getElementById('sav-rate').value);
      if (!amt || !months || isNaN(rate)) { if (resultArea) resultArea.style.display = 'none'; return; }
      const total = amt * months + (amt * months * rate / 100 * 0.846 / 12);
      document.getElementById('sav-total-receive').textContent = formatCurrency(total) + ' 원';
      if (resultArea) resultArea.style.display = 'block';
    };

    section.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calculate();
    }));

    section.querySelectorAll('input[name="sav-type"], input[name="sav-tax-type"]').forEach(r => r.addEventListener('change', calculate));

    const clearBtn = section.querySelector('.btn-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      section.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
      if (resultArea) resultArea.style.display = 'none';
    });
  };

  // 5. 통합 세금 계산기
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    if (!categorySelect) return;
    const resultArea = document.getElementById('tax-result');

    const calculate = () => {
      const type = categorySelect.value;
      const finalAmountEl = document.getElementById('tax-final-amount');
      const detailsEl = document.getElementById('tax-result-details');
      let val = parseNum(document.querySelector(`#tax-input-${type} input[type="text"]`)?.value || 0);
      if (val > 0) {
        finalAmountEl.innerHTML = `${formatCurrency(val * 0.05)} <span class="unit">원</span>`;
        detailsEl.innerHTML = '<div class="row"><span>통합 계산 결과</span><span>5% 가정</span></div>';
        if (resultArea) resultArea.style.display = 'block';
      } else { if (resultArea) resultArea.style.display = 'none'; }
    };

    categorySelect.addEventListener('change', () => {
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
      calculate();
    });

    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
        calculate();
      });
    });

    const clearBtn = document.querySelector('.btn-clear[data-target="tax"]');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      document.querySelectorAll('#calc-tax input').forEach(i => i.value = '');
      if (resultArea) resultArea.style.display = 'none';
    });

    document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
  };

  // 실행
  initNav();
  initLoan();
  initSalary();
  initSavings();
  initTax();
});