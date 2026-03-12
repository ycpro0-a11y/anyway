// [웹 컴포넌트] 광고 배너를 위한 Placeholder 컴포넌트
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
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${width};
          height: ${height};
          background-color: #f8f9fa;
          border: 1px dashed #ced4da;
          color: #868e96;
          font-size: 12px;
          margin: 16px 0;
          border-radius: 8px;
          box-sizing: border-box;
          text-align: center;
          padding: 0 16px;
        }
      </style>
      <div class="ad-container">${text}</div>
    `;
  }
}

customElements.define('ad-placeholder', AdPlaceholder);

// [비즈니스 로직] 대출 계산기
document.addEventListener('DOMContentLoaded', () => {
  const amountInput = document.getElementById('amount');
  const rateInput = document.getElementById('rate');
  const termInput = document.getElementById('term');
  const typeRadios = document.querySelectorAll('input[name="type"]');
  const typeDesc = document.getElementById('type-desc');
  const resultArea = document.getElementById('result-area');
  
  const monthlyLabel = document.getElementById('monthly-label');
  const monthlyPaymentEl = document.getElementById('monthly-payment');
  const totalInterestEl = document.getElementById('total-interest');
  const totalRepaymentEl = document.getElementById('total-repayment');
  const btnClear = document.getElementById('btn-clear');

  let loanAmount = 0;

  // 상환 방식 설명 텍스트 맵
  const descMap = {
    'equal_principal_interest': '매월 동일한 금액(원금+이자)을 갚아나가는 방식입니다.',
    'equal_principal': '매월 동일한 원금을 갚아, 이자가 갈수록 줄어드는 방식입니다.',
    'bullet': '매월 이자만 내고, 만기 시 원금을 한 번에 갚는 방식입니다.'
  };

  // 금액 포맷팅 (예: 10000 -> 10,000)
  const formatCurrency = (num) => {
    return Math.round(num).toLocaleString('ko-KR');
  };

  // 입력값 콤마 처리 로직
  const handleAmountInput = (e) => {
    let value = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    if (value === '') {
      loanAmount = 0;
      e.target.value = '';
    } else {
      loanAmount = parseInt(value, 10);
      e.target.value = loanAmount.toLocaleString('ko-KR');
    }
    calculate();
  };

  // 계산 로직
  const calculate = () => {
    const rate = parseFloat(rateInput.value);
    const months = parseInt(termInput.value, 10);
    const type = document.querySelector('input[name="type"]:checked').value;

    if (!loanAmount || !rate || !months || rate <= 0 || months <= 0) {
      resultArea.style.display = 'none';
      return;
    }

    const monthlyRate = (rate / 100) / 12; // 월 이자율
    let firstMonthPayment = 0;
    let totalInterest = 0;
    let totalRepayment = 0;

    if (type === 'equal_principal_interest') {
      // 원리금균등: 매월 상환액 동일 = 원금 * 월이자율 * (1+월이자율)^개월수 / ((1+월이자율)^개월수 - 1)
      const mathPow = Math.pow(1 + monthlyRate, months);
      const monthlyPayment = loanAmount * monthlyRate * mathPow / (mathPow - 1);
      
      firstMonthPayment = monthlyPayment;
      totalRepayment = monthlyPayment * months;
      totalInterest = totalRepayment - loanAmount;
      monthlyLabel.textContent = '매월 상환액 (동일)';

    } else if (type === 'equal_principal') {
      // 원금균등: 매월 원금 = 총원금/개월수. 이자는 남은 원금에 비례.
      const monthlyPrincipal = loanAmount / months;
      
      // 첫 달 상환액 = 매월 원금 + (총원금 * 월이자율)
      firstMonthPayment = monthlyPrincipal + (loanAmount * monthlyRate);
      
      // 총 이자 계산 (등차수열의 합)
      for (let i = 0; i < months; i++) {
        const remainingPrincipal = loanAmount - (monthlyPrincipal * i);
        totalInterest += remainingPrincipal * monthlyRate;
      }
      totalRepayment = loanAmount + totalInterest;
      monthlyLabel.textContent = '첫 달 상환액 (점차 감소)';

    } else if (type === 'bullet') {
      // 만기일시: 매월 이자만 = 원금 * 월이자율. 만기 시 원금+마지막 이자.
      const monthlyInterest = loanAmount * monthlyRate;
      firstMonthPayment = monthlyInterest;
      totalInterest = monthlyInterest * months;
      totalRepayment = loanAmount + totalInterest;
      monthlyLabel.textContent = '매월 상환액 (이자만)';
    }

    // 결과 표시
    monthlyPaymentEl.innerHTML = `${formatCurrency(firstMonthPayment)} <span class="unit">원</span>`;
    totalInterestEl.textContent = `${formatCurrency(totalInterest)} 원`;
    totalRepaymentEl.textContent = `${formatCurrency(totalRepayment)} 원`;
    
    resultArea.style.display = 'block';
  };

  // 이벤트 리스너 등록
  amountInput.addEventListener('input', handleAmountInput);
  rateInput.addEventListener('input', calculate);
  termInput.addEventListener('input', calculate);

  // 상환 방식 변경 이벤트
  typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      typeDesc.textContent = descMap[e.target.value];
      calculate();
    });
  });

  // 금액 빠른 추가 버튼
  document.querySelectorAll('.quick-add button[data-val]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const addVal = parseInt(e.target.dataset.val, 10);
      loanAmount += addVal;
      amountInput.value = loanAmount.toLocaleString('ko-KR');
      calculate();
    });
  });

  // 기간 빠른 추가 버튼
  document.querySelectorAll('.quick-add button[data-term]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      termInput.value = e.target.dataset.term;
      calculate();
    });
  });

  // 초기화 버튼
  btnClear.addEventListener('click', () => {
    loanAmount = 0;
    amountInput.value = '';
    rateInput.value = '';
    termInput.value = '';
    document.getElementById('type1').checked = true;
    typeDesc.textContent = descMap['equal_principal_interest'];
    resultArea.style.display = 'none';
  });
});
