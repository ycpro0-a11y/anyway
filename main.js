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
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      sections.forEach(sec => sec.classList.remove('active'));
      document.getElementById(item.getAttribute('data-tab')).classList.add('active');
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
  let loanAmount = 0;
  const initLoan = () => {
    const amtInput = document.getElementById('loan-amount');
    const rateInput = document.getElementById('loan-rate');
    const termInput = document.getElementById('loan-term');
    const resultArea = document.getElementById('loan-result');
    const scheduleBody = document.getElementById('loan-schedule-body');

    const calc = () => {
      const rate = parseFloat(rateInput.value);
      const months = parseInt(termInput.value, 10);
      const typeEl = document.querySelector('input[name=\"loan-type\"]:checked');
      const type = typeEl ? typeEl.value : 'equal_principal_interest';
      if (!loanAmount || isNaN(rate) || !months || months <= 0) { resultArea.style.display = 'none'; return; }
      
      const monthlyRate = (rate / 100) / 12;
      let monthlyPayment = 0, totalInterest = 0;
      let balance = loanAmount;
      let schedule = [];

      if (type === 'equal_principal_interest') {
        const p = Math.pow(1 + monthlyRate, months);
        monthlyPayment = monthlyRate === 0 ? loanAmount / months : loanAmount * monthlyRate * p / (p - 1);
        for (let i = 1; i <= months; i++) {
          const interest = balance * monthlyRate;
          const principal = monthlyPayment - interest;
          balance -= principal;
          totalInterest += interest;
          schedule.push({ month: i, principal, interest, total: monthlyPayment, balance: Math.max(0, balance) });
        }
      } else if (type === 'equal_principal') {
        const principalPerMonth = loanAmount / months;
        for (let i = 1; i <= months; i++) {
          const interest = balance * monthlyRate;
          balance -= principalPerMonth;
          totalInterest += interest;
          schedule.push({ month: i, principal: principalPerMonth, interest, total: principalPerMonth + interest, balance: Math.max(0, balance) });
        }
        monthlyPayment = (loanAmount + totalInterest) / months;
      } else {
        const interestPerMonth = loanAmount * monthlyRate;
        for (let i = 1; i <= months; i++) {
          const isLast = i === months;
          const principal = isLast ? loanAmount : 0;
          totalInterest += interestPerMonth;
          schedule.push({ month: i, principal, interest: interestPerMonth, total: principal + interestPerMonth, balance: isLast ? 0 : loanAmount });
        }
        monthlyPayment = interestPerMonth;
      }

      document.getElementById('loan-monthly-payment').innerHTML = `${formatCurrency(monthlyPayment)} <span class=\"unit\">원</span>`;
      document.getElementById('loan-total-interest').textContent = `${formatCurrency(totalInterest)} 원`;
      document.getElementById('loan-total-repayment').textContent = `${formatCurrency(loanAmount + totalInterest)} 원`;
      scheduleBody.innerHTML = schedule.slice(0, 100).map(row => `<tr><td>${row.month}회</td><td>${formatCurrency(row.principal)}</td><td>${formatCurrency(row.interest)}</td><td>${formatCurrency(row.total)}</td><td>${formatCurrency(row.balance)}</td></tr>`).join('');
      resultArea.style.display = 'block';
    };

    amtInput.addEventListener('input', (e) => { loanAmount = parseNum(e.target.value); e.target.value = loanAmount ? formatCurrency(loanAmount) : ''; calc(); });
    [rateInput, termInput].forEach(i => i.addEventListener('input', calc));
    document.querySelectorAll('input[name=\"loan-type\"]').forEach(r => r.addEventListener('change', calc));
  };

  // 2. 연봉 계산기 (생략 없이 유지)
  let salaryAmount = 0;
  const initSalary = () => {
    const amtInput = document.getElementById('salary-amount');
    const resultArea = document.getElementById('salary-result');
    const calc = () => {
      if (!salaryAmount || salaryAmount < 1000000) { resultArea.style.display = 'none'; return; }
      const monthlyGross = Math.floor(salaryAmount / 12);
      const pension = Math.min(monthlyGross * 0.045, 265500);
      const health = monthlyGross * 0.03545;
      const netPay = monthlyGross - pension - health - (monthlyGross * 0.02);
      document.getElementById('stub-gross-pay').textContent = formatCurrency(monthlyGross) + ' 원';
      document.getElementById('stub-net-pay').textContent = formatCurrency(netPay) + ' 원';
      resultArea.style.display = 'block';
    };
    amtInput.addEventListener('input', (e) => { salaryAmount = parseNum(e.target.value); e.target.value = salaryAmount ? formatCurrency(salaryAmount) : ''; calc(); });
  };

  // 3. 예적금 계산기 (생략 없이 유지)
  let savAmount = 0;
  const initSavings = () => {
    const amtInput = document.getElementById('sav-amount');
    const resultArea = document.getElementById('sav-result');
    const calc = () => {
      const months = parseInt(document.getElementById('sav-term').value) || 0;
      const rate = parseFloat(document.getElementById('sav-rate').value) || 0;
      if (!savAmount || !months || !rate) { resultArea.style.display = 'none'; return; }
      const type = document.querySelector('input[name=\"sav-type\"]:checked').value;
      const interest = type === 'installment' ? savAmount * (rate/100/12) * (months*(months+1)/2) : savAmount * (rate/100) * (months/12);
      const total = (type === 'installment' ? savAmount * months : savAmount) + (interest * 0.846);
      document.getElementById('sav-total-receive').innerHTML = `${formatCurrency(total)} <span class=\"unit\">원</span>`;
      resultArea.style.display = 'block';
    };
    amtInput.addEventListener('input', (e) => { savAmount = parseNum(e.target.value); e.target.value = savAmount ? formatCurrency(savAmount) : ''; calc(); });
    document.getElementById('sav-term').addEventListener('input', calc);
    document.getElementById('sav-rate').addEventListener('input', calc);
  };

  // 5. 세금 계산기 (복구된 양도세 포함)
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');

    const calc = () => {
      const type = categorySelect.value;
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
        let totalTax = 0, breakdown = '';
        configs.forEach(c => {
          const count = parseInt(document.getElementById(`gift-${c.id}-count`).value) || 0;
          const amt = parseNum(document.getElementById(`gift-${c.id}-amount`).value);
          if (count > 0 && amt > 0) {
            const base = Math.max(0, amt - c.deduct);
            const rInfo = getProgressiveTax(base);
            const tax = (base * rInfo.rate - rInfo.deduct) * 0.97;
            totalTax += tax * count;
            breakdown += `<div class=\"row\"><span>${c.label} (${count}명)</span><span>인당 ${formatCurrency(tax)} 원</span></div>`;
          }
        });
        res = { label: '증여세 총합 (현행)', main: totalTax + prop * 0.04, details: breakdown };
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
        const rInfo = getProgressiveTax(base);
        const totalTax = (base * rInfo.rate - rInfo.deduct) * 0.97;
        const totalRatio = (hasSpouse ? 1.5 : 0) + counts.child + counts.sib + counts.rel + counts.oth;
        let breakdown = '';
        const add = (l, n, r) => {
          if (n <= 0) return;
          const share = (r * n) / totalRatio;
          breakdown += `<div class=\"row\"><span>${l} (${n}명)</span><span>인당 ${formatCurrency((totalTax * share)/n)} 원</span></div>`;
        };
        add('배우자', hasSpouse ? 1 : 0, 1.5); add('자녀', counts.child, 1.0); add('형제자매', counts.sib, 1.0); add('혈족', counts.rel, 1.0); add('그밖의 상속인', counts.oth, 1.0);
        res = { label: '상속세 총합', main: totalTax + prop * 0.0316, details: breakdown };
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy').value), sell = parseNum(document.getElementById('gain-sell').value);
        const exp = parseNum(document.getElementById('gain-expenses').value);
        const hold = parseInt(document.getElementById('gain-hold-years').value) || 0;
        const live = parseInt(document.getElementById('gain-live-years').value) || 0;
        const isH1 = document.querySelector('input[name=\"gain-asset-type\"]:checked').value === 'house1';
        const isReg = document.querySelector('input[name=\"gain-area\"]:checked').value === 'reg';
        if (!buy || !sell) { resultArea.style.display = 'none'; return; }
        
        let profit = sell - buy - exp;
        if (isH1 && sell <= 1200000000) { res = { label: '양도소득세', main: 0, details: '1세대 1주택 비과세' }; }
        else {
          if (isH1) profit = profit * (sell - 1200000000) / sell;
          let lthd = isH1 && hold >= 3 ? Math.min(hold*4, 40) + Math.min(live*4, 40) : (hold >= 3 ? Math.min(hold*2, 30) : 0);
          const base = Math.max(0, profit * (1 - lthd/100) - 2500000);
          const r = getIncomeTaxRate(base);
          let finalRate = r.rate;
          if (!isH1 && isReg) finalRate += 0.2; 
          const tax = (base * finalRate - r.deduct) * 1.1;
          res = { label: '양도소득세 총합', main: tax, details: `<div class=\"row\"><span>장특공 공제율</span><span>${lthd}%</span></div>` };
        }
      } else if (type === 'acq') {
        const val = parseNum(document.getElementById('acq-amount').value);
        res = { label: '취득세', main: val * 0.011, details: '기본 1.1%' };
      } else if (type === 'prop') {
        const val = parseNum(document.getElementById('prop-value').value);
        res = { label: '재산세', main: val * 0.6 * 0.002, details: '공정비율 60%' };
      } else if (type === 'comp') {
        const val = parseNum(document.getElementById('comp-value').value);
        res = { label: '종부세', main: Math.max(0, val - 1200000000) * 0.6 * 0.01, details: '12억 공제' };
      } else if (type === 'vat') {
        const val = parseNum(document.getElementById('vat-amount').value);
        res = { label: '부가가치세', main: Math.floor(val / 11), details: '10% 포함' };
      }

      if (res) {
        finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class=\"unit\">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      }
    };

    categorySelect.addEventListener('change', () => {
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = g.id === `tax-input-${categorySelect.value}` ? 'block' : 'none');
      calc();
    });
    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => el.addEventListener('input', (e) => {
      if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
      calc();
    }));
  };

  initLoan(); initSalary(); initSavings(); initTax();
});