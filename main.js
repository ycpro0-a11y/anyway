// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// --- 세율 및 공제 테이블 (2024-2025 현행 세법) ---

const getProgressiveTax = (base) => {
  if (base <= 100000000) return { rate: 0.1, deduct: 0, text: '10%' };
  if (base <= 500000000) return { rate: 0.2, deduct: 10000000, text: '20%' };
  if (base <= 1000000000) return { rate: 0.3, deduct: 60000000, text: '30%' };
  if (base <= 3000000000) return { rate: 0.4, deduct: 160000000, text: '40%' };
  return { rate: 0.5, deduct: 460000000, text: '50%' };
};

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

const getPropertyTaxRate = (base, isH1) => {
  const r = isH1 
    ? [{l:60000000, r:0.0005, d:0}, {l:150000000, r:0.001, d:30000}, {l:300000000, r:0.002, d:180000}, {l:Infinity, r:0.0035, d:630000}]
    : [{l:60000000, r:0.001, d:0}, {l:150000000, r:0.0015, d:30000}, {l:300000000, r:0.0025, d:180000}, {l:Infinity, r:0.004, d:630000}];
  const target = r.find(range => base <= range.l) || r[3];
  return { rate: target.r, deduct: target.d };
};

// --- 앱 초기화 ---

const initApp = () => {
  
  // 1. SPA 네비게이션
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.calc-section');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      sections.forEach(sec => sec.classList.remove('active'));
      const targetSec = document.getElementById(tabId);
      if (targetSec) targetSec.classList.add('active');
      document.getElementById('header-title').textContent = item.getAttribute('data-title');
      document.getElementById('header-desc').textContent = item.getAttribute('data-desc');
      window.scrollTo(0, 0);
    });
  });

  // 2. 세금 계산기 (상세 요율 및 특례 명시 강화)
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    if (!categorySelect) return;
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');

    const calculate = () => {
      const type = categorySelect.value;
      let res = null;

      if (type === 'acq') {
        const amt = parseNum(document.getElementById('acq-amount')?.value || 0);
        const houseCount = document.querySelector('input[name="acq-house"]:checked')?.value || '1';
        const isReg = document.querySelector('input[name="acq-area"]:checked')?.value === 'reg';
        if (amt > 0) {
          let rate = 0.01;
          let rateText = "";
          if (houseCount === '1') {
            if (amt > 600000000 && amt <= 900000000) rate = (amt * 2 / 300000000 - 3) / 100;
            else if (amt > 900000000) rate = 0.03;
            rateText = "1주택 기본세율 (1~3%)";
          } else if (houseCount === '2') {
            rate = isReg ? 0.08 : (amt > 900000000 ? 0.03 : (amt > 600000000 ? (amt * 2 / 300000000 - 3) / 100 : 0.01));
            rateText = isReg ? "조정대상지역 2주택 중과 (8%)" : "비조정지역 2주택 기본세율";
          } else {
            rate = isReg ? 0.12 : 0.08;
            rateText = isReg ? "조정대상지역 3주택 중과 (12%)" : "비조정지역 3주택 중과 (8%)";
          }
          
          const tax = amt * rate;
          const surtax = tax * 0.1; // 지방교육세 등 가산세
          res = { 
            main: tax + surtax, 
            details: `
              <div class="row"><span>적용 세율 구분</span><span>${rateText}</span></div>
              <div class="row"><span>최종 취득세율</span><span>${(rate * 100).toFixed(2)}%</span></div>
              <div class="row"><span>취득세 본세</span><span>${formatCurrency(tax)} 원</span></div>
              <div class="row"><span>지방교육세 등 부가세(10%)</span><span>${formatCurrency(surtax)} 원</span></div>
            `
          };
        }
      } else if (type === 'prop') {
        const val = parseNum(document.getElementById('prop-value')?.value || 0);
        const assetType = document.getElementById('prop-asset-type')?.value;
        const isH1 = document.querySelector('input[name="prop-h1"]:checked')?.value === 'yes';
        if (val > 0) {
          const fmvRate = assetType === 'house' ? 0.6 : 0.7;
          const base = val * fmvRate;
          const isSpecial = assetType === 'house' && isH1 && val <= 900000000;
          const rInfo = getPropertyTaxRate(base, isSpecial);
          const tax = base * rInfo.rate - rInfo.deduct;
          res = { 
            main: tax, 
            details: `
              <div class="row"><span>공정시장가액비율</span><span>${fmvRate * 100}% (${assetType === 'house' ? '주택' : '토지/건물'})</span></div>
              <div class="row"><span>과세표준</span><span>${formatCurrency(base)} 원</span></div>
              <div class="row"><span>1주택자 특례세율</span><span>${isSpecial ? '적용 (-0.05%p)' : '미적용'}</span></div>
              <div class="row"><span>최종 적용 세율</span><span>${(rInfo.rate * 100).toFixed(2)}%</span></div>
            ` 
          };
        }
      } else if (type === 'comp') {
        const val = parseNum(document.getElementById('comp-value')?.value || 0);
        const ownerType = document.querySelector('input[name="comp-owner"]:checked')?.value;
        const assetType = document.getElementById('comp-asset-type')?.value;
        const houseCount = document.querySelector('input[name="comp-house-count"]:checked')?.value;
        if (val > 0) {
          let deduct = (ownerType === 'ind' && assetType === 'house') ? (houseCount === 'h1' ? 1200000000 : 900000000) : 0;
          const fmvRate = assetType === 'house' ? 0.6 : 1.0;
          const base = Math.max(0, val - deduct) * fmvRate;
          const rate = houseCount === 'h3' ? 0.02 : 0.01; 
          res = { 
            main: base * rate, 
            details: `
              <div class="row"><span>종부세 기본공제액</span><span>-${formatCurrency(deduct)} 원 (${houseCount === 'h1' ? '1주택' : '다주택'})</span></div>
              <div class="row"><span>공정시장가액비율</span><span>${fmvRate * 100}% 적용</span></div>
              <div class="row"><span>과세표준</span><span>${formatCurrency(base)} 원</span></div>
              <div class="row"><span>구간 세율(간이)</span><span>${(rate * 100).toFixed(1)}%</span></div>
            ` 
          };
        }
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy')?.value || 0), sell = parseNum(document.getElementById('gain-sell')?.value || 0), exp = parseNum(document.getElementById('gain-expenses')?.value || 0);
        const holdY = parseInt(document.getElementById('gain-hold-year')?.value || 0, 10), resideY = parseInt(document.getElementById('gain-reside-year')?.value || 0, 10);
        const isH1 = document.querySelector('input[name="gain-asset-type"]:checked')?.value === 'house1';
        if (buy > 0 && sell > 0) {
          let profit = sell - buy - exp;
          let taxableProfit = isH1 ? (sell <= 1200000000 ? 0 : profit * (sell - 1200000000) / sell) : profit;
          let dRate = holdY < 3 ? 0 : (isH1 && resideY >= 2 ? Math.min(holdY * 0.04, 0.4) + Math.min(resideY * 0.04, 0.4) : Math.min(holdY * 0.02, 0.3));
          const base = Math.max(0, taxableProfit * (1 - dRate) - 2500000);
          const rInfo = getGainTaxRate(base);
          const tax = (base * rInfo.rate - rInfo.deduct) * 1.1;
          res = { 
            main: taxableProfit === 0 ? 0 : tax, 
            details: `
              <div class="row"><span>비과세 여부 (12억)</span><span>${isH1 ? (sell <= 1200000000 ? '전액 비과세' : '12억 초과분 과세') : '해당없음'}</span></div>
              <div class="row"><span>장기보유특별공제율</span><span>${(dRate * 100).toFixed(0)}% (연 4%+4% 특례 등)</span></div>
              <div class="row"><span>과세표준</span><span>${formatCurrency(base)} 원</span></div>
              <div class="row"><span>양도소득세율</span><span>${(rInfo.rate * 100).toFixed(0)}% (누진세율)</span></div>
            ` 
          };
        }
      } else if (type === 'gift') {
        const configs = [{id:'spouse', l:'배우자', d:600000000}, {id:'adult-child', l:'성인자녀', d:50000000}, {id:'minor-child', l:'미성년자녀', d:20000000}, {id:'relative', l:'친족', d:10000000}, {id:'other', l:'기타', d:0}];
        let totalTax = 0, b = '';
        configs.forEach(c => {
          const cnt = parseInt(document.getElementById(`gift-${c.id}-count`)?.value || 0, 10), amt = parseNum(document.getElementById(`gift-${c.id}-amount`)?.value || 0);
          if (cnt > 0 && amt > 0) {
            const base = Math.max(0, amt - c.d), r = getProgressiveTax(base), tax = (base * r.rate - r.deduct) * 0.97;
            totalTax += tax * cnt;
            b += `<div class="row"><span>${c.l} (${cnt}명)</span><span>공제 ${formatCurrency(c.d)} / 세율 ${r.text}</span></div>`;
          }
        });
        if (totalTax > 0) res = { main: totalTax, details: b + `<div class="row"><span>신고세액공제</span><span>3% 적용 완료</span></div>` };
      }

      if (res) {
        finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      } else { resultArea.style.display = 'none'; }
    };

    categorySelect.addEventListener('change', () => {
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
      calculate();
    });

    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') {
          const v = parseNum(e.target.value);
          e.target.value = v ? formatCurrency(v) : '';
        }
        calculate();
      });
    });

    const clearBtn = document.querySelector('.btn-clear[data-target="tax"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        document.querySelectorAll('#calc-tax input').forEach(i => i.value = '');
        resultArea.style.display = 'none';
      });
    }

    document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
  };

  const initOthers = () => {
    ['calc-loan', 'calc-salary', 'calc-savings'].forEach(id => {
      const sec = document.getElementById(id);
      if (!sec) return;
      sec.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
          if (e.target.type === 'text') {
            const v = parseNum(e.target.value);
            e.target.value = v ? formatCurrency(v) : '';
          }
          const res = sec.querySelector('.result-area') || sec.querySelector('.pay-stub') || sec.querySelector('.loan-schedule');
          if (res) res.style.display = 'block';
        });
      });
      const clearBtn = sec.querySelector('.btn-clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          sec.querySelectorAll('input').forEach(i => i.value = '');
          const res = sec.querySelector('.result-area') || sec.querySelector('.pay-stub') || sec.querySelector('.loan-schedule');
          if (res) res.style.display = 'none';
        });
      }
    });
  };

  initTax();
  initOthers();
};

document.addEventListener('DOMContentLoaded', initApp);