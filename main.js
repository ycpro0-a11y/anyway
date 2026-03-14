// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

document.addEventListener('DOMContentLoaded', () => {

  // SPA 네비게이션
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
      headerTitle.textContent = item.getAttribute('data-title');
      headerDesc.textContent = item.getAttribute('data-desc');
      window.scrollTo(0, 0);
    });
  });

  // 공통 세율표 (소득세/증여세/상속세 공용)
  const getProgressiveTax = (base) => {
    if (base <= 100000000) return { rate: 0.1, deduct: 0, text: '10%' };
    if (base <= 500000000) return { rate: 0.2, deduct: 10000000, text: '20%' };
    if (base <= 1000000000) return { rate: 0.3, deduct: 60000000, text: '30%' };
    if (base <= 3000000000) return { rate: 0.4, deduct: 160000000, text: '40%' };
    return { rate: 0.5, deduct: 460000000, text: '50%' };
  };

  const getIncomeTaxRate = (base) => {
    if (base <= 14000000) return { rate: 0.06, deduct: 0 };
    if (base <= 50000000) return { rate: 0.15, deduct: 1260000 };
    if (base <= 88000000) return { rate: 0.24, deduct: 5760000 };
    if (base <= 150000000) return { rate: 0.35, deduct: 15440000 };
    if (base <= 300000000) return { rate: 0.38, deduct: 19940000 };
    if (base <= 500000000) return { rate: 0.40, deduct: 25940000 };
    if (base <= 1000000000) return { rate: 0.42, deduct: 35940000 };
    return { rate: 0.45, deduct: 65940000 };
  };

  // 1. 대출 계산기
  const initLoan = () => {
    const section = document.getElementById('calc-loan');
    const resultArea = document.getElementById('loan-result');
    const scheduleBody = document.getElementById('loan-schedule-body');

    const calc = () => {
      const loanAmt = parseNum(document.getElementById('loan-amount').value);
      const rate = parseFloat(document.getElementById('loan-rate').value);
      const months = parseInt(document.getElementById('loan-term').value, 10);
      const typeEl = document.querySelector('input[name="loan-type"]:checked');
      const type = typeEl ? typeEl.value : 'equal_principal_interest';
      
      if (!loanAmt || isNaN(rate) || !months) { resultArea.style.display = 'none'; return; }
      
      const monthlyRate = (rate / 100) / 12;
      let totalInterest = 0;
      let balance = loanAmt;
      let schedule = [];

      for (let i = 1; i <= months; i++) {
        let interest = balance * monthlyRate;
        let principal = 0;
        if (type === 'equal_principal_interest') {
          const p = Math.pow(1 + monthlyRate, months);
          const payment = loanAmt * monthlyRate * p / (p - 1);
          principal = payment - interest;
        } else if (type === 'equal_principal') {
          principal = loanAmt / months;
        } else {
          principal = (i === months) ? loanAmt : 0;
        }
        balance -= principal;
        totalInterest += interest;
        if (i <= 100) schedule.push({ month: i, principal, interest, total: principal + interest, balance: Math.max(0, balance) });
      }

      document.getElementById('loan-monthly-payment').textContent = formatCurrency((loanAmt + totalInterest) / months) + ' 원';
      document.getElementById('loan-total-interest').textContent = formatCurrency(totalInterest) + ' 원';
      document.getElementById('loan-total-repayment').textContent = formatCurrency(loanAmt + totalInterest) + ' 원';
      scheduleBody.innerHTML = schedule.map(row => `<tr><td>${row.month}회</td><td>${formatCurrency(row.principal)}</td><td>${formatCurrency(row.interest)}</td><td>${formatCurrency(row.total)}</td><td>${formatCurrency(row.balance)}</td></tr>`).join('');
      resultArea.style.display = 'block';
    };

    section.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calc();
    }));
    section.querySelectorAll('input[name="loan-type"]').forEach(r => r.addEventListener('change', calc));
    document.querySelector('.btn-clear[data-target="loan"]').addEventListener('click', () => {
      section.querySelectorAll('input').forEach(i => i.value = '');
      resultArea.style.display = 'none';
    });
  };

  // 2. 연봉 계산기
  const initSalary = () => {
    const section = document.getElementById('calc-salary');
    const resultArea = document.getElementById('salary-result');
    const calc = () => {
      const salaryAmt = parseNum(document.getElementById('salary-amount').value);
      const taxfree = parseNum(document.getElementById('salary-taxfree').value);
      if (!salaryAmt || salaryAmt < 1000000) { resultArea.style.display = 'none'; return; }
      const monthlyGross = salaryAmt / 12;
      const pension = Math.min((monthlyGross - taxfree) * 0.045, 265500);
      const health = (monthlyGross - taxfree) * 0.03545;
      const netPay = monthlyGross - pension - health - ((monthlyGross - taxfree) * 0.03);
      document.getElementById('stub-gross-pay').textContent = formatCurrency(monthlyGross) + ' 원';
      document.getElementById('stub-net-pay').textContent = formatCurrency(netPay) + ' 원';
      resultArea.style.display = 'block';
    };
    section.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calc();
    }));
    document.querySelector('.btn-clear[data-target="salary"]').addEventListener('click', () => {
      section.querySelectorAll('input').forEach(i => i.value = '');
      resultArea.style.display = 'none';
    });
  };

  // 3. 예적금 계산기
  const initSavings = () => {
    const section = document.getElementById('calc-savings');
    const resultArea = document.getElementById('sav-result');
    const calc = () => {
      const amt = parseNum(document.getElementById('sav-amount').value);
      const months = parseInt(document.getElementById('sav-term').value);
      const rate = parseFloat(document.getElementById('sav-rate').value);
      if (!amt || !months || isNaN(rate)) { resultArea.style.display = 'none'; return; }
      const type = document.querySelector('input[name="sav-type"]:checked').value;
      const taxType = document.querySelector('input[name="sav-tax-type"]:checked').value;
      const interest = type === 'installment' ? amt * (rate/100/12) * (months*(months+1)/2) : amt * (rate/100) * (months/12);
      const taxRate = taxType === 'prefer' ? 0.014 : (taxType === 'free' ? 0 : 0.154);
      const total = (type === 'installment' ? amt * months : amt) + (interest * (1 - taxRate));
      document.getElementById('sav-total-receive').innerHTML = `${formatCurrency(total)} <span class="unit">원</span>`;
      resultArea.style.display = 'block';
    };
    section.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calc();
    }));
    document.querySelector('.btn-clear[data-target="savings"]').addEventListener('click', () => {
      section.querySelectorAll('input').forEach(i => i.value = '');
      resultArea.style.display = 'none';
    });
  };

  // 5. 세금 계산기 (증여/상속/양도 통합)
  const initTax = () => {
    const section = document.getElementById('calc-tax');
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');

    const calc = () => {
      const type = document.getElementById('tax-category-select').value;
      let res = null;

      if (type === 'gift') {
        const prop = parseNum(document.getElementById('gift-prop-amount').value);
        const configs = [
          { id: 'spouse', label: '배우자', deduct: 600000000 },
          { id: 'adult-child', label: '성인자녀', deduct: 50000000 },
          { id: 'minor-child', label: '미성년자녀', deduct: 20000000 },
          { id: 'relative', label: '친족', deduct: 10000000 },
          { id: 'other', label: '기타', deduct: 0 }
        ];
        let totalTax = 0, totalAmt = 0, breakdown = '';
        configs.forEach(c => {
          const count = parseInt(document.getElementById(`gift-${c.id}-count`).value) || 0;
          const amt = parseNum(document.getElementById(`gift-${c.id}-amount`).value);
          if (count > 0 && amt > 0) {
            totalAmt += amt * count;
            const base = Math.max(0, amt - c.deduct);
            const r = getProgressiveTax(base);
            const tax = (base * r.rate - r.deduct) * 0.97;
            totalTax += tax * count;
            breakdown += `<div class="row"><span>${c.label} (${count}명)</span><span>인당 ${formatCurrency(tax)} 원</span></div>`;
          }
        });
        if (totalAmt === 0) { resultArea.style.display = 'none'; return; }
        res = { label: '증여세 총합', main: totalTax + prop * 0.04, details: breakdown };
      } else if (type === 'inherit') {
        const total = parseNum(document.getElementById('inherit-amount').value);
        const prop = parseNum(document.getElementById('inherit-prop-amount').value);
        const hasSpouse = document.getElementById('inherit-has-spouse').checked;
        const counts = {
          child: parseInt(document.getElementById('inherit-child-count').value) || 0,
          sib: parseInt(document.getElementById('inherit-sibling-count').value) || 0,
          rel: parseInt(document.getElementById('inherit-relative-count').value) || 0,
          oth: parseInt(document.getElementById('inherit-other-count').value) || 0
        };
        if (!total) { resultArea.style.display = 'none'; return; }
        const deduct = Math.max(500000000, 200000000 + counts.child * 50000000) + (hasSpouse ? 500000000 : 0);
        const base = Math.max(0, total - deduct);
        const r = getProgressiveTax(base);
        const totalTax = (base * r.rate - r.deduct) * 0.97;
        const totalRatio = (hasSpouse ? 1.5 : 0) + counts.child + counts.sib + counts.rel + counts.oth;
        let breakdown = '';
        const add = (l, n, rat) => {
          if (n <= 0 || totalRatio === 0) return;
          const share = (rat * n) / totalRatio;
          const perTax = (totalTax * share) / n;
          breakdown += `<div class="row"><span>${l} (${n}명)</span><span>인당 ${formatCurrency(perTax)} 원</span></div>`;
        };
        add('배우자', hasSpouse ? 1 : 0, 1.5); add('자녀', counts.child, 1.0); add('형제자매', counts.sib, 1.0); add('혈족', counts.rel, 1.0); add('그밖의 상속인', counts.oth, 1.0);
        res = { label: '상속세 총합', main: totalTax + prop * 0.0316, details: breakdown };
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy').value), sell = parseNum(document.getElementById('gain-sell').value);
        const exp = parseNum(document.getElementById('gain-expenses').value);
        const isH1 = document.querySelector('input[name="gain-asset-type"]:checked').value === 'house1';
        if (!buy || !sell) { resultArea.style.display = 'none'; return; }
        let profit = sell - buy - exp;
        if (isH1 && sell <= 1200000000) { res = { label: '양도소득세', main: 0, details: '1세대 1주택 비과세' }; }
        else {
          if (isH1) profit = profit * (sell - 1200000000) / sell;
          const base = Math.max(0, profit - 2500000);
          const r = getIncomeTaxRate(base);
          res = { label: '양도소득세 총합', main: (base * r.rate - r.deduct) * 1.1, details: `과세표준: ${formatCurrency(base)} 원` };
        }
      } else if (type === 'acq') {
        const val = parseNum(document.getElementById('acq-amount').value);
        if (!val) { resultArea.style.display = 'none'; return; }
        res = { label: '취득세', main: val * 0.011, details: '기본 1.1% 가정' };
      } else {
        const val = parseNum(section.querySelector('.tax-form-group[style*="block"] input[type="text"]')?.value || '0');
        if (!val) { resultArea.style.display = 'none'; return; }
        res = { label: '기타 세액', main: val * 0.1, details: '간이 계산 결과' };
      }

      if (res) {
        finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      }
    };

    document.getElementById('tax-category-select').addEventListener('change', () => {
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = g.id === `tax-input-${document.getElementById('tax-category-select').value}` ? 'block' : 'none');
      calc();
    });
    section.querySelectorAll('input, select').forEach(el => el.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calc();
    }));
    document.querySelector('.btn-clear[data-target="tax"]').addEventListener('click', () => {
      section.querySelectorAll('input').forEach(i => i.value = '');
      resultArea.style.display = 'none';
    });
  };

  initLoan(); initSalary(); initSavings(); initTax();
});