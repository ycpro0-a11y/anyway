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
      const typeEl = document.querySelector('input[name="loan-type"]:checked');
      const type = typeEl ? typeEl.value : 'equal_principal_interest';
      
      if (!loanAmount || isNaN(rate) || !months || months <= 0) { 
        resultArea.style.display = 'none'; 
        return; 
      }
      
      const monthlyRate = (rate / 100) / 12;
      let monthlyPayment = 0, totalInterest = 0;
      let schedule = [];
      let balance = loanAmount;

      if (type === 'equal_principal_interest') {
        if (monthlyRate === 0) {
          monthlyPayment = loanAmount / months;
        } else {
          const p = Math.pow(1 + monthlyRate, months);
          monthlyPayment = loanAmount * monthlyRate * p / (p - 1);
        }
        for (let i = 1; i <= months; i++) {
          const interest = balance * monthlyRate;
          const principal = monthlyPayment - interest;
          balance -= principal;
          schedule.push({ month: i, principal, interest, total: monthlyPayment, balance: Math.max(0, balance) });
          totalInterest += interest;
        }
      } else if (type === 'equal_principal') {
        const principalPerMonth = loanAmount / months;
        for (let i = 1; i <= months; i++) {
          const interest = balance * monthlyRate;
          const total = principalPerMonth + interest;
          balance -= principalPerMonth;
          schedule.push({ month: i, principal: principalPerMonth, interest, total, balance: Math.max(0, balance) });
          totalInterest += interest;
        }
        monthlyPayment = (loanAmount + totalInterest) / months;
      } else {
        const interestPerMonth = loanAmount * monthlyRate;
        for (let i = 1; i <= months; i++) {
          const isLast = i === months;
          const principal = isLast ? loanAmount : 0;
          const total = interestPerMonth + principal;
          balance = isLast ? 0 : loanAmount;
          schedule.push({ month: i, principal, interest: interestPerMonth, total, balance });
          totalInterest += interestPerMonth;
        }
        monthlyPayment = interestPerMonth;
      }

      document.getElementById('loan-monthly-payment').innerHTML = `${formatCurrency(monthlyPayment)} <span class="unit">원</span>`;
      document.getElementById('loan-total-interest').textContent = `${formatCurrency(totalInterest)} 원`;
      document.getElementById('loan-total-repayment').textContent = `${formatCurrency(loanAmount + totalInterest)} 원`;
      
      const displaySchedule = schedule.slice(0, 600);
      scheduleBody.innerHTML = displaySchedule.map(row => `
        <tr>
          <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid var(--color-border);">${row.month}회</td>
          <td style="padding: 12px 8px; text-align: right; border-bottom: 1px solid var(--color-border);">${formatCurrency(row.principal)}</td>
          <td style="padding: 12px 8px; text-align: right; border-bottom: 1px solid var(--color-border);">${formatCurrency(row.interest)}</td>
          <td style="padding: 12px 8px; text-align: right; border-bottom: 1px solid var(--color-border); font-weight: 600;">${formatCurrency(row.total)}</td>
          <td style="padding: 12px 8px; text-align: right; border-bottom: 1px solid var(--color-border); color: var(--color-text-caption);">${formatCurrency(row.balance)}</td>
        </tr>
      `).join('');
      resultArea.style.display = 'block';
    };

    amtInput.addEventListener('input', (e) => { 
      loanAmount = parseNum(e.target.value); 
      e.target.value = loanAmount ? formatCurrency(loanAmount) : ''; 
      calc(); 
    });
    [rateInput, termInput].forEach(i => i.addEventListener('input', calc));
    document.querySelectorAll('input[name="loan-type"]').forEach(r => r.addEventListener('change', calc));
    document.querySelector('.btn-clear[data-target="loan"]').addEventListener('click', () => { 
      loanAmount = 0; amtInput.value = ''; rateInput.value = ''; termInput.value = ''; resultArea.style.display = 'none'; 
    });
  };

  // 2. 연봉 계산기 (2024-2025 요율 유지)
  let salaryAmount = 0;
  const initSalary = () => {
    const amtInput = document.getElementById('salary-amount');
    const taxfreeInput = document.getElementById('salary-taxfree');
    const resultArea = document.getElementById('salary-result');
    const calc = () => {
      if (!salaryAmount || salaryAmount < 1000000) { resultArea.style.display = 'none'; return; }
      const monthlyGross = Math.floor(salaryAmount / 12);
      const taxfree = parseNum(taxfreeInput.value);
      const taxable = Math.max(0, monthlyGross - taxfree);
      const pension = Math.min(taxable * 0.045, 265500); 
      const health = taxable * 0.03545; 
      const care = health * 0.1295; 
      const employ = taxable * 0.009; 
      let incomeTax = 0;
      const annualTaxable = taxable * 12;
      if (annualTaxable <= 14000000) incomeTax = (annualTaxable * 0.06) / 12;
      else if (annualTaxable <= 50000000) incomeTax = (annualTaxable * 0.15 - 1260000) / 12;
      else if (annualTaxable <= 88000000) incomeTax = (annualTaxable * 0.24 - 5760000) / 12;
      else if (annualTaxable <= 150000000) incomeTax = (annualTaxable * 0.35 - 15440000) / 12;
      else incomeTax = (annualTaxable * 0.38 - 19940000) / 12;
      incomeTax = Math.max(0, incomeTax * 0.85);
      const localTax = incomeTax * 0.1;
      const totalDeduction = pension + health + care + employ + incomeTax + localTax;
      const netPay = monthlyGross - totalDeduction;
      document.getElementById('stub-gross-pay').textContent = formatCurrency(monthlyGross) + ' 원';
      document.getElementById('stub-pension').textContent = formatCurrency(pension) + ' 원';
      document.getElementById('stub-net-pay').textContent = formatCurrency(netPay) + ' 원';
      resultArea.style.display = 'block';
    };
    amtInput.addEventListener('input', (e) => { 
      salaryAmount = parseNum(e.target.value); e.target.value = salaryAmount ? formatCurrency(salaryAmount) : ''; calc(); 
    });
  };

  // 3. 예적금 계산기
  let savAmount = 0;
  const initSavings = () => {
    const amtInput = document.getElementById('sav-amount');
    const resultArea = document.getElementById('sav-result');
    const calc = () => {
      const months = parseInt(document.getElementById('sav-term').value);
      const rate = parseFloat(document.getElementById('sav-rate').value);
      if (!savAmount || !months || !rate) { resultArea.style.display = 'none'; return; }
      const type = document.querySelector('input[name="sav-type"]:checked').value;
      const taxType = document.querySelector('input[name="sav-tax-type"]:checked').value;
      let interest = (type === 'installment') ? savAmount * (rate/100/12) * (months * (months + 1) / 2) : savAmount * (rate/100) * (months / 12);
      let taxRate = (taxType === 'prefer') ? 0.014 : (taxType === 'free' ? 0 : 0.154);
      const taxAmount = Math.floor(interest * taxRate);
      const totalReceive = (type === 'installment' ? savAmount * months : savAmount) + interest - taxAmount;
      document.getElementById('sav-total-receive').innerHTML = `${formatCurrency(totalReceive)} <span class="unit">원</span>`;
      resultArea.style.display = 'block';
    };
    amtInput.addEventListener('input', (e) => { 
      savAmount = parseNum(e.target.value); e.target.value = savAmount ? formatCurrency(savAmount) : ''; calc(); 
    });
  };

  // 5. 세금 계산기 (현행법 기준)
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');
    const resultLabelEl = document.getElementById('tax-result-label');

    const getPropTaxRateInfo = (base) => {
      if (base <= 100000000) return { rate: 0.1, deduct: 0, text: '10%' };
      if (base <= 500000000) return { rate: 0.2, deduct: 10000000, text: '20%' };
      if (base <= 1000000000) return { rate: 0.3, deduct: 60000000, text: '30%' };
      if (base <= 3000000000) return { rate: 0.4, deduct: 160000000, text: '40%' };
      return { rate: 0.5, deduct: 460000000, text: '50%' };
    };

    const calc = () => {
      const type = categorySelect.value;
      let res = null;

      if (type === 'gift') {
        const total = parseNum(document.getElementById('gift-amount').value);
        const prop = parseNum(document.getElementById('gift-prop-amount').value);
        const counts = {
          spouse: Math.min(1, parseInt(document.getElementById('gift-spouse-count').value) || 0),
          adultChild: parseInt(document.getElementById('gift-adult-child-count').value) || 0,
          minorChild: parseInt(document.getElementById('gift-minor-child-count').value) || 0,
          relative: parseInt(document.getElementById('gift-relative-count').value) || 0,
          other: parseInt(document.getElementById('gift-other-count').value) || 0
        };
        const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
        if (!total || totalCount === 0) { resultArea.style.display = 'none'; return; }
        const perPersonAmount = total / totalCount;
        let totalGiftTax = 0;
        let breakdownHtml = '';
        const deductions = { spouse: 600000000, adultChild: 50000000, minorChild: 20000000, relative: 10000000, other: 0 };
        const labels = { spouse: '배우자', adultChild: '성인자녀', minorChild: '미성년자녀', relative: '친족', other: '기타' };

        Object.keys(counts).forEach(key => {
          const count = counts[key];
          if (count > 0) {
            const deduct = deductions[key];
            const perTaxBase = Math.max(0, perPersonAmount - deduct);
            const rateInfo = getPropTaxRateInfo(perTaxBase);
            const perTax = (perTaxBase * rateInfo.rate - rateInfo.deduct) * 0.97;
            totalGiftTax += perTax * count;
            breakdownHtml += `
              <div style="margin-bottom: 8px; border-bottom: 1px dashed var(--color-border); padding-bottom: 4px;">
                <div class="row"><strong style="font-size:13px; color:var(--color-primary);">${labels[key]} (${count}명)</strong></div>
                <div class="row"><span style="font-size:12px;">인당 가액/공제</span><span style="font-size:12px;">${formatCurrency(perPersonAmount)} / -${formatCurrency(deduct)}</span></div>
                <div class="row"><span style="font-size:12px;">인당 예상세액</span><span style="font-size:12px; font-weight:600;">${formatCurrency(perTax)} 원</span></div>
              </div>`;
          }
        });
        res = { label: '증여세 정밀 분석 결과 (현행)', main: totalGiftTax + prop * 0.04, details: `
          <div style="background: var(--color-background); padding: 10px; border-radius: 8px; margin: 12px 0;">${breakdownHtml}</div>
          <div class="row"><span>증여세 합계</span><span>${formatCurrency(totalGiftTax)} 원</span></div>` 
        };
      } else if (type === 'inherit') {
        const total = parseNum(document.getElementById('inherit-amount').value);
        const prop = parseNum(document.getElementById('inherit-prop-amount').value);
        const hasSpouse = document.getElementById('inherit-has-spouse').checked;
        const counts = {
          child: parseInt(document.getElementById('inherit-child-count').value) || 0,
          sibling: parseInt(document.getElementById('inherit-sibling-count').value) || 0,
          relative: parseInt(document.getElementById('inherit-relative-count').value) || 0,
          other: parseInt(document.getElementById('inherit-other-count').value) || 0
        };
        if (!total) { resultArea.style.display = 'none'; return; }

        // 현행 상속세 로직 (2024-2025)
        const personalDeduct = 200000000 + (counts.child * 50000000); 
        const basicOrLumpSum = Math.max(500000000, personalDeduct);
        const spouseDeduct = hasSpouse ? 500000000 : 0;
        const totalDeduct = basicOrLumpSum + spouseDeduct;

        const base = Math.max(0, total - totalDeduct);
        const rateInfo = getPropTaxRateInfo(base);
        const totalInheritTax = (base * rateInfo.rate - rateInfo.deduct) * 0.97;
        let totalRatio = (hasSpouse ? 1.5 : 0) + (counts.child * 1.0);
        if (totalRatio === 0) totalRatio = counts.sibling + counts.relative + counts.other;

        let breakdownHtml = '';
        const addBreakdown = (label, count, ratio) => {
          if (count <= 0 || totalRatio === 0) return;
          const share = ratio / totalRatio;
          breakdownHtml += `
            <div style="margin-bottom: 8px; border-bottom: 1px dashed var(--color-border); padding-bottom: 4px;">
              <div class="row"><strong style="font-size:13px; color:var(--color-primary);">${label} (${count}명)</strong></div>
              <div class="row"><span style="font-size:12px;">인당 상속가액</span><span style="font-size:12px;">${formatCurrency((total * share) / count)} 원</span></div>
              <div class="row"><span style="font-size:12px;">인당 분담세액</span><span style="font-size:12px; font-weight:600;">${formatCurrency((totalInheritTax * share) / count)} 원</span></div>
            </div>`;
        };
        if (hasSpouse) addBreakdown('배우자', 1, 1.5);
        if (counts.child > 0) addBreakdown('자녀', counts.child, 1.0 * counts.child);
        if (totalRatio === (counts.sibling + counts.relative + counts.other)) {
          addBreakdown('형제자매', counts.sibling, counts.sibling);
          addBreakdown('4촌이내 혈족', counts.relative, counts.relative);
          addBreakdown('그밖의 상속인', counts.other, counts.other);
        }

        res = { label: '상속세 정밀 분석 결과 (현행)', main: totalInheritTax + prop * 0.0316, details: `
          <div class="row"><span>총 공제액 (일괄5억+배우자5억 등)</span><span>${formatCurrency(totalDeduct)} 원</span></div>
          <div style="background: var(--color-background); padding: 10px; border-radius: 8px; margin: 12px 0;">${breakdownHtml}</div>
          <div class="row"><span>상속세 합계</span><strong style="color: var(--color-primary);">${formatCurrency(totalInheritTax)} 원</strong></div>` 
        };
      } else if (type === 'acq') {
        const val = parseNum(document.getElementById('acq-amount').value);
        const count = parseInt(document.querySelector('input[name="acq-house"]:checked').value);
        const isReg = document.querySelector('input[name="acq-area"]:checked').value === 'reg';
        if (!val) { resultArea.style.display = 'none'; return; }
        let rate = (val <= 600000000 ? 0.01 : (val <= 900000000 ? (val*(2/300000000)-3)/100 : 0.03));
        if (count === 2) rate = isReg ? 0.08 : rate; else if (count >= 3) rate = isReg ? 0.12 : 0.08;
        res = { label: '취득세 총합', main: val * rate * 1.1, details: `<div class="row"><span>적용 세율</span><span>${(rate*100).toFixed(1)}%</span></div>` };
      } else if (type === 'prop') {
        const val = parseNum(document.getElementById('prop-value').value);
        if (!val) { resultArea.style.display = 'none'; return; }
        const isH1 = document.querySelector('input[name="prop-h1"]:checked').value === 'yes';
        const ratio = isH1 ? (val <= 300000000 ? 0.43 : (val <= 600000000 ? 0.44 : 0.45)) : 0.6;
        res = { label: '재산세 총합', main: (val * ratio * 0.002), details: `<div class="row"><span>공정시장가액비율</span><span>${(ratio*100).toFixed(0)}%</span></div>` };
      } else if (type === 'comp') {
        const val = parseNum(document.getElementById('comp-value').value);
        if (!val) { resultArea.style.display = 'none'; return; }
        const deduct = document.querySelector('input[name="comp-type"]:checked').value;
        const taxBase = Math.max(0, (val - deduct) * 0.6);
        res = { label: '종부세 총합', main: taxBase * 0.01, details: `<div class="row"><span>과세표준</span><span>${formatCurrency(taxBase)} 원</span></div>` };
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy').value), sell = parseNum(document.getElementById('gain-sell').value);
        if (!buy || !sell) { resultArea.style.display = 'none'; return; }
        const profit = Math.max(0, sell - buy);
        res = { label: '양도소득세', main: profit * 0.2, details: `<div class="row"><span>양도차익</span><span>${formatCurrency(profit)} 원</span></div>` };
      } else if (type === 'vat') {
        const val = parseNum(document.getElementById('vat-amount').value);
        if (!val) { resultArea.style.display = 'none'; return; }
        res = { label: '부가가치세', main: Math.floor(val / 11), details: `<span>세율 10% 포함</span>` };
      }

      if (res) {
        resultLabelEl.textContent = res.label;
        finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      }
    };

    categorySelect.addEventListener('change', () => {
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = g.id === `tax-input-${categorySelect.value}` ? 'block' : 'none');
      calc();
    });
    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
        calc();
      });
      el.addEventListener('change', calc);
    });
  };

  initLoan(); initSalary(); initSavings(); initTax();
});