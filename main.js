// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// 정밀 세율표 (현행 세법 기준)
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

  // 2. 세금 계산기 (상세 내역 출력 보강)
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    if (!categorySelect) return;
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');

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
        let totalTax = 0, totalAmt = 0, b = '';
        configs.forEach(c => {
          const count = parseInt(document.getElementById(`gift-${c.id}-count`)?.value || 0, 10);
          const amt = parseNum(document.getElementById(`gift-${c.id}-amount`)?.value || 0);
          if (count > 0 && amt > 0) {
            totalAmt += amt * count;
            const base = Math.max(0, amt - c.deduct);
            const r = getProgressiveTax(base);
            const tax = (base * r.rate - r.deduct) * 0.97; // 신고세액공제 3%
            totalTax += tax * count;
            b += `<div class="row"><span>${c.label} (${count}명)</span><span>인당 ${formatCurrency(tax)} 원 (세율 ${r.text})</span></div>`;
          }
        });
        const prop = parseNum(document.getElementById('gift-prop-amount')?.value || 0);
        if (totalAmt > 0) res = { main: totalTax + prop * 0.04, details: b + (prop > 0 ? `<div class="row"><span>부동산 취득세(4%)</span><span>${formatCurrency(prop * 0.04)} 원</span></div>` : '') };
      } else if (type === 'inherit') {
        const total = parseNum(document.getElementById('inherit-amount')?.value || 0);
        const hasSpouse = document.getElementById('inherit-has-spouse')?.checked;
        const childCount = parseInt(document.getElementById('inherit-child-count')?.value || 0, 10);
        if (total > 0) {
          const deduct = Math.max(500000000, 200000000 + childCount * 50000000) + (hasSpouse ? 500000000 : 0);
          const base = Math.max(0, total - deduct);
          const r = getProgressiveTax(base);
          const tax = (base * r.rate - r.deduct) * 0.97;
          res = { main: tax, details: `<div class="row"><span>공제액 (일괄+배우자)</span><span>-${formatCurrency(deduct)} 원</span></div><div class="row"><span>과세표준</span><span>${formatCurrency(base)} 원</span></div><div class="row"><span>적용 최고세율</span><span>${r.text}</span></div>` };
        }
      } else if (type === 'acq') {
        const amt = parseNum(document.getElementById('acq-amount')?.value || 0);
        if (amt > 0) {
          let rate = 0.01;
          if (amt > 600000000 && amt <= 900000000) rate = (amt * 2 / 300000000 - 3) / 100;
          else if (amt > 900000000) rate = 0.03;
          res = { main: amt * rate * 1.1, details: `<div class="row"><span>기본 취득세율</span><span>${(rate * 100).toFixed(2)}%</span></div><div class="row"><span>지방교육세 등 (10%)</span><span>${formatCurrency(amt * rate * 0.1)} 원</span></div>` };
        }
      } else if (type === 'prop') {
        const val = parseNum(document.getElementById('prop-value')?.value || 0);
        const isH1 = document.querySelector('input[name="prop-h1"]:checked')?.value === 'yes';
        if (val > 0) {
          const base = val * 0.6; // 공정시장가액비율 60%
          const rate = base <= 60000000 ? 0.001 : (base <= 150000000 ? 0.0015 : (base <= 300000000 ? 0.0025 : 0.004));
          const tax = base * (isH1 ? rate - 0.0005 : rate);
          res = { main: tax, details: `<div class="row"><span>공정시장가액비율</span><span>60% 적용</span></div><div class="row"><span>과세표준</span><span>${formatCurrency(base)} 원</span></div><div class="row"><span>적용 세율</span><span>${(isH1 ? rate - 0.0005 : rate) * 100}%</span></div>` };
        }
      } else if (type === 'comp') {
        const val = parseNum(document.getElementById('comp-value')?.value || 0);
        const assetType = document.getElementById('comp-asset-type')?.value;
        if (val > 0) {
          const deduct = assetType === 'house' ? 900000000 : 0; // 간이 (1주택 12억 등 복잡로직 생략)
          const base = Math.max(0, val - deduct) * 0.8; // 공정시장가액비율 80%
          res = { main: base * 0.01, details: `<div class="row"><span>기본 공제액</span><span>${formatCurrency(deduct)} 원</span></div><div class="row"><span>공정시장가액비율</span><span>80% 적용</span></div><div class="row"><span>과세표준</span><span>${formatCurrency(base)} 원</span></div>` };
        }
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy')?.value || 0);
        const sell = parseNum(document.getElementById('gain-sell')?.value || 0);
        const isH1 = document.querySelector('input[name="gain-asset-type"]:checked')?.value === 'house1';
        if (buy > 0 && sell > 0) {
          let profit = sell - buy;
          let taxableProfit = isH1 ? (sell <= 1200000000 ? 0 : profit * (sell - 1200000000) / sell) : profit;
          const base = Math.max(0, taxableProfit - 2500000); // 기본공제
          const tax = base * 0.2; // 간이 20%
          res = { main: tax, details: `<div class="row"><span>총 양도차익</span><span>${formatCurrency(profit)} 원</span></div><div class="row"><span>비과세 제외 과표</span><span>${formatCurrency(taxableProfit)} 원</span></div><div class="row"><span>기본 공제</span><span>-2,500,000 원</span></div>` };
        }
      } else if (type === 'vat') {
        const amt = parseNum(document.getElementById('vat-amount')?.value || 0);
        if (amt > 0) {
          res = { main: amt * 0.1, details: `<div class="row"><span>공급가액</span><span>${formatCurrency(amt)} 원</span></div><div class="row"><span>세율</span><span>10%</span></div>` };
        }
      }

      if (res) {
        finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      } else { resultArea.style.display = 'none'; }
    };

    const handleSwitch = () => {
      const val = categorySelect.value;
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${val}`) ? 'block' : 'none');
      calculate();
    };

    categorySelect.addEventListener('change', handleSwitch);
    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') {
          const v = parseNum(e.target.value);
          e.target.value = v ? formatCurrency(v) : '';
        }
        calculate();
      });
    });

    handleSwitch();
  };

  // 3. 나머지 계산기 (간이)
  const initOthers = () => {
    const ids = ['calc-loan', 'calc-salary', 'calc-savings'];
    ids.forEach(id => {
      const sec = document.getElementById(id);
      if (!sec) return;
      sec.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
        const res = sec.querySelector('.result-area') || sec.querySelector('.pay-stub') || sec.querySelector('.loan-schedule');
        if (res) res.style.display = 'block';
      }));
    });
  };

  initTax();
  initOthers();
};

document.addEventListener('DOMContentLoaded', initApp);