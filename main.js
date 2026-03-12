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
    const typeRadios = document.querySelectorAll('input[name="tax-category"]');
    const inputVat = document.getElementById('tax-input-vat');
    const inputGift = document.getElementById('tax-input-gift');
    
    // VAT
    const vatAmountInput = document.getElementById('vat-amount');
    const vatBaseRadios = document.querySelectorAll('input[name="vat-base"]');
    
    // Gift
    const giftAmountInput = document.getElementById('gift-amount');
    const giftRelationSelect = document.getElementById('gift-relation');

    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');
    const resultLabelEl = document.getElementById('tax-result-label');

    let currentTaxType = 'vat';
    let vatVal = 0;
    let giftVal = 0;

    const handleTaxTypeChange = (e) => {
      currentTaxType = e.target.value;
      if (currentTaxType === 'vat') {
        inputVat.style.display = 'block';
        inputGift.style.display = 'none';
      } else {
        inputVat.style.display = 'none';
        inputGift.style.display = 'block';
      }
      calc();
    };

    typeRadios.forEach(r => r.addEventListener('change', handleTaxTypeChange));

    const calcVat = () => {
      if (!vatVal) return null;
      const isSupply = document.querySelector('input[name="vat-base"]:checked').value === 'supply';
      let supply = 0, vat = 0, total = 0;
      
      if (isSupply) {
        supply = vatVal;
        vat = Math.floor(supply * 0.1);
        total = supply + vat;
      } else {
        total = vatVal;
        supply = Math.round(total / 1.1);
        vat = total - supply;
      }
      return { supply, vat, total };
    };

    const calcGift = () => {
      if (!giftVal) return null;
      const deduction = parseInt(giftRelationSelect.value, 10);
      const taxBase = Math.max(0, giftVal - deduction); // 과세표준
      
      let taxRate = 0;
      let progressiveDeduction = 0;

      if (taxBase <= 100000000) { taxRate = 0.1; progressiveDeduction = 0; }
      else if (taxBase <= 500000000) { taxRate = 0.2; progressiveDeduction = 10000000; }
      else if (taxBase <= 1000000000) { taxRate = 0.3; progressiveDeduction = 60000000; }
      else if (taxBase <= 3000000000) { taxRate = 0.4; progressiveDeduction = 160000000; }
      else { taxRate = 0.5; progressiveDeduction = 460000000; }

      const calculatedTax = Math.max(0, (taxBase * taxRate) - progressiveDeduction);
      // 신고세액공제 3% (단순화)
      const reportDeduction = calculatedTax * 0.03;
      const finalTax = Math.max(0, calculatedTax - reportDeduction);

      return { taxBase, calculatedTax, reportDeduction, finalTax };
    };

    const calc = () => {
      if (currentTaxType === 'vat') {
        const res = calcVat();
        if (!res) { resultArea.style.display = 'none'; return; }
        
        resultLabelEl.textContent = '부가가치세 (10%)';
        finalAmountEl.innerHTML = `${formatCurrency(res.vat)} <span class="unit">원</span>`;
        detailsEl.innerHTML = `
          <div class="row">
            <span class="result-label">공급가액</span>
            <span class="result-value">${formatCurrency(res.supply)} 원</span>
          </div>
          <div class="row">
            <span class="result-label">합계금액</span>
            <span class="result-value">${formatCurrency(res.total)} 원</span>
          </div>
        `;
        resultArea.style.display = 'block';
      } else {
        const res = calcGift();
        if (!res) { resultArea.style.display = 'none'; return; }

        resultLabelEl.textContent = '예상 증여세액';
        finalAmountEl.innerHTML = `${formatCurrency(res.finalTax)} <span class="unit">원</span>`;
        detailsEl.innerHTML = `
          <div class="row">
            <span class="result-label">과세표준 (공제 후)</span>
            <span class="result-value">${formatCurrency(res.taxBase)} 원</span>
          </div>
          <div class="row">
            <span class="result-label">산출세액</span>
            <span class="result-value">${formatCurrency(res.calculatedTax)} 원</span>
          </div>
          <div class="row">
            <span class="result-label">신고세액공제 (3%)</span>
            <span class="result-value" style="color: var(--color-error);">- ${formatCurrency(res.reportDeduction)} 원</span>
          </div>
        `;
        resultArea.style.display = 'block';
      }
    };

    vatAmountInput.addEventListener('input', (e) => {
      vatVal = parseNum(e.target.value);
      e.target.value = vatVal ? formatCurrency(vatVal) : '';
      calc();
    });
    vatBaseRadios.forEach(r => r.addEventListener('change', calc));

    giftAmountInput.addEventListener('input', (e) => {
      giftVal = parseNum(e.target.value);
      e.target.value = giftVal ? formatCurrency(giftVal) : '';
      calc();
    });
    giftRelationSelect.addEventListener('change', calc);

    document.querySelector('.btn-clear[data-target="tax"]').addEventListener('click', () => {
      vatVal = 0; giftVal = 0;
      vatAmountInput.value = ''; giftAmountInput.value = '';
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