// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// 양도소득세 장기보유특별공제율 계산 (2024-2025 현행 세법)
const getLongTermDeductionRate = (isHouse1, holdYear, resideYear) => {
  if (holdYear < 3) return 0; // 3년 미만 보유 시 공제 없음

  if (isHouse1 && resideYear >= 2) {
    // 1세대 1주택 (보유 4% + 거주 4%)
    const holdRate = Math.min(holdYear * 0.04, 0.4);
    const resideRate = Math.min(resideYear * 0.04, 0.4);
    return holdRate + resideRate;
  } else {
    // 일반 자산 (보유 연 2%, 최대 30%)
    return Math.min(holdYear * 0.02, 0.3);
  }
};

// 양도소득세 세율표
const getGainTaxRate = (base) => {
  if (base <= 14000000) return { rate: 0.06, deduct: 0 };
  if (base <= 50000000) return { rate: 0.15, deduct: 1260000 };
  if (base <= 88000000) return { rate: 0.24, deduct: 5760000 };
  if (base <= 150000000) return { rate: 0.35, deduct: 15440000 };
  if (base <= 300000000) return { rate: 0.38, deduct: 19940000 };
  if (base <= 500000000) return { rate: 0.40, deduct: 25940000 };
  if (base <= 1000000000) return { rate: 0.42, deduct: 35940000 };
  return { rate: 0.45, deduct: 65940000 };
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

  // 2. 세금 계산기 (장특공 및 양도세 정밀 로직)
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    if (!categorySelect) return;
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');

    const calculate = () => {
      const type = categorySelect.value;
      let res = null;

      if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy')?.value || 0);
        const sell = parseNum(document.getElementById('gain-sell')?.value || 0);
        const exp = parseNum(document.getElementById('gain-expenses')?.value || 0);
        const holdY = parseInt(document.getElementById('gain-hold-year')?.value || 0, 10);
        const resideY = parseInt(document.getElementById('gain-reside-year')?.value || 0, 10);
        const assetType = document.querySelector('input[name="gain-asset-type"]:checked')?.value;
        const isH1 = assetType === 'house1';

        if (buy > 0 && sell > 0) {
          let profit = sell - buy - exp;
          let detailHtml = `<div class="row"><span>전체 양도차익</span><span>${formatCurrency(profit)} 원</span></div>`;

          // 1주택 비과세 안분 (12억 초과분만 과세)
          let taxableProfit = profit;
          if (isH1) {
            if (sell <= 1200000000) {
              taxableProfit = 0;
              detailHtml += `<div class="row"><span>비과세 혜택</span><span>1세대 1주택 (12억 이하)</span></div>`;
            } else {
              taxableProfit = profit * (sell - 1200000000) / sell;
              detailHtml += `<div class="row"><span>비과세 안분 (12억 초과)</span><span>${formatCurrency(taxableProfit)} 원</span></div>`;
            }
          }

          // 장기보유특별공제 적용
          const deductionRate = getLongTermDeductionRate(isH1, holdY, resideY);
          const deductionAmt = taxableProfit * deductionRate;
          const baseAfterDeduction = Math.max(0, taxableProfit - deductionAmt);
          
          if (deductionRate > 0) {
            detailHtml += `<div class="row"><span>장기보유특별공제 (${(deductionRate * 100).toFixed(0)}%)</span><span>-${formatCurrency(deductionAmt)} 원</span></div>`;
          }

          // 기본공제 및 과세표준
          const finalBase = Math.max(0, baseAfterDeduction - 2500000);
          detailHtml += `<div class="row"><span>기본 공제</span><span>-2,500,000 원</span></div>`;
          detailHtml += `<div class="row"><span>과세표준</span><span>${formatCurrency(finalBase)} 원</span></div>`;

          // 세율 적용
          const rInfo = getGainTaxRate(finalBase);
          const tax = (finalBase * rInfo.rate - rInfo.deduct) * 1.1; // 지방소득세 포함

          res = { main: taxableProfit === 0 ? 0 : tax, details: detailHtml + `<div class="row"><span>양도소득세율 (지방세 포함)</span><span>${(rInfo.rate * 100).toFixed(0)}%</span></div>` };
        }
      } else if (type === 'gift') {
        const configs = [
          { id: 'spouse', label: '배우자', deduct: 600000000 },
          { id: 'adult-child', label: '성인자녀', deduct: 50000000 },
          { id: 'minor-child', label: '미성년자녀', deduct: 20000000 },
          { id: 'relative', label: '친족', deduct: 10000000 },
          { id: 'other', label: '기타', deduct: 0 }
        ];
        let totalTax = 0, totalAmt = 0, b = '';
        configs.forEach(c => {
          const cnt = parseInt(document.getElementById(`gift-${c.id}-count`)?.value || 0, 10);
          const amt = parseNum(document.getElementById(`gift-${c.id}-amount`)?.value || 0);
          if (cnt > 0 && amt > 0) {
            totalAmt += cnt * amt;
            const base = Math.max(0, amt - c.deduct);
            const r = base <= 100000000 ? {r:0.1, d:0, t:'10%'} : (base <= 500000000 ? {r:0.2, d:10000000, t:'20%'} : {r:0.3, d:60000000, t:'30%'});
            const tax = (base * r.r - r.d) * 0.97;
            totalTax += tax * cnt;
            b += `<div class="row"><span>${c.label} (${cnt}명)</span><span>인당 ${formatCurrency(tax)} 원</span></div>`;
          }
        });
        if (totalAmt > 0) res = { main: totalTax, details: b };
      } else {
        // 기타 세목 간이
        const group = document.getElementById(`tax-input-${type}`);
        const input = group?.querySelector('input[type="text"]');
        if (input && parseNum(input.value) > 0) {
          res = { main: parseNum(input.value) * 0.01, details: '기본 1% 예상' };
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
      // 1주택자 여부에 따라 거주기간 박스 제어
      const resideBox = document.getElementById('gain-reside-box');
      if (resideBox) {
        const isH1 = document.querySelector('input[name="gain-asset-type"]:checked')?.value === 'house1';
        resideBox.style.display = (val === 'gain' && isH1) ? 'block' : 'none';
      }
      calculate();
    };

    categorySelect.addEventListener('change', handleSwitch);
    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') {
          const v = parseNum(e.target.value);
          e.target.value = v ? formatCurrency(v) : '';
        }
        if (e.target.name === 'gain-asset-type') {
          const resideBox = document.getElementById('gain-reside-box');
          if (resideBox) resideBox.style.display = e.target.value === 'house1' ? 'block' : 'none';
        }
        calculate();
      });
    });

    handleSwitch();
  };

  // 3. 기타 계산기 (간이)
  const initOthers = () => {
    const ids = ['calc-loan', 'calc-salary', 'calc-savings'];
    ids.forEach(id => {
      const sec = document.getElementById(id);
      if (!sec) return;
      sec.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
        const resArea = sec.querySelector('.result-area');
        if (resArea) resArea.style.display = 'block';
      }));
    });
  };

  initTax();
  initOthers();
};

document.addEventListener('DOMContentLoaded', initApp);