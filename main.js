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

// 공통 유틸리티 (순수 자체 개발 로직)
const formatCurrency = (num) => Math.round(num).toLocaleString('ko-KR');
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // SPA 탭 네비게이션
  // ==========================================
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.calc-section');
  const headerTitle = document.getElementById('header-title');
  const headerDesc = document.getElementById('header-desc');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      const targetId = item.getAttribute('data-tab');
      sections.forEach(sec => sec.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');
      headerTitle.textContent = item.getAttribute('data-title');
      headerDesc.textContent = item.getAttribute('data-desc');
      window.scrollTo(0, 0);
    });
  });

  // ==========================================
  // 1. 대출 이자 계산기
  // ==========================================
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
        monthlyPayment = principalPerMonth + (loanAmount * monthlyRate); // 첫 달 기준
      } else {
        monthlyPayment = loanAmount * monthlyRate;
        totalInterest = monthlyPayment * months;
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

  // ==========================================
  // 2. 연봉 실수령액 계산기
  // ==========================================
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
      // 간이 계산 로직 (2024년 기준 대략적 보험료율 적용)
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

  // ==========================================
  // 3. 예적금 계산기
  // ==========================================
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
      const afterTax = interest * 0.846; // 일반과세 15.4% 제외
      document.getElementById('sav-total-receive').innerHTML = `${formatCurrency((type === 'installment' ? savAmount * months : savAmount) + afterTax)} <span class="unit">원</span>`;
      resultArea.style.display = 'block';
    };
    amtInput.addEventListener('input', (e) => { savAmount = parseNum(e.target.value); e.target.value = savAmount ? formatCurrency(savAmount) : ''; calc(); });
    [termInput, rateInput].forEach(i => i.addEventListener('input', calc));
    document.querySelectorAll('input[name="sav-type"]').forEach(r => r.addEventListener('change', calc));
  };

  // ==========================================
  // 4. 주식 평단가 계산기
  // ==========================================
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

  // ==========================================
  // 5. 종합 세금 계산기 (증여/상속 취득세 포함)
  // ==========================================
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');
    const resultLabelEl = document.getElementById('tax-result-label');

    const handleCategoryChange = () => {
      const selected = categorySelect.value;
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = g.id === `tax-input-${selected}` ? 'block' : 'none');
      calc();
    };
    categorySelect.addEventListener('change', handleCategoryChange);

    const calcVat = () => {
      const val = parseNum(document.getElementById('vat-amount').value);
      if (!val) return null;
      return { label: '부가가치세액', main: Math.floor(val / 11), details: `<div class="row"><span>공급가액</span><span>${formatCurrency(val - Math.floor(val/11))} 원</span></div>` };
    };

    const calcGift = () => {
      const total = parseNum(document.getElementById('gift-amount').value);
      const prop = parseNum(document.getElementById('gift-prop-amount').value);
      if (!total) return null;
      const deduct = parseInt(document.getElementById('gift-relation').value);
      const base = Math.max(0, total - deduct);
      let tax = 0;
      if (base <= 100000000) tax = base * 0.1;
      else if (base <= 500000000) tax = base * 0.2 - 10000000;
      else if (base <= 1000000000) tax = base * 0.3 - 60000000;
      else if (base <= 3000000000) tax = base * 0.4 - 160000000;
      else tax = base * 0.5 - 460000000;
      const giftTax = tax * 0.97; // 신고세액공제 3%
      const acqTax = prop * 0.04; // 증여 취득세율 대략 4% (지방교육세 등 포함)
      return { label: '총 납부 세액 (증여+취득)', main: giftTax + acqTax, details: `
        <div class="row"><span>증여세(국세)</span><span>${formatCurrency(giftTax)} 원</span></div>
        <div class="row"><span>증여취득세(지방세)</span><span>${formatCurrency(acqTax)} 원</span></div>
      ` };
    };

    const calcInherit = () => {
      const total = parseNum(document.getElementById('inherit-amount').value);
      const prop = parseNum(document.getElementById('inherit-prop-amount').value);
      if (!total) return null;
      const family = document.querySelector('input[name="inherit-family"]:checked').value;
      let deduct = 500000000;
      if (family === 'both') deduct = 1000000000;
      else if (family === 'spouse') deduct = 700000000;
      const base = Math.max(0, total - deduct);
      let tax = 0;
      if (base <= 100000000) tax = base * 0.1;
      else if (base <= 500000000) tax = base * 0.2 - 10000000;
      else tax = base * 0.3 - 60000000; // 단순화
      const inheritTax = tax * 0.97;
      const acqTax = prop * 0.0316; // 상속 취득세율 대략 3.16%
      return { label: '총 납부 세액 (상속+취득)', main: inheritTax + acqTax, details: `
        <div class="row"><span>상속세(국세)</span><span>${formatCurrency(inheritTax)} 원</span></div>
        <div class="row"><span>상속취득세(지방세)</span><span>${formatCurrency(acqTax)} 원</span></div>
      ` };
    };

    const calc = () => {
      const type = categorySelect.value;
      let res = null;
      if (type === 'vat') res = calcVat();
      else if (type === 'gift') res = calcGift();
      else if (type === 'inherit') res = calcInherit();
      // ... 기타 부동산 세금 생략 (유사 로직)

      if (res) {
        resultLabelEl.textContent = res.label;
        finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      } else { resultArea.style.display = 'none'; }
    };

    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') e.target.value = parseNum(e.target.value) ? formatCurrency(parseNum(e.target.value)) : '';
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