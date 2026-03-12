// [웹 컴포넌트] 광고 배너 (AdSense 최적화 플레이스홀더)
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
    const calc = () => {
      const rate = parseFloat(rateInput.value);
      const months = parseInt(termInput.value, 10);
      const type = document.querySelector('input[name="loan-type"]:checked').value;
      if (!loanAmount || !rate || !months) { resultArea.style.display = 'none'; return; }
      const monthlyRate = (rate / 100) / 12;
      let monthlyPayment = 0, totalInterest = 0;
      if (type === 'equal_principal_interest') {
        const p = Math.pow(1 + monthlyRate, months);
        monthlyPayment = loanAmount * monthlyRate * p / (p - 1);
        totalInterest = (monthlyPayment * months) - loanAmount;
      } else if (type === 'equal_principal') {
        const principalPerMonth = loanAmount / months;
        for (let i = 0; i < months; i++) totalInterest += (loanAmount - (principalPerMonth * i)) * monthlyRate;
        monthlyPayment = principalPerMonth + (loanAmount * monthlyRate);
      } else {
        monthlyPayment = loanAmount * monthlyRate; totalInterest = monthlyPayment * months;
      }
      document.getElementById('loan-monthly-payment').innerHTML = `${formatCurrency(monthlyPayment)} <span class="unit">원</span>`;
      document.getElementById('loan-total-interest').textContent = `${formatCurrency(totalInterest)} 원`;
      document.getElementById('loan-total-repayment').textContent = `${formatCurrency(loanAmount + totalInterest)} 원`;
      resultArea.style.display = 'block';
    };
    amtInput.addEventListener('input', (e) => { loanAmount = parseNum(e.target.value); e.target.value = loanAmount ? formatCurrency(loanAmount) : ''; calc(); });
    [rateInput, termInput].forEach(i => i.addEventListener('input', calc));
    document.querySelectorAll('input[name="loan-type"]').forEach(r => r.addEventListener('change', calc));
    document.querySelectorAll('.btn-add-loan').forEach(btn => btn.addEventListener('click', (e) => { loanAmount += parseInt(e.target.dataset.val); amtInput.value = formatCurrency(loanAmount); calc(); }));
    document.querySelectorAll('.btn-term-loan').forEach(btn => btn.addEventListener('click', (e) => { termInput.value = e.target.dataset.term; calc(); }));
    document.querySelector('.btn-clear[data-target="loan"]').addEventListener('click', () => { loanAmount = 0; amtInput.value = ''; rateInput.value = ''; termInput.value = ''; resultArea.style.display = 'none'; });
  };

  // 2. 연봉 계산기
  let salaryAmount = 0;
  const initSalary = () => {
    const amtInput = document.getElementById('salary-amount');
    const taxfreeInput = document.getElementById('salary-taxfree');
    const resultArea = document.getElementById('salary-result');
    const calc = () => {
      if (!salaryAmount || salaryAmount < 1000000) { resultArea.style.display = 'none'; return; }
      const monthly = Math.floor(salaryAmount / 12);
      const taxfree = parseNum(taxfreeInput.value);
      const taxable = Math.max(0, monthly - taxfree);
      const pension = Math.min(taxable * 0.045, 265500);
      const health = taxable * 0.03545;
      const care = health * 0.1295;
      const employ = taxable * 0.009;
      const totalIns = pension + health + care + employ;
      document.getElementById('salary-monthly').innerHTML = `${formatCurrency(monthly - totalIns)} <span class="unit">원</span>`;
      document.getElementById('tax-total').textContent = `${formatCurrency(totalIns)} 원`;
      resultArea.style.display = 'block';
    };
    amtInput.addEventListener('input', (e) => { salaryAmount = parseNum(e.target.value); e.target.value = salaryAmount ? formatCurrency(salaryAmount) : ''; calc(); });
    taxfreeInput.addEventListener('input', calc);
    document.querySelectorAll('.btn-add-salary').forEach(btn => btn.addEventListener('click', (e) => { salaryAmount = parseInt(e.target.dataset.val); amtInput.value = formatCurrency(salaryAmount); calc(); }));
    document.querySelector('.btn-clear[data-target="salary"]').addEventListener('click', () => { salaryAmount = 0; amtInput.value = ''; resultArea.style.display = 'none'; });
  };

  // 3. 예적금 계산기
  let savAmount = 0;
  const initSavings = () => {
    const amtInput = document.getElementById('sav-amount');
    const termInput = document.getElementById('sav-term');
    const rateInput = document.getElementById('sav-rate');
    const resultArea = document.getElementById('sav-result');
    const calc = () => {
      const months = parseInt(termInput.value);
      const rate = parseFloat(rateInput.value);
      if (!savAmount || !months || !rate) { resultArea.style.display = 'none'; return; }
      const type = document.querySelector('input[name="sav-type"]:checked').value;
      let interest = 0;
      if (type === 'installment') interest = savAmount * (rate/100/12) * (months * (months + 1) / 2);
      else interest = savAmount * (rate/100) * (months / 12);
      const afterTax = interest * 0.846;
      document.getElementById('sav-total-receive').innerHTML = `${formatCurrency((type === 'installment' ? savAmount * months : savAmount) + afterTax)} <span class="unit">원</span>`;
      resultArea.style.display = 'block';
    };
    amtInput.addEventListener('input', (e) => { savAmount = parseNum(e.target.value); e.target.value = savAmount ? formatCurrency(savAmount) : ''; calc(); });
    [termInput, rateInput].forEach(i => i.addEventListener('input', calc));
    document.querySelectorAll('input[name="sav-type"]').forEach(r => r.addEventListener('change', calc));
  };

  // 4. 주식 계산기
  const initStock = () => {
    const fields = ['stock-cur-price', 'stock-cur-qty', 'stock-add-price', 'stock-add-qty'];
    const resultArea = document.getElementById('stock-result');
    const calc = () => {
      const cp = parseNum(document.getElementById('stock-cur-price').value);
      const cq = parseNum(document.getElementById('stock-cur-qty').value);
      const ap = parseNum(document.getElementById('stock-add-price').value);
      const aq = parseNum(document.getElementById('stock-add-qty').value);
      if (!cp || !cq || !ap || !aq) { resultArea.style.display = 'none'; return; }
      const totalCost = (cp * cq) + (ap * aq);
      const totalQty = cq + aq;
      document.getElementById('stock-final-price').innerHTML = `${formatCurrency(totalCost / totalQty)} <span class="unit">원</span>`;
      resultArea.style.display = 'block';
    };
    fields.forEach(id => document.getElementById(id).addEventListener('input', (e) => { e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : ''; calc(); }));
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

    const getPropTaxRate = (base) => {
      if (base <= 100000000) return base * 0.1;
      if (base <= 500000000) return base * 0.2 - 10000000;
      if (base <= 1000000000) return base * 0.3 - 60000000;
      if (base <= 3000000000) return base * 0.4 - 160000000;
      return base * 0.5 - 460000000;
    };

    const calc = () => {
      const type = categorySelect.value;
      let res = null;

      if (type === 'gift') {
        const total = parseNum(document.getElementById('gift-amount').value);
        const prop = parseNum(document.getElementById('gift-prop-amount').value);
        const children = parseInt(document.getElementById('gift-children').value);
        const deduct = parseInt(document.getElementById('gift-relation').value);
        if (!total) { resultArea.style.display = 'none'; return; }
        const perPerson = total / children;
        const perTaxBase = Math.max(0, perPerson - deduct);
        const perTax = getPropTaxRate(perTaxBase) * 0.97;
        const totalGiftTax = perTax * children;
        const acqTax = prop * 0.04;
        res = { label: '총 납부 세액 (증여+취득)', main: totalGiftTax + acqTax, details: `
          <div class="row"><span>증여세율</span><span>10~50% (누진)</span></div>
          <div class="row"><span>증여세 (총합)</span><span>${formatCurrency(totalGiftTax)} 원</span></div>
          <div class="row"><span>증여취득세 (4%)</span><span>${formatCurrency(acqTax)} 원</span></div>` };
      } else if (type === 'inherit') {
        const total = parseNum(document.getElementById('inherit-amount').value);
        const prop = parseNum(document.getElementById('inherit-prop-amount').value);
        const family = document.querySelector('input[name="inherit-family"]:checked').value;
        const childCount = parseInt(document.getElementById('inherit-children-count').value);
        if (!total) { resultArea.style.display = 'none'; return; }
        let deduct = 500000000;
        if (family === 'both') deduct = 1000000000;
        else if (family === 'spouse') deduct = 700000000;
        const base = Math.max(0, total - deduct);
        const totalInheritTax = getPropTaxRate(base) * 0.97;
        const acqTax = prop * 0.0316;
        res = { label: '총 상속 관련 세액', main: totalInheritTax + acqTax, details: `
          <div class="row"><span>상속세율</span><span>10~50% (누진)</span></div>
          <div class="row"><span>상속세액</span><span>${formatCurrency(totalInheritTax)} 원</span></div>
          <div class="row"><span>상속취득세 (3.16%)</span><span>${formatCurrency(acqTax)} 원</span></div>` };
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
          <div class="row"><span>취득세율</span><span>${(rate*100).toFixed(1)}%</span></div>
          <div class="row"><span>지방교육세</span><span>${formatCurrency(val * eduRate)} 원</span></div>
          <div class="row"><span>농어촌특별세</span><span>${formatCurrency(val * agriRate)} 원</span></div>` };
      } else if (type === 'prop') {
        const val = parseNum(document.getElementById('prop-value').value);
        if (!val) { resultArea.style.display = 'none'; return; }
        const base = val * 0.6;
        let tax = base <= 60000000 ? base*0.001 : (base <= 150000000 ? 60000+(base-60000000)*0.0015 : (base <= 300000000 ? 195000+(base-150000000)*0.0025 : 570000+(base-300000000)*0.004));
        res = { label: '재산세(추정)', main: tax * 1.3, details: `<span>재산세율: 0.1~0.4%</span><br><span>지방교육세 등 부가세 포함</span>` };
      } else if (type === 'comp') {
        const val = parseNum(document.getElementById('comp-value').value);
        const deduct = parseInt(document.querySelector('input[name="comp-type"]:checked').value);
        if (!val) { resultArea.style.display = 'none'; return; }
        const base = Math.max(0, (val - deduct) * 0.6);
        res = { label: '종합부동산세(추정)', main: base * 0.01, details: `<span>공제금액: ${formatCurrency(deduct)} 원</span><br><span>세율: 0.5~5.0% (단순화)</span>` };
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy').value), sell = parseNum(document.getElementById('gain-sell').value);
        const expenses = parseNum(document.getElementById('gain-expenses').value);
        const asset = document.querySelector('input[name="gain-asset-type"]:checked').value;
        const isReg = document.querySelector('input[name="gain-area"]:checked').value === 'reg';
        const hold = parseInt(document.getElementById('gain-hold-years').value) || 0;
        const live = parseInt(document.getElementById('gain-live-years').value) || 0;
        if (!buy || !sell) { resultArea.style.display = 'none'; return; }
        let profit = sell - buy - expenses;
        let taxableProfit = profit;
        if (asset === 'house1') {
          if (sell <= 1200000000) return { label: '양도소득세', main: 0, details: '1주택 비과세 대상' };
          taxableProfit = profit * (sell - 1200000000) / sell;
        }
        let lthdRate = 0;
        if (asset === 'house1' && hold >= 3) lthdRate = Math.min(hold * 4, 40) + Math.min(live * 4, 40);
        else if (hold >= 3 && (!isReg || asset === 'other')) lthdRate = Math.min(hold * 2, 30);
        const lthdAmount = taxableProfit * (lthdRate / 100);
        const taxBase = Math.max(0, taxableProfit - lthdAmount - 2500000);
        const { rate, deduct } = getIncomeTaxRate(taxBase);
        let finalRate = rate;
        if (isReg && asset !== 'house1') { if (asset === 'house2') finalRate += 0.2; else if (asset === 'house3') finalRate += 0.3; }
        const mainTax = (taxBase * finalRate) - deduct;
        const localTax = mainTax * 0.1;
        res = { label: '양도소득세 총합 (지방세 포함)', main: mainTax + localTax, details: `
          <div class="row"><span>양도차익 (경비제외)</span><span>${formatCurrency(profit)} 원</span></div>
          <div class="row"><span>장특공 (${lthdRate}%)</span><span>-${formatCurrency(lthdAmount)} 원</span></div>
          <div class="row"><span>기본세율</span><span>${(rate*100).toFixed(0)}%</span></div>
          ${isReg && asset !== 'house1' ? `<div class="row"><span>다주택 중과</span><span>+${((finalRate-rate)*100).toFixed(0)}%p</span></div>` : ''}
          <div class="row"><span>지방소득세 (10%)</span><span>${formatCurrency(localTax)} 원</span></div>` };
      } else if (type === 'vat') {
        const val = parseNum(document.getElementById('vat-amount').value);
        if (!val) { resultArea.style.display = 'none'; return; }
        res = { label: '부가가치세액', main: Math.floor(val / 11), details: `<span>세율: 10% (포함 기준 계산)</span>` };
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
      if (categorySelect.value === 'gain') document.getElementById('gain-live-option').style.display = (document.querySelector('input[name="gain-asset-type"]:checked').value === 'house1' ? 'block' : 'none');
      calc();
    });
    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
        if (el.name === 'gain-asset-type') document.getElementById('gain-live-option').style.display = (e.target.value === 'house1' ? 'block' : 'none');
        calc();
      });
      el.addEventListener('change', calc);
    });
    document.querySelector('.btn-clear[data-target="tax"]').addEventListener('click', () => {
      document.querySelectorAll('#calc-tax input').forEach(i => i.value = '');
      resultArea.style.display = 'none';
    });
  };

  initLoan(); initSalary(); initSavings(); initStock(); initTax();
});