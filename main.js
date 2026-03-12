// [웹 컴포넌트] 광고 배너
class AdPlaceholder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    const width = this.getAttribute('width') || '100%';
    const height = this.getAttribute('height') || '80px';
    const text = this.getAttribute('text') || 'Advertisement';

    this.shadowRoot.innerHTML = `
      <style>
        .ad-container {
          display: flex; align-items: center; justify-content: center;
          width: ${width}; height: ${height}; background-color: #f8f9fa;
          border: 1px dashed #ced4da; color: #868e96; font-size: 12px;
          margin: 16px 0; border-radius: 8px; box-sizing: border-box; text-align: center; padding: 0 16px;
        }
      </style>
      <div class="ad-container">${text}</div>
    `;
  }
}
customElements.define('ad-placeholder', AdPlaceholder);

// 공통 유틸리티
const formatCurrency = (num) => Math.round(num).toLocaleString('ko-KR');
const parseNum = (str) => parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 탭 네비게이션 로직 (SPA 방식)
  // ==========================================
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.calc-section');
  const headerTitle = document.getElementById('header-title');
  const headerDesc = document.getElementById('header-desc');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      // 1. 활성 탭 스타일 변경
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // 2. 화면 전환
      const targetId = item.getAttribute('data-tab');
      sections.forEach(sec => sec.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');

      // 3. 헤더 텍스트 변경
      headerTitle.textContent = item.getAttribute('data-title');
      headerDesc.textContent = item.getAttribute('data-desc');
    });
  });

  // ==========================================
  // 1. 대출 이자 계산기 (Loan)
  // ==========================================
  let loanAmount = 0;
  const initLoan = () => {
    const amtInput = document.getElementById('loan-amount');
    const rateInput = document.getElementById('loan-rate');
    const termInput = document.getElementById('loan-term');
    const typeRadios = document.querySelectorAll('input[name="loan-type"]');
    const typeDesc = document.getElementById('loan-type-desc');
    const resultArea = document.getElementById('loan-result');
    
    const calc = () => {
      const rate = parseFloat(rateInput.value);
      const months = parseInt(termInput.value, 10);
      const type = document.querySelector('input[name="loan-type"]:checked').value;

      if (!loanAmount || !rate || !months || rate <= 0 || months <= 0) {
        resultArea.style.display = 'none'; return;
      }

      const monthlyRate = (rate / 100) / 12;
      let firstMonthPayment = 0, totalInterest = 0, totalRepayment = 0;

      if (type === 'equal_principal_interest') {
        const mathPow = Math.pow(1 + monthlyRate, months);
        const monthlyPayment = loanAmount * monthlyRate * mathPow / (mathPow - 1);
        firstMonthPayment = monthlyPayment; totalRepayment = monthlyPayment * months; totalInterest = totalRepayment - loanAmount;
        document.getElementById('loan-monthly-label').textContent = '매월 상환액 (동일)';
      } else if (type === 'equal_principal') {
        const monthlyPrincipal = loanAmount / months;
        firstMonthPayment = monthlyPrincipal + (loanAmount * monthlyRate);
        for (let i = 0; i < months; i++) {
          const remainingPrincipal = loanAmount - (monthlyPrincipal * i);
          totalInterest += remainingPrincipal * monthlyRate;
        }
        totalRepayment = loanAmount + totalInterest;
        document.getElementById('loan-monthly-label').textContent = '첫 달 상환액 (점차 감소)';
      } else if (type === 'bullet') {
        firstMonthPayment = loanAmount * monthlyRate; totalInterest = firstMonthPayment * months; totalRepayment = loanAmount + totalInterest;
        document.getElementById('loan-monthly-label').textContent = '매월 상환액 (이자만)';
      }

      document.getElementById('loan-monthly-payment').innerHTML = `
        ${formatCurrency(firstMonthPayment)} <span class="unit">원</span>
      `;
      document.getElementById('loan-total-interest').textContent = `${formatCurrency(totalInterest)} 원`;
      document.getElementById('loan-total-repayment').textContent = `${formatCurrency(totalRepayment)} 원`;
      resultArea.style.display = 'block';
    };

    amtInput.addEventListener('input', (e) => {
      loanAmount = parseNum(e.target.value);
      e.target.value = loanAmount ? formatCurrency(loanAmount) : '';
      calc();
    });
    rateInput.addEventListener('input', calc);
    termInput.addEventListener('input', calc);
    
    typeRadios.forEach(radio => radio.addEventListener('change', (e) => {
      const descMap = { 'equal_principal_interest': '매월 동일한 금액(원금+이자)을 갚아나가는 방식입니다.', 'equal_principal': '매월 동일한 원금을 갚아, 이자가 갈수록 줄어드는 방식입니다.', 'bullet': '매월 이자만 내고, 만기 시 원금을 한 번에 갚는 방식입니다.' };
      typeDesc.textContent = descMap[e.target.value]; calc();
    }));

    document.querySelectorAll('.btn-add-loan').forEach(btn => btn.addEventListener('click', (e) => {
      loanAmount += parseInt(e.target.dataset.val, 10);
      amtInput.value = formatCurrency(loanAmount); calc();
    }));
    document.querySelectorAll('.btn-term-loan').forEach(btn => btn.addEventListener('click', (e) => {
      termInput.value = e.target.dataset.term; calc();
    }));
    document.querySelector('.btn-clear[data-target="loan"]').addEventListener('click', () => {
      loanAmount = 0; amtInput.value = ''; rateInput.value = ''; termInput.value = '';
      document.getElementById('type1').checked = true; resultArea.style.display = 'none';
    });
  };

  // ==========================================
  // 2. 연봉 실수령액 계산기 (Salary) - 간이세액표 근사치 모델
  // ==========================================
  let salaryAmount = 0;
  const initSalary = () => {
    const amtInput = document.getElementById('salary-amount');
    const taxfreeInput = document.getElementById('salary-taxfree');
    const resultArea = document.getElementById('salary-result');

    const calc = () => {
      const taxfreeMonthly = parseNum(taxfreeInput.value);
      if (!salaryAmount || salaryAmount < 1200000) { resultArea.style.display = 'none'; return; }

      const monthlySalary = Math.floor(salaryAmount / 12);
      const taxableMonthly = Math.max(0, monthlySalary - taxfreeMonthly); // 과세표준 월급 (식대 비과세 제외)

      // 4대 보험료율 (2024년 기준 대략치 적용)
      const pension = Math.min(taxableMonthly * 0.045, 265500); // 국민연금 상한액 대략 적용
      const health = taxableMonthly * 0.03545; // 건강보험
      const care = health * 0.1295; // 장기요양
      const employ = taxableMonthly * 0.009; // 고용보험

      // 소득세 (매우 단순화된 근사치 로직 - 실제 간이세액표는 훨씬 복잡함)
      // 프로토타입 목적이므로 구간별 단순 비율을 적용합니다.
      let incomeTax = 0;
      if (taxableMonthly > 10000000) incomeTax = taxableMonthly * 0.15;
      else if (taxableMonthly > 5000000) incomeTax = taxableMonthly * 0.08;
      else if (taxableMonthly > 3000000) incomeTax = taxableMonthly * 0.03;
      else if (taxableMonthly > 2000000) incomeTax = taxableMonthly * 0.01;
      
      const localTax = incomeTax * 0.1; // 지방소득세 10%

      const totalDeduction = pension + health + care + employ + incomeTax + localTax;
      const netMonthly = monthlySalary - totalDeduction;

      document.getElementById('salary-monthly').innerHTML = `
        ${formatCurrency(netMonthly)} <span class="unit">원</span>
      `;
      document.getElementById('tax-pension').textContent = `${formatCurrency(pension)} 원`;
      document.getElementById('tax-health').textContent = `${formatCurrency(health + care)} 원`;
      document.getElementById('tax-employ').textContent = `${formatCurrency(employ)} 원`;
      document.getElementById('tax-total').textContent = `${formatCurrency(totalDeduction)} 원`;
      
      resultArea.style.display = 'block';
    };

    amtInput.addEventListener('input', (e) => {
      salaryAmount = parseNum(e.target.value);
      e.target.value = salaryAmount ? formatCurrency(salaryAmount) : '';
      calc();
    });
    taxfreeInput.addEventListener('input', (e) => {
      const val = parseNum(e.target.value);
      e.target.value = val ? formatCurrency(val) : '';
      calc();
    });

    document.querySelectorAll('.btn-add-salary').forEach(btn => btn.addEventListener('click', (e) => {
      salaryAmount += parseInt(e.target.dataset.val, 10);
      amtInput.value = formatCurrency(salaryAmount); calc();
    }));
    document.querySelector('.btn-clear[data-target="salary"]').addEventListener('click', () => {
      salaryAmount = 0; amtInput.value = ''; resultArea.style.display = 'none';
    });
  };

  // ==========================================
  // 3. 예적금 계산기 (Savings)
  // ==========================================
  let savAmount = 0;
  const initSavings = () => {
    const amtInput = document.getElementById('sav-amount');
    const termInput = document.getElementById('sav-term');
    const rateInput = document.getElementById('sav-rate');
    const typeRadios = document.querySelectorAll('input[name="sav-type"]');
    const taxRadios = document.querySelectorAll('input[name="sav-tax"]');
    const resultArea = document.getElementById('sav-result');
    const labelAmt = document.getElementById('sav-amount-label');

    const calc = () => {
      const months = parseInt(termInput.value, 10);
      const rate = parseFloat(rateInput.value);
      const type = document.querySelector('input[name="sav-type"]:checked').value;
      const taxRate = parseFloat(document.querySelector('input[name="sav-tax"]:checked').value);

      if (!savAmount || !months || !rate) { resultArea.style.display = 'none'; return; }

      let principal = 0;
      let preTaxInterest = 0;

      if (type === 'installment') {
        // 적금 (단리 가정)
        principal = savAmount * months;
        // 월 납입액 * 월 이자율 * 개월수(n * (n+1) / 2)
        preTaxInterest = savAmount * ((rate / 100) / 12) * (months * (months + 1) / 2);
      } else {
        // 예금
        principal = savAmount;
        preTaxInterest = principal * (rate / 100) * (months / 12);
      }

      const taxAmount = preTaxInterest * (taxRate / 100);
      const finalAmount = principal + preTaxInterest - taxAmount;

      document.getElementById('sav-total-receive').innerHTML = `
        ${formatCurrency(finalAmount)} <span class="unit">원</span>
      `;
      document.getElementById('sav-principal').textContent = `${formatCurrency(principal)} 원`;
      document.getElementById('sav-interest-pre').textContent = `${formatCurrency(preTaxInterest)} 원`;
      document.getElementById('sav-tax-rate').textContent = taxRate;
      document.getElementById('sav-tax-amount').textContent = `- ${formatCurrency(taxAmount)} 원`;
      
      resultArea.style.display = 'block';
    };

    amtInput.addEventListener('input', (e) => {
      savAmount = parseNum(e.target.value);
      e.target.value = savAmount ? formatCurrency(savAmount) : '';
      calc();
    });
    termInput.addEventListener('input', calc);
    rateInput.addEventListener('input', calc);

    typeRadios.forEach(radio => radio.addEventListener('change', (e) => {
      labelAmt.textContent = e.target.value === 'installment' ? '월 납입액 (원)' : '예치 금액 (원)';
      calc();
    }));
    taxRadios.forEach(radio => radio.addEventListener('change', calc));

    document.querySelectorAll('.btn-add-sav').forEach(btn => btn.addEventListener('click', (e) => {
      savAmount += parseInt(e.target.dataset.val, 10);
      amtInput.value = formatCurrency(savAmount); calc();
    }));
    document.querySelector('.btn-clear[data-target="savings"]').addEventListener('click', () => {
      savAmount = 0; amtInput.value = ''; termInput.value = ''; rateInput.value = ''; resultArea.style.display = 'none';
    });
  };

  // ==========================================
  // 4. 주식 물타기(평단가) 계산기 (Stock)
  // ==========================================
  const initStock = () => {
    const cpInput = document.getElementById('stock-cur-price');
    const cqInput = document.getElementById('stock-cur-qty');
    const apInput = document.getElementById('stock-add-price');
    const aqInput = document.getElementById('stock-add-qty');
    const resultArea = document.getElementById('stock-result');

    const handleInput = (e) => {
      const val = parseNum(e.target.value);
      e.target.value = val ? formatCurrency(val) : '';
      calc();
    };

    const calc = () => {
      const cp = parseNum(cpInput.value); const cq = parseNum(cqInput.value);
      const ap = parseNum(apInput.value); const aq = parseNum(aqInput.value);

      if (!cp || !cq || !ap || !aq) { resultArea.style.display = 'none'; return; }

      const totalInvest = (cp * cq) + (ap * aq);
      const totalQty = cq + aq;
      const finalPrice = totalInvest / totalQty;

      document.getElementById('stock-final-price').innerHTML = `
        ${formatCurrency(finalPrice)} <span class="unit">원</span>
      `;
      document.getElementById('stock-final-qty').textContent = `${formatCurrency(totalQty)} 주`;
      document.getElementById('stock-total-invest').textContent = `${formatCurrency(totalInvest)} 원`;
      
      resultArea.style.display = 'block';
    };

    cpInput.addEventListener('input', handleInput);
    cqInput.addEventListener('input', handleInput);
    apInput.addEventListener('input', handleInput);
    aqInput.addEventListener('input', handleInput);

    document.querySelector('.btn-clear[data-target="stock"]').addEventListener('click', () => {
      cpInput.value = ''; cqInput.value = ''; apInput.value = ''; aqInput.value = '';
      resultArea.style.display = 'none';
    });
  };

  // ==========================================
  // 5. 각종 세금 계산기 (Tax)
  // ==========================================
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    const formGroups = document.querySelectorAll('.tax-form-group');
    
    // Result elements
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');
    const resultLabelEl = document.getElementById('tax-result-label');

    const handleCategoryChange = () => {
      const selected = categorySelect.value;
      formGroups.forEach(g => {
        g.style.display = g.id === `tax-input-${selected}` ? 'block' : 'none';
      });
      calc();
    };

    categorySelect.addEventListener('change', handleCategoryChange);

    // --- 1. VAT Logic ---
    const calcVat = () => {
      const val = parseNum(document.getElementById('vat-amount').value);
      if (!val) return null;
      const isSupply = document.querySelector('input[name="vat-base"]:checked').value === 'supply';
      let supply = 0, vat = 0, total = 0;
      if (isSupply) { supply = val; vat = Math.floor(supply * 0.1); total = supply + vat; }
      else { total = val; supply = Math.round(total / 1.1); vat = total - supply; }
      return { label: '부가가치세 (10%)', main: vat, details: `
        <div class="row"><span class="result-label">공급가액</span><span class="result-value">${formatCurrency(supply)} 원</span></div>
        <div class="row"><span class="result-label">합계금액</span><span class="result-value">${formatCurrency(total)} 원</span></div>
      ` };
    };

    // --- 2. Gift Logic ---
    const calcGift = () => {
      const val = parseNum(document.getElementById('gift-amount').value);
      if (!val) return null;
      const deduction = parseInt(document.getElementById('gift-relation').value, 10);
      const taxBase = Math.max(0, val - deduction);
      let taxRate = 0, progressive = 0;
      if (taxBase <= 100000000) { taxRate = 0.1; progressive = 0; }
      else if (taxBase <= 500000000) { taxRate = 0.2; progressive = 10000000; }
      else if (taxBase <= 1000000000) { taxRate = 0.3; progressive = 60000000; }
      else if (taxBase <= 3000000000) { taxRate = 0.4; progressive = 160000000; }
      else { taxRate = 0.5; progressive = 460000000; }
      const calculated = Math.max(0, (taxBase * taxRate) - progressive);
      const finalTax = Math.max(0, calculated * 0.97); // 3% 신고세액공제
      return { label: '예상 증여세액', main: finalTax, details: `
        <div class="row"><span class="result-label">과세표준 (공제 후)</span><span class="result-value">${formatCurrency(taxBase)} 원</span></div>
        <div class="row"><span class="result-label">산출세액</span><span class="result-value">${formatCurrency(calculated)} 원</span></div>
        <div class="row"><span class="result-label">신고세액공제 (3%)</span><span class="result-value" style="color: var(--color-error);">- ${formatCurrency(calculated * 0.03)} 원</span></div>
      ` };
    };

    // --- 3. Acquisition (취득세) ---
    const calcAcq = () => {
      const val = parseNum(document.getElementById('acq-amount').value);
      if (!val) return null;
      const houseCount = parseInt(document.querySelector('input[name="acq-house"]:checked').value, 10);
      let rate = 0;
      if (houseCount === 1) {
        if (val <= 600000000) rate = 0.01;
        else if (val <= 900000000) rate = (val * (2 / 300000000) - 3) / 100;
        else rate = 0.03;
      } else if (houseCount === 2) rate = 0.01; // 비조정 2주택 기준 단순화
      else rate = 0.08; // 3주택 이상 단순화 (8~12%)

      const acqTax = val * rate;
      const eduTax = acqTax * 0.1;
      const agriTax = (val > 85000000) ? val * 0.002 : 0; // 농특세 단순화
      return { label: '취득세 합계 (추정)', main: acqTax + eduTax + agriTax, details: `
        <div class="row"><span class="result-label">취득세 (${(rate * 100).toFixed(2)}%)</span><span class="result-value">${formatCurrency(acqTax)} 원</span></div>
        <div class="row"><span class="result-label">지방교육세/농특세 등</span><span class="result-value">${formatCurrency(eduTax + agriTax)} 원</span></div>
      ` };
    };

    // --- 4. Property (재산세) ---
    const calcProp = () => {
      const val = parseNum(document.getElementById('prop-value').value);
      if (!val) return null;
      const taxBase = val * 0.6; // 공정시장가액비율 60% 가정
      let tax = 0;
      if (taxBase <= 60000000) tax = taxBase * 0.001;
      else if (taxBase <= 150000000) tax = 60000 + (taxBase - 60000000) * 0.0015;
      else if (taxBase <= 300000000) tax = 195000 + (taxBase - 150000000) * 0.0025;
      else tax = 570000 + (taxBase - 300000000) * 0.004;
      return { label: '주택 재산세 (1년분 추정)', main: tax, details: `
        <div class="row"><span class="result-label">과세표준 (공시가격의 60%)</span><span class="result-value">${formatCurrency(taxBase)} 원</span></div>
        <p class="help-text" style="margin-top:8px;">* 지방교육세, 재산세 도시지역분 등은 제외된 산출세액입니다.</p>
      ` };
    };

    // --- 5. Comprehensive (종부세) ---
    const calcComp = () => {
      const val = parseNum(document.getElementById('comp-value').value);
      if (!val) return null;
      const deduction = parseInt(document.querySelector('input[name="comp-type"]:checked').value, 10);
      const taxBase = Math.max(0, (val - deduction) * 0.6);
      let rate = 0;
      if (taxBase <= 300000000) rate = 0.005;
      else if (taxBase <= 600000000) rate = 0.007;
      else rate = 0.01; // 단순화된 구간
      const tax = taxBase * rate;
      return { label: '종합부동산세 (추정)', main: tax, details: `
        <div class="row"><span class="result-label">과세표준 (공제 후)</span><span class="result-value">${formatCurrency(taxBase)} 원</span></div>
        <div class="row"><span class="result-label">적용 세율</span><span class="result-value">${(rate * 100).toFixed(1)}%</span></div>
      ` };
    };

    // --- 6. Gains (양도세) ---
    const calcGain = () => {
      const buy = parseNum(document.getElementById('gain-buy').value);
      const sell = parseNum(document.getElementById('gain-sell').value);
      if (!buy || !sell) return null;
      const profit = Math.max(0, sell - buy - 5000000); // 기본경비 500만 가정
      const rate = parseFloat(document.getElementById('gain-term').value);
      let tax = 0;
      if (rate > 0.5) tax = profit * rate; // 단기세율
      else {
        // 기본세율 단순화 (6~45%)
        if (profit <= 14000000) tax = profit * 0.06;
        else if (profit <= 50000000) tax = profit * 0.15 - 1260000;
        else tax = profit * 0.24 - 5760000;
      }
      return { label: '양도소득세 (추정)', main: tax, details: `
        <div class="row"><span class="result-label">양도 차익 (경비 공제 후)</span><span class="result-value">${formatCurrency(profit)} 원</span></div>
        <p class="help-text" style="margin-top:8px;">* 1세대 1주택 비과세, 장기보유특별공제 등은 고려되지 않았습니다.</p>
      ` };
    };

    const calc = () => {
      const type = categorySelect.value;
      let res = null;
      if (type === 'vat') res = calcVat();
      else if (type === 'gift') res = calcGift();
      else if (type === 'acq') res = calcAcq();
      else if (type === 'prop') res = calcProp();
      else if (type === 'comp') res = calcComp();
      else if (type === 'gain') res = calcGain();

      if (!res) { resultArea.style.display = 'none'; return; }
      resultLabelEl.textContent = res.label;
      finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
      detailsEl.innerHTML = res.details;
      resultArea.style.display = 'block';
    };

    // Event Listeners for all inputs in Tax section
    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') {
          const val = parseNum(e.target.value);
          e.target.value = val ? formatCurrency(val) : '';
        }
        calc();
      });
      if (el.type === 'radio' || el.tagName === 'SELECT') {
        el.addEventListener('change', calc);
      }
    });

    document.querySelector('.btn-clear[data-target="tax"]').addEventListener('click', () => {
      document.querySelectorAll('#calc-tax input[type="text"]').forEach(i => i.value = '');
      resultArea.style.display = 'none';
    });
  };

  // Initialize all calculators
  initLoan();
  initSalary();
  initSavings();
  initStock();
  initTax();

});