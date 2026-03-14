// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// 세율표 (현행 세법 기준)
const getProgressiveTax = (base) => {
  if (base <= 100000000) return { rate: 0.1, deduct: 0, text: '10%' };
  if (base <= 500000000) return { rate: 0.2, deduct: 10000000, text: '20%' };
  if (base <= 1000000000) return { rate: 0.3, deduct: 60000000, text: '30%' };
  if (base <= 3000000000) return { rate: 0.4, deduct: 160000000, text: '40%' };
  return { rate: 0.5, deduct: 460000000, text: '50%' };
};

// 메인 앱 초기화
const initApp = () => {
  
  // 1. SPA 네비게이션
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
      if (headerTitle) headerTitle.textContent = item.getAttribute('data-title');
      if (headerDesc) headerDesc.textContent = item.getAttribute('data-desc');
      window.scrollTo(0, 0);
    });
  });

  // 2. 세금 계산기 (전환 오류 해결 및 정밀 로직)
  const initTax = () => {
    const taxSection = document.getElementById('calc-tax');
    if (!taxSection) return;

    const categorySelect = document.getElementById('tax-category-select');
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');

    // 계산 실행 함수
    const calculate = () => {
      const type = categorySelect.value;
      let res = null;

      if (type === 'gift') {
        const configs = [
          { id: 'spouse', label: '배우자', deduct: 600000000 },
          { id: 'adult-child', label: '성인자녀', deduct: 50000000 },
          { id: 'minor-child', label: '미성년자녀', deduct: 20000000 },
          { id: 'relative', label: '친족', deduct: 10000000 },
          { id: 'other', label: '기타', deduct: 0 }
        ];
        let totalTax = 0, totalAmt = 0, breakdown = '';
        configs.forEach(c => {
          const count = parseInt(document.getElementById(`gift-${c.id}-count`)?.value || 0, 10);
          const amt = parseNum(document.getElementById(`gift-${c.id}-amount`)?.value || 0);
          if (count > 0 && amt > 0) {
            totalAmt += amt * count;
            const base = Math.max(0, amt - c.deduct);
            const rInfo = getProgressiveTax(base);
            const tax = (base * rInfo.rate - rInfo.deduct) * 0.97;
            totalTax += tax * count;
            breakdown += `<div class="row"><span>${c.label} (${count}명)</span><span>인당 ${formatCurrency(tax)} 원</span></div>`;
          }
        });
        const propAmt = parseNum(document.getElementById('gift-prop-amount')?.value || 0);
        if (totalAmt > 0) res = { main: totalTax + (propAmt * 0.04), details: breakdown + (propAmt > 0 ? `<div class="row"><span>부동산 취득세(4%)</span><span>${formatCurrency(propAmt * 0.04)} 원</span></div>` : '') };
      } else if (type === 'inherit') {
        const total = parseNum(document.getElementById('inherit-amount')?.value || 0);
        const hasSpouse = document.getElementById('inherit-has-spouse')?.checked;
        const childCount = parseInt(document.getElementById('inherit-child-count')?.value || 0, 10);
        if (total > 0) {
          const deduct = Math.max(500000000, 200000000 + childCount * 50000000) + (hasSpouse ? 500000000 : 0);
          const base = Math.max(0, total - deduct);
          const rInfo = getProgressiveTax(base);
          const totalTax = (base * rInfo.rate - rInfo.deduct) * 0.97;
          res = { main: totalTax, details: `<div class="row"><span>총 공제액</span><span>${formatCurrency(deduct)} 원</span></div><div class="row"><span>적용 세율</span><span>${rInfo.text}</span></div>` };
        }
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy')?.value || 0);
        const sell = parseNum(document.getElementById('gain-sell')?.value || 0);
        const exp = parseNum(document.getElementById('gain-expenses')?.value || 0);
        const isH1 = document.querySelector('input[name="gain-asset-type"]:checked')?.value === 'house1';
        if (buy > 0 && sell > 0) {
          let profit = sell - buy - exp;
          if (isH1 && sell <= 1200000000) {
            res = { main: 0, details: '1세대 1주택 12억 비과세' };
          } else {
            if (isH1) profit = profit * (sell - 1200000000) / sell;
            const base = Math.max(0, profit - 2500000);
            res = { main: base * 0.2, details: `과세대상 차익: ${formatCurrency(profit)} 원` };
          }
        }
      } else {
        const group = document.getElementById(`tax-input-${type}`);
        const input = group?.querySelector('input[type="text"]');
        if (input && parseNum(input.value) > 0) {
          res = { main: parseNum(input.value) * 0.01, details: '간이 계산 결과' };
        }
      }

      if (res && resultArea) {
        finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      } else if (resultArea) {
        resultArea.style.display = 'none';
      }
    };

    // 항목 전환 핸들러
    const handleSwitch = () => {
      const selected = categorySelect.value;
      const groups = document.querySelectorAll('.tax-form-group');
      groups.forEach(g => {
        g.style.display = (g.id === `tax-input-${selected}`) ? 'block' : 'none';
      });
      calculate();
    };

    categorySelect.addEventListener('change', handleSwitch);

    // 실시간 입력 감시
    taxSection.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') {
          const val = parseNum(e.target.value);
          e.target.value = val ? formatCurrency(val) : '';
        }
        calculate();
      });
    });

    // 초기 실행
    handleSwitch();
  };

  // 3. 나머지 계산기 (간이)
  const initOthers = () => {
    const ids = ['calc-loan', 'calc-salary', 'calc-savings'];
    ids.forEach(id => {
      const sec = document.getElementById(id);
      if (!sec) return;
      sec.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
        const res = sec.querySelector('.result-area') || sec.querySelector('.salary-stub') || sec.querySelector('.loan-schedule');
        if (res) res.style.display = 'block';
      }));
    });
  };

  initTax();
  initOthers();
};

// 즉시 실행 또는 로드 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}