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

  // 2. 대출 계산기 (완전 복구)
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
      
      if (!loanAmt || isNaN(rate) || !months) {
        if (resultArea) resultArea.style.display = 'none';
        return;
      }

      const type = typeEl ? typeEl.value : 'equal_principal_interest';
      const monthlyRate = (rate / 100) / 12;
      let totalInterest = 0;
      let balance = loanAmt;
      let rows = [];

      for (let i = 1; i <= months; i++) {
        let interest = balance * monthlyRate;
        let principal = 0;
        let total = 0;

        if (type === 'equal_principal_interest') {
          // 원리금균등
          total = (loanAmt * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
          principal = total - interest;
        } else if (type === 'equal_principal') {
          // 원금균등
          principal = loanAmt / months;
          total = principal + interest;
        } else {
          // 만기일시
          principal = (i === months) ? loanAmt : 0;
          total = principal + interest;
        }

        balance -= principal;
        totalInterest += interest;

        if (i <= 100) { // 상위 100회차까지만 스케줄 표시
          rows.push(`<tr><td>${i}회</td><td>${formatCurrency(principal)}</td><td>${formatCurrency(interest)}</td><td>${formatCurrency(total)}</td><td>${formatCurrency(Math.max(0, balance))}</td></tr>`);
        }
      }

      document.getElementById('loan-monthly-payment').textContent = formatCurrency((loanAmt + totalInterest) / months) + ' 원';
      document.getElementById('loan-total-interest').textContent = formatCurrency(totalInterest) + ' 원';
      document.getElementById('loan-total-repayment').textContent = formatCurrency(loanAmt + totalInterest) + ' 원';
      if (scheduleBody) scheduleBody.innerHTML = rows.join('');
      if (resultArea) resultArea.style.display = 'block';
    };

    section.querySelectorAll('input').forEach(i => {
      i.addEventListener('input', (e) => {
        if (e.target.type === 'text') {
          const v = parseNum(e.target.value);
          e.target.value = v ? formatCurrency(v) : '';
        }
        calculate();
      });
    });
    section.querySelectorAll('input[name="loan-type"]').forEach(r => r.addEventListener('change', calculate));

    // 초기화 버튼
    const clearBtn = section.querySelector('.btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        section.querySelectorAll('input').forEach(i => i.value = (i.type === 'number' ? i.defaultValue : ''));
        if (resultArea) resultArea.style.display = 'none';
      });
    }
  };

  // 3. 통합 세금 계산기 (보유세 포함)
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    if (!categorySelect) return;
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');

    const calculate = () => {
      const type = categorySelect.value;
      let res = null;

      if (type === 'holding') {
        const val = parseNum(document.getElementById('holding-value')?.value || 0);
        const assetType = document.getElementById('holding-asset-type')?.value;
        const isH1 = document.querySelector('input[name="holding-h1"]:checked')?.value === 'yes';
        const houseCount = document.querySelector('input[name="holding-count"]:checked')?.value;
        if (val > 0) {
          const fmv = assetType === 'house' ? 0.6 : 0.7;
          const tax = val * fmv * 0.002; // 간이
          res = { main: tax, details: `<div class="row"><span>통합 보유세(재산+종부)</span><span>과표 ${fmv*100}% 기준</span></div>` };
        }
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy')?.value || 0), sell = parseNum(document.getElementById('gain-sell')?.value || 0);
        if (buy > 0 && sell > 0) res = { main: (sell - buy) * 0.2, details: '<div class="row"><span>양도차익 기본 20%</span></div>' };
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

    const clearBtn = document.querySelector('.btn-clear[data-target="tax"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        document.querySelectorAll('#calc-tax input').forEach(i => i.value = '');
        resultArea.style.display = 'none';
      });
    }
    document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
  };

  // 기타 모듈 (연봉, 예적금)
  const initOthers = () => {
    ['calc-salary', 'calc-savings'].forEach(id => {
      const sec = document.getElementById(id);
      if (!sec) return;
      sec.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
        if (e.target.type === 'text') {
          const v = parseNum(e.target.value);
          e.target.value = v ? formatCurrency(v) : '';
        }
        const res = sec.querySelector('.result-area') || sec.querySelector('.pay-stub');
        if (res) res.style.display = 'block';
      }));
    });
  };

  initLoan();
  initTax();
  initOthers();
};

document.addEventListener('DOMContentLoaded', initApp);