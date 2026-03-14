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
        // 원리금균등
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
        // 원금균등
        const principalPerMonth = loanAmount / months;
        for (let i = 1; i <= months; i++) {
          const interest = balance * monthlyRate;
          const total = principalPerMonth + interest;
          balance -= principalPerMonth;
          schedule.push({ month: i, principal: principalPerMonth, interest, total, balance: Math.max(0, balance) });
          totalInterest += interest;
        }
        monthlyPayment = (loanAmount + totalInterest) / months; // 월평균
      } else {
        // 만기일시
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

      // UI 업데이트
      document.getElementById('loan-monthly-payment').innerHTML = `${formatCurrency(monthlyPayment)} <span class="unit">원</span>`;
      document.getElementById('loan-total-interest').textContent = `${formatCurrency(totalInterest)} 원`;
      document.getElementById('loan-total-repayment').textContent = `${formatCurrency(loanAmount + totalInterest)} 원`;
      
      // 스케줄 렌더링 (최대 600회까지만 표시하여 성능 보호)
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

      if (schedule.length > 600) {
        scheduleBody.innerHTML += `<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--color-text-caption);">... (600회 이후 생략)</td></tr>`;
      }

      resultArea.style.display = 'block';
    };

    amtInput.addEventListener('input', (e) => { 
      loanAmount = parseNum(e.target.value); 
      e.target.value = loanAmount ? formatCurrency(loanAmount) : ''; 
      calc(); 
    });
    [rateInput, termInput].forEach(i => i.addEventListener('input', calc));
    document.querySelectorAll('input[name="loan-type"]').forEach(r => r.addEventListener('change', calc));
    
    document.querySelectorAll('.btn-add-loan').forEach(btn => btn.addEventListener('click', (e) => { 
      loanAmount += parseInt(e.target.dataset.val); 
      amtInput.value = formatCurrency(loanAmount); 
      calc(); 
    }));
    document.querySelectorAll('.btn-term-loan').forEach(btn => btn.addEventListener('click', (e) => { 
      termInput.value = e.target.dataset.term; 
      calc(); 
    }));
    document.querySelector('.btn-clear[data-target="loan"]').addEventListener('click', () => { 
      loanAmount = 0; 
      amtInput.value = ''; 
      rateInput.value = ''; 
      termInput.value = ''; 
      resultArea.style.display = 'none'; 
    });
  };

  // 2. 연봉 계산기
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
      
      // 4대보험 요율 (2024-2025 기준)
      const pension = Math.min(taxable * 0.045, 265500); // 국민연금 상한액 적용
      const health = taxable * 0.03545; // 건강보험
      const care = health * 0.1295; // 장기요양 (건보료의 12.95%)
      const employ = taxable * 0.009; // 고용보험
      
      // 근로소득세 간이세액 (근사치 계산 로직)
      let incomeTax = 0;
      const annualTaxable = taxable * 12;
      if (annualTaxable <= 14000000) incomeTax = (annualTaxable * 0.06) / 12;
      else if (annualTaxable <= 50000000) incomeTax = (annualTaxable * 0.15 - 1260000) / 12;
      else if (annualTaxable <= 88000000) incomeTax = (annualTaxable * 0.24 - 5760000) / 12;
      else if (annualTaxable <= 150000000) incomeTax = (annualTaxable * 0.35 - 15440000) / 12;
      else incomeTax = (annualTaxable * 0.38 - 19940000) / 12;
      
      // 부양가족 1인 기준 간이세액 보정 (대략 80~90% 수준)
      incomeTax = Math.max(0, incomeTax * 0.85);
      const localTax = incomeTax * 0.1;
      
      const totalDeduction = pension + health + care + employ + incomeTax + localTax;
      const netPay = monthlyGross - totalDeduction;

      // 명세서 데이터 매핑
      document.getElementById('stub-gross-pay').textContent = formatCurrency(monthlyGross) + ' 원';
      document.getElementById('stub-taxable-pay').textContent = formatCurrency(taxable) + ' 원';
      document.getElementById('stub-taxfree-pay').textContent = formatCurrency(taxfree) + ' 원';
      
      document.getElementById('stub-pension').textContent = formatCurrency(pension) + ' 원';
      document.getElementById('stub-health').textContent = formatCurrency(health) + ' 원';
      document.getElementById('stub-care').textContent = formatCurrency(care) + ' 원';
      document.getElementById('stub-employ').textContent = formatCurrency(employ) + ' 원';
      document.getElementById('stub-income-tax').textContent = formatCurrency(incomeTax) + ' 원';
      document.getElementById('stub-local-tax').textContent = formatCurrency(localTax) + ' 원';
      document.getElementById('stub-total-deduction').textContent = formatCurrency(totalDeduction) + ' 원';
      
      document.getElementById('stub-net-pay').textContent = formatCurrency(netPay) + ' 원';
      
      resultArea.style.display = 'block';
    };
    
    amtInput.addEventListener('input', (e) => { 
      salaryAmount = parseNum(e.target.value); 
      e.target.value = salaryAmount ? formatCurrency(salaryAmount) : ''; 
      calc(); 
    });
    taxfreeInput.addEventListener('input', (e) => {
      e.target.value = formatCurrency(parseNum(e.target.value));
      calc();
    });
    
    document.querySelectorAll('.btn-add-salary').forEach(btn => btn.addEventListener('click', (e) => { 
      salaryAmount = parseInt(e.target.dataset.val); 
      amtInput.value = formatCurrency(salaryAmount); 
      calc(); 
    }));
    
    document.querySelector('.btn-clear[data-target="salary"]').addEventListener('click', () => { 
      salaryAmount = 0; 
      amtInput.value = ''; 
      resultArea.style.display = 'none'; 
    });
  };

  // 3. 예적금 계산기
  let savAmount = 0;
  const initSavings = () => {
    const amtInput = document.getElementById('sav-amount');
    const termInput = document.getElementById('sav-term');
    const rateInput = document.getElementById('sav-rate');
    const resultArea = document.getElementById('sav-result');
    const detailsEl = document.getElementById('sav-result-details');
    
    const calc = () => {
      const months = parseInt(termInput.value);
      const rate = parseFloat(rateInput.value);
      if (!savAmount || !months || !rate) { resultArea.style.display = 'none'; return; }
      
      const type = document.querySelector('input[name="sav-type"]:checked').value;
      const taxType = document.querySelector('input[name="sav-tax-type"]:checked').value;
      
      let interest = 0;
      let totalPrincipal = 0;
      
      if (type === 'installment') {
        interest = savAmount * (rate/100/12) * (months * (months + 1) / 2);
        totalPrincipal = savAmount * months;
      } else {
        interest = savAmount * (rate/100) * (months / 12);
        totalPrincipal = savAmount;
      }
      
      let taxRate = 0.154;
      if (taxType === 'prefer') taxRate = 0.014;
      else if (taxType === 'free') taxRate = 0;
      
      const taxAmount = Math.floor(interest * taxRate);
      const netInterest = interest - taxAmount;
      const totalReceive = totalPrincipal + netInterest;
      
      document.getElementById('sav-total-receive').innerHTML = `${formatCurrency(totalReceive)} <span class="unit">원</span>`;
      
      detailsEl.innerHTML = `
        <div class="row"><span>총 납입 원금</span><span>${formatCurrency(totalPrincipal)} 원</span></div>
        <div class="row"><span>세전 이자</span><span>${formatCurrency(interest)} 원</span></div>
        <div class="row"><span>이자소득세 (${(taxRate * 100).toFixed(1)}%)</span><span>-${formatCurrency(taxAmount)} 원</span></div>
        <div class="row"><span>세후 이자</span><span>${formatCurrency(netInterest)} 원</span></div>
      `;
      
      resultArea.style.display = 'block';
    };
    
    amtInput.addEventListener('input', (e) => { 
      savAmount = parseNum(e.target.value); 
      e.target.value = savAmount ? formatCurrency(savAmount) : ''; 
      calc(); 
    });
    
    [termInput, rateInput].forEach(i => i.addEventListener('input', calc));
    document.querySelectorAll('input[name="sav-type"], input[name="sav-tax-type"]').forEach(r => r.addEventListener('change', calc));
  };

  // 5. 세금 계산기 (정밀 로직)
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');
    const resultLabelEl = document.getElementById('tax-result-label');

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

        const deductions = { spouse: 600000000, adultChild: 50000000, minorChild: 20000000, relative: 20000000, other: 0 };
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

        const acqTax = prop * 0.04;

        res = { 
          label: '증여세 정밀 분석 결과', 
          main: totalGiftTax + acqTax, 
          details: `
          <div class="row"><span>총 수증 인원</span><span>${totalCount} 명</span></div>
          <div style="background: var(--color-background); padding: 10px; border-radius: 8px; margin: 12px 0;">
            ${breakdownHtml}
          </div>
          <div class="row" style="margin-top: 8px; border-top: 1px solid var(--color-border); padding-top: 8px;">
            <strong>증여세 합계</strong>
            <strong style="color: var(--color-primary);">${formatCurrency(totalGiftTax)} 원</strong>
          </div>
          <div class="row"><span>증여취득세 (4%)</span><span>${formatCurrency(acqTax)} 원</span></div>` 
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

        let totalDeduct = 200000000; 
        if (hasSpouse && counts.child > 0) totalDeduct = 1000000000;
        else if (hasSpouse) totalDeduct = 700000000;
        else if (counts.child > 0) totalDeduct = 500000000;

        const base = Math.max(0, total - totalDeduct);
        const rateInfo = getPropTaxRateInfo(base);
        const totalInheritTax = (base * rateInfo.rate - rateInfo.deduct) * 0.97;
        const acqTax = prop * 0.0316;

        let totalRatio = (hasSpouse ? 1.5 : 0) + (counts.child * 1.0);
        if (totalRatio === 0) totalRatio = counts.sibling + counts.relative + counts.other;

        let breakdownHtml = '';
        const addBreakdown = (label, count, ratio) => {
          if (count <= 0) return;
          const share = ratio / totalRatio;
          const perAmount = (total * share) / count;
          const perDeduct = (totalDeduct * share) / count;
          const perTax = (totalInheritTax * share) / count;
          breakdownHtml += `
            <div style="margin-bottom: 8px; border-bottom: 1px dashed var(--color-border); padding-bottom: 4px;">
              <div class="row"><strong style="font-size:13px; color:var(--color-primary);">${label} (${count}명)</strong></div>
              <div class="row"><span style="font-size:12px;">인당 상속가액</span><span style="font-size:12px;">${formatCurrency(perAmount)} 원</span></div>
              <div class="row"><span style="font-size:12px;">인당 배분공제</span><span style="font-size:12px;">-${formatCurrency(perDeduct)} 원</span></div>
              <div class="row"><span style="font-size:12px;">인당 상속세액</span><span style="font-size:12px; font-weight:600;">${formatCurrency(perTax)} 원</span></div>
            </div>`;
        };

        if (hasSpouse) addBreakdown('배우자', 1, 1.5);
        if (counts.child > 0) addBreakdown('자녀', counts.child, 1.0 * counts.child);
        if (totalRatio === (counts.sibling + counts.relative + counts.other)) {
          addBreakdown('형제자매', counts.sibling, counts.sibling);
          addBreakdown('4촌이내 혈족', counts.relative, counts.relative);
          addBreakdown('그밖의 상속인', counts.other, counts.other);
        }

        res = { 
          label: '상속세 정밀 분석 결과', 
          main: totalInheritTax + acqTax, 
          details: `
          <div class="row"><span>총 공제액</span><span>${formatCurrency(totalDeduct)} 원</span></div>
          <div style="background: var(--color-background); padding: 10px; border-radius: 8px; margin: 12px 0;">
            <p style="font-size: 11px; color: var(--color-text-caption); margin-bottom: 6px;">상속인별 세부 배분 내역</p>
            ${breakdownHtml}
          </div>
          <div class="row"><span>적용 세율</span><span>${rateInfo.text}</span></div>
          <div class="row" style="margin-top: 8px; border-top: 1px solid var(--color-border); padding-top: 8px;">
            <strong>상속세 합계</strong>
            <strong style="color: var(--color-primary);">${formatCurrency(totalInheritTax)} 원</strong>
          </div>
          <div class="row"><span>상속취득세 합계</span><span>${formatCurrency(acqTax)} 원</span></div>` 
        };
      } else if (type === 'acq') {
        const val = parseNum(document.getElementById('acq-amount').value);
        const count = parseInt(document.querySelector('input[name="acq-house"]:checked').value);
        const isReg = document.querySelector('input[name="acq-area"]:checked').value === 'reg';
        if (!val) { resultArea.style.display = 'none'; return; }
        let rate = (val <= 600000000 ? 0.01 : (val <= 900000000 ? (val*(2/300000000)-3)/100 : 0.03));
        if (count === 2) rate = isReg ? 0.08 : rate; else if (count >= 3) rate = isReg ? 0.12 : 0.08;
        const mainTax = val * rate;
        const eduRate = rate <= 0.03 ? rate * 0.1 : 0.004;
        const agriRate = (val > 85000000) ? 0.002 : 0;
        const totalAcq = mainTax + (val * eduRate) + (val * agriRate);
        res = { label: '취득세 총합 (지방세 포함)', main: totalAcq, details: `
          <div class="row"><span>현재 적용 취득세율</span><span>${(rate*100).toFixed(1)}%</span></div>
          <div class="row"><span>지방교육세</span><span>${formatCurrency(val * eduRate)} 원</span></div>
          <div class="row"><span>농어촌특별세</span><span>${formatCurrency(val * agriRate)} 원</span></div>` };
      } else if (type === 'prop') {
        const assetType = document.getElementById('prop-asset-type').value;
        const val = parseNum(document.getElementById('prop-value').value);
        if (!val) { resultArea.style.display = 'none'; return; }

        let tax = 0;
        let details = '';
        let ratio = 0.7; 
        let currentRateText = '';

        if (assetType === 'house') {
          const isH1 = document.querySelector('input[name="prop-h1"]:checked').value === 'yes';
          
          if (isH1) {
            if (val <= 300000000) ratio = 0.43;
            else if (val <= 600000000) ratio = 0.44;
            else ratio = 0.45;
            
            const taxBase = val * ratio;
            if (taxBase <= 60000000) { tax = taxBase * 0.0005; currentRateText = '0.05%'; }
            else if (taxBase <= 150000000) { tax = 30000 + (taxBase - 60000000) * 0.001; currentRateText = '0.1%'; }
            else if (taxBase <= 300000000) { tax = 120000 + (taxBase - 150000000) * 0.002; currentRateText = '0.2%'; }
            else { tax = 420000 + (taxBase - 300000000) * 0.0035; currentRateText = '0.35%'; }
            details = `<span>1주택자 특례세율 적용 (${currentRateText}, 공정비율 ${(ratio * 100).toFixed(0)}%)</span>`;
          } else {
            ratio = 0.6;
            const taxBase = val * ratio;
            if (taxBase <= 60000000) { tax = taxBase * 0.001; currentRateText = '0.1%'; }
            else if (taxBase <= 150000000) { tax = 60000 + (taxBase - 60000000) * 0.0015; currentRateText = '0.15%'; }
            else if (taxBase <= 300000000) { tax = 195000 + (taxBase - 150000000) * 0.0025; currentRateText = '0.25%'; }
            else { tax = 570000 + (taxBase - 300000000) * 0.004; currentRateText = '0.4%'; }
            details = `<span>일반세율 적용 (${currentRateText}, 공정비율 60%)</span>`;
          }
        } else {
          ratio = 0.7;
          const taxBase = val * ratio;
          if (assetType === 'building') {
            tax = taxBase * 0.0025;
            details = `<span>일반 건축물 (세율 0.25%, 공정비율 70%)</span>`;
          } else if (assetType === 'land') {
            const landType = document.getElementById('prop-land-type').value;
            if (landType === 'gen') {
              if (taxBase <= 50000000) { tax = taxBase * 0.002; currentRateText = '0.2%'; }
              else if (taxBase <= 100000000) { tax = 100000 + (taxBase - 50000000) * 0.003; currentRateText = '0.3%'; }
              else { tax = 250000 + (taxBase - 100000000) * 0.005; currentRateText = '0.5%'; }
              details = `<span>토지 종합합산 (세율 ${currentRateText}, 공정비율 70%)</span>`;
            } else if (landType === 'sep') {
              if (taxBase <= 200000000) { tax = taxBase * 0.002; currentRateText = '0.2%'; }
              else if (taxBase <= 1000000000) { tax = 400000 + (taxBase - 200000000) * 0.003; currentRateText = '0.3%'; }
              else { tax = 2800000 + (taxBase - 1000000000) * 0.004; currentRateText = '0.4%'; }
              details = `<span>토지 별도합산 (세율 ${currentRateText}, 공정비율 70%)</span>`;
            } else {
              tax = taxBase * 0.0007;
              details = `<span>토지 분리과세 (세율 0.07%, 공정비율 70%)</span>`;
            }
          }
        }

        const eduTax = tax * 0.2;
        const cityTax = val * ratio * 0.0014;
        const totalPropTax = tax + eduTax + cityTax;

        res = { 
          label: '재산세 총합 (부가세 포함)', 
          main: totalPropTax, 
          details: `
            <div class="row"><span>산출세액 (재산세)</span><span>${formatCurrency(tax)} 원</span></div>
            <div class="row"><span>지방교육세 (20%)</span><span>${formatCurrency(eduTax)} 원</span></div>
            <div class="row"><span>도시지역분 (0.14%)</span><span>${formatCurrency(cityTax)} 원</span></div>
            <div class="row"><span style="font-size:11px; color:var(--color-primary);">${details}</span></div>` 
        };
      } else if (type === 'comp') {
        const ownerType = document.querySelector('input[name="comp-owner"]:checked').value; 
        const assetType = document.getElementById('comp-asset-type').value;
        const val = parseNum(document.getElementById('comp-value').value);
        
        if (!val) { resultArea.style.display = 'none'; return; }
        
        let ratio = 0.6; 
        let actualDeduct = 0;
        let compTax = 0;
        let compMsg = '';
        let rentalExcludeAmt = 0;
        let currentRateText = '';

        if (assetType === 'house') {
          const isRental = document.querySelector('input[name="comp-rental"]:checked').value === 'yes';
          if (ownerType === 'ind') {
            const deductInput = document.querySelector('input[name="comp-type"]:checked');
            actualDeduct = deductInput ? parseInt(deductInput.value) : 0;
            const isMulti = document.querySelector('input[name="comp-multi"]:checked').value === 'yes';
            
            if (isRental) {
              const excludeVal = parseNum(document.getElementById('comp-rental-exclude-value').value);
              const isRegArea = document.querySelector('input[name="comp-reg-area"]:checked').value === 'yes';
              if (!isRegArea) {
                rentalExcludeAmt = excludeVal;
                compMsg = `합산배제 적용 (-${formatCurrency(rentalExcludeAmt)}원)`;
              } else {
                compMsg = '조정지역 취득분 합산배제 불가';
              }
            }

            const taxBase = Math.max(0, (val - rentalExcludeAmt - actualDeduct) * ratio);
            
            if (isMulti && taxBase > 1200000000) {
              if (taxBase <= 300000000) { compTax = taxBase * 0.005; currentRateText = '0.5%'; }
              else if (taxBase <= 600000000) { compTax = 1500000 + (taxBase - 300000000) * 0.007; currentRateText = '0.7%'; }
              else if (taxBase <= 1200000000) { compTax = 3600000 + (taxBase - 600000000) * 0.01; currentRateText = '1.0%'; }
              else if (taxBase <= 2500000000) { compTax = 9600000 + (taxBase - 1200000000) * 0.02; currentRateText = '2.0%'; }
              else if (taxBase <= 5000000000) { compTax = 35600000 + (taxBase - 2500000000) * 0.03; currentRateText = '3.0%'; }
              else if (taxBase <= 9400000000) { compTax = 110600000 + (taxBase - 5000000000) * 0.04; currentRateText = '4.0%'; }
              else { compTax = 286600000 + (taxBase - 9400000000) * 0.05; currentRateText = '5.0%'; }
              compMsg = (compMsg ? compMsg + ' / ' : '') + `개인 3주택 중과세율 적용 (현재구간 ${currentRateText})`;
            } else {
              if (taxBase <= 300000000) { compTax = taxBase * 0.005; currentRateText = '0.5%'; }
              else if (taxBase <= 600000000) { compTax = 1500000 + (taxBase - 300000000) * 0.007; currentRateText = '0.7%'; }
              else if (taxBase <= 1200000000) { compTax = 3600000 + (taxBase - 600000000) * 0.01; currentRateText = '1.0%'; }
              else if (taxBase <= 2500000000) { compTax = 9600000 + (taxBase - 1200000000) * 0.013; currentRateText = '1.3%'; }
              else if (taxBase <= 5000000000) { compTax = 26500000 + (taxBase - 2500000000) * 0.015; currentRateText = '1.5%'; }
              else if (taxBase <= 9400000000) { compTax = 64000000 + (taxBase - 5000000000) * 0.02; currentRateText = '2.0%'; }
              else { compTax = 152000000 + (taxBase - 9400000000) * 0.027; currentRateText = '2.7%'; }
              compMsg = (compMsg ? compMsg + ' / ' : '') + `개인 일반세율 적용 (현재구간 ${currentRateText})`;
            }
          } else {
            const isSpecial = document.querySelector('input[name="comp-corp-sp"]:checked').value === 'yes';
            if (isSpecial) {
              actualDeduct = 900000000; 
              const taxBase = Math.max(0, (val - actualDeduct) * ratio);
              if (taxBase <= 300000000) { compTax = taxBase * 0.005; currentRateText = '0.5%'; }
              else if (taxBase <= 600000000) { compTax = 1500000 + (taxBase - 300000000) * 0.007; currentRateText = '0.7%'; }
              else if (taxBase <= 1200000000) { compTax = 3600000 + (taxBase - 600000000) * 0.01; currentRateText = '1.0%'; }
              else if (taxBase <= 2500000000) { compTax = 9600000 + (taxBase - 1200000000) * 0.013; currentRateText = '1.3%'; }
              else if (taxBase <= 5000000000) { compTax = 26500000 + (taxBase - 2500000000) * 0.015; currentRateText = '1.5%'; }
              else if (taxBase <= 9400000000) { compTax = 64000000 + (taxBase - 5000000000) * 0.02; currentRateText = '2.0%'; }
              else { compTax = 152000000 + (taxBase - 9400000000) * 0.027; currentRateText = '2.7%'; }
              compMsg = `특례법인 누진세율 적용 (현재구간 ${currentRateText})`;
            } else {
              actualDeduct = 0; 
              const isMulti = document.querySelector('input[name="comp-corp-multi"]:checked').value === 'yes';
              const taxBase = val * ratio;
              const rate = isMulti ? 0.05 : 0.027; 
              compTax = taxBase * rate;
              compMsg = `일반법인 단일세율 적용 (${isMulti ? '5.0%' : '2.7%'})`;
            }
          }
        } else if (assetType === 'land_gen') {
          actualDeduct = 500000000;
          const taxBase = Math.max(0, (val - actualDeduct) * ratio);
          if (taxBase <= 1500000000) { compTax = taxBase * 0.01; currentRateText = '1.0%'; }
          else if (taxBase <= 4500000000) { compTax = 15000000 + (taxBase - 1500000000) * 0.02; currentRateText = '2.0%'; }
          else { compTax = 75000000 + (taxBase - 4500000000) * 0.03; currentRateText = '3.0%'; }
          compMsg = `종합합산 토지 세율 적용 (현재구간 ${currentRateText})`;
        } else if (assetType === 'land_sep') {
          actualDeduct = 8000000000;
          const taxBase = Math.max(0, (val - actualDeduct) * ratio);
          if (taxBase <= 20000000000) { compTax = taxBase * 0.005; currentRateText = '0.5%'; }
          else if (taxBase <= 40000000000) { compTax = 100000000 + (taxBase - 20000000000) * 0.006; currentRateText = '0.6%'; }
          else { compTax = 220000000 + (taxBase - 40000000000) * 0.007; currentRateText = '0.7%'; }
          compMsg = `별도합산 토지 세율 적용 (현재구간 ${currentRateText})`;
        }

        res = { label: `종부세 총합 (${ownerType === 'ind' ? '개인' : '법인'})`, main: compTax, details: `
          <div class="row"><span>기본 공제액</span><span>${formatCurrency(actualDeduct)} 원</span></div>
          <div class="row"><span>과세표준 (60%)</span><span>${formatCurrency(Math.max(0, (val - rentalExcludeAmt - actualDeduct) * ratio))} 원</span></div>
          <div class="row"><span style="font-size:11px; color:var(--color-primary);">${compMsg}</span></div>
          <p style="font-size:10px; color:var(--color-text-caption); margin-top:8px;">* 법인 주택분은 세부담 상한이 적용되지 않습니다.</p>` };
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy').value), sell = parseNum(document.getElementById('gain-sell').value);
        const expenses = parseNum(document.getElementById('gain-expenses').value);
        const asset = document.querySelector('input[name="gain-asset-type"]:checked').value;
        const isReg = document.querySelector('input[name="gain-area"]:checked').value === 'reg';
        const isRental = document.querySelector('input[name="gain-rental"]:checked').value === 'yes';
        const hold = parseInt(document.getElementById('gain-hold-years').value) || 0;
        const live = parseInt(document.getElementById('gain-live-years').value) || 0;
        
        if (!buy || !sell) { resultArea.style.display = 'none'; return; }
        
        let profit = sell - buy - expenses;
        let taxableProfit = profit;
        let rentalMsg = '';

        if (asset === 'house1' && sell <= 1200000000) {
          res = { label: '양도소득세', main: 0, details: '<span>1세대 1주택 비과세 대상 (양도가액 12억 이하)</span>' };
        } else {
          if (asset === 'house1') {
            taxableProfit = profit * (sell - 1200000000) / sell;
          }

          let lthdRate = 0;
          if (asset === 'house1' && hold >= 3) {
            lthdRate = Math.min(hold * 4, 40) + Math.min(live * 4, 40);
          } else if (isRental) {
            const rentalYears = parseInt(document.getElementById('gain-rental-years').value) || 0;
            if (rentalYears >= 10) lthdRate = 70;
            else if (rentalYears >= 8) lthdRate = 50;
            else if (hold >= 3) lthdRate = Math.min(hold * 2, 30);
            rentalMsg = rentalYears >= 8 ? `임대사업자 장특공(${lthdRate}%) 적용` : '';
          } else if (hold >= 3) {
            lthdRate = Math.min(hold * 2, 30);
          }
          
          const lthdAmount = taxableProfit * (lthdRate / 100);
          const taxBase = Math.max(0, taxableProfit - lthdAmount - 2500000);
          const { rate, deduct } = getIncomeTaxRate(taxBase);
          
          let finalRate = rate;
          let isSurchargeApplied = false;
          const isSurchargeSuspended = true; // 2026.05.09까지 유예

          if (isRental) {
            // 임대사업자 요건 체크 (가격 및 등록기간)
            const regDate = document.getElementById('gain-rental-reg-date').value;
            const rentalYears = parseInt(document.getElementById('gain-rental-years').value) || 0;
            const rentalPrice = parseNum(document.getElementById('gain-rental-price').value);
            const rentalRegion = document.getElementById('gain-rental-region').value;
            const priceLimit = rentalRegion === 'capital' ? 600000000 : 300000000;
            
            let qualifiesForExclusion = false;
            if (rentalPrice > 0 && rentalPrice <= priceLimit) {
              if (regDate === 'pre202007' && rentalYears >= 5) qualifiesForExclusion = true;
              else if (regDate === 'mid202007' && rentalYears >= 8) qualifiesForExclusion = true;
              else if (regDate === 'post202008' && rentalYears >= 10) qualifiesForExclusion = true;
            }
            
            if (qualifiesForExclusion) {
              rentalMsg = '임대사업자 중과배제 요건 충족 (영구 배제)';
            } else {
              rentalMsg = '임대사업자 요건 미달 (가격 또는 기간)';
              if (isReg && asset !== 'house1' && !isSurchargeSuspended) {
                if (asset === 'house2') { finalRate += 0.2; isSurchargeApplied = true; }
                else if (asset === 'house3') { finalRate += 0.3; isSurchargeApplied = true; }
              }
            }
          }

          if (isReg && asset !== 'house1' && !isRental && !isSurchargeSuspended) {
            if (asset === 'house2') { finalRate += 0.2; isSurchargeApplied = true; }
            else if (asset === 'house3') { finalRate += 0.3; isSurchargeApplied = true; }
          }

          if (isSurchargeSuspended && asset !== 'house1' && isReg && !isSurchargeApplied) {
            rentalMsg = (rentalMsg ? rentalMsg + ' / ' : '') + '다주택자 중과 한시적 유예 적용 중 (~2026.05.09)';
          }

          const mainTax = (taxBase * finalRate) - deduct;
          const localTax = mainTax * 0.1;
          
          res = { label: '양도소득세 총합 (지방세 포함)', main: mainTax + localTax, details: `
            <div class="row"><span>양도차익 (경비제외)</span><span>${formatCurrency(profit)} 원</span></div>
            <div class="row"><span>장특공 (${lthdRate}%)</span><span>-${formatCurrency(lthdAmount)} 원</span></div>
            <div class="row"><span>현재 적용 한계세율</span><span>${(finalRate*100).toFixed(0)}%</span></div>
            ${isSurchargeApplied ? `<div class="row"><span>다주택 중과</span><span>+${((finalRate-rate)*100).toFixed(0)}%p</span></div>` : (rentalMsg ? `<div class="row"><span style="font-size:11px;">혜택안내</span><span style="font-size:11px; color:var(--color-primary);">${rentalMsg}</span></div>` : '')}
            <div class="row"><span>지방소득세 (10%)</span><span>${formatCurrency(localTax)} 원</span></div>` };
        }
      } else if (type === 'vat') {
        const val = parseNum(document.getElementById('vat-amount').value);
        if (!val) { resultArea.style.display = 'none'; return; }
        res = { label: '부가가치세액', main: Math.floor(val / 11), details: `<span>적용 세율: 10% (포함 기준 계산)</span>` };
      }

      if (res) {
        resultLabelEl.textContent = res.label;
        finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      } else { resultArea.style.display = 'none'; }
    };

    categorySelect.addEventListener('change', () => {
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = g.id === `tax-input-${categorySelect.value}` ? 'block' : 'none');
      if (categorySelect.value === 'gain') {
        const assetType = document.querySelector('input[name="gain-asset-type"]:checked').value;
        document.getElementById('gain-live-option').style.display = (assetType === 'house1' ? 'block' : 'none');
        document.getElementById('gain-rental-detail').style.display = (document.querySelector('input[name="gain-rental"]:checked').value === 'yes' ? 'block' : 'none');
      }
      if (categorySelect.value === 'comp') {
        const ownerType = document.querySelector('input[name="comp-owner"]:checked').value;
        const assetType = document.getElementById('comp-asset-type').value;
        document.getElementById('comp-house-option').style.display = (assetType === 'house' ? 'block' : 'none');
        document.getElementById('comp-ind-house-option').style.display = (assetType === 'house' && ownerType === 'ind' ? 'block' : 'none');
        document.getElementById('comp-corp-house-option').style.display = (assetType === 'house' && ownerType === 'corp' ? 'block' : 'none');
        document.getElementById('comp-rental-detail').style.display = (assetType === 'house' && document.querySelector('input[name="comp-rental"]:checked').value === 'yes' ? 'block' : 'none');
      }
      if (categorySelect.value === 'prop') {
        const assetType = document.getElementById('prop-asset-type').value;
        document.getElementById('prop-house-option').style.display = (assetType === 'house' ? 'block' : 'none');
        document.getElementById('prop-land-option').style.display = (assetType === 'land' ? 'block' : 'none');
      }
      calc();
    });
    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
        if (el.name === 'gain-asset-type') document.getElementById('gain-live-option').style.display = (e.target.value === 'house1' ? 'block' : 'none');
        if (el.name === 'gain-rental') document.getElementById('gain-rental-detail').style.display = (e.target.value === 'yes' ? 'block' : 'none');
        if (el.name === 'comp-rental') document.getElementById('comp-rental-detail').style.display = (e.target.value === 'yes' ? 'block' : 'none');
        if (el.name === 'comp-owner') {
          const isHouse = document.getElementById('comp-asset-type').value === 'house';
          document.getElementById('comp-ind-house-option').style.display = (isHouse && e.target.value === 'ind' ? 'block' : 'none');
          document.getElementById('comp-corp-house-option').style.display = (isHouse && e.target.value === 'corp' ? 'block' : 'none');
        }
        if (el.name === 'comp-type') {
          const is1House = e.target.value === '1200000000';
          const multiRadios = document.querySelectorAll('input[name="comp-multi"]');
          multiRadios.forEach(r => {
            r.disabled = is1House;
            if (is1House && r.value === 'no') r.checked = true;
          });
        }
        if (el.id === 'comp-asset-type') {
          const ownerType = document.querySelector('input[name="comp-owner"]:checked').value;
          document.getElementById('comp-house-option').style.display = (e.target.value === 'house' ? 'block' : 'none');
          document.getElementById('comp-ind-house-option').style.display = (e.target.value === 'house' && ownerType === 'ind' ? 'block' : 'none');
          document.getElementById('comp-corp-house-option').style.display = (e.target.value === 'house' && ownerType === 'corp' ? 'block' : 'none');
        }
        if (el.id === 'prop-asset-type') {
          document.getElementById('prop-house-option').style.display = (e.target.value === 'house' ? 'block' : 'none');
          document.getElementById('prop-land-option').style.display = (e.target.value === 'land' ? 'block' : 'none');
        }
        calc();
      });
      el.addEventListener('change', calc);
    });
    document.querySelector('.btn-clear[data-target="tax"]').addEventListener('click', () => {
      document.querySelectorAll('#calc-tax input').forEach(i => i.value = '');
      resultArea.style.display = 'none';
    });
  };

  initLoan(); initSalary(); initSavings(); initTax();
});