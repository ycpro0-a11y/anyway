// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
};

// --- 세율 테이블 (2024-2025 현행 세법) ---

// 1. 재산세율 (주택 기준)
const getPropertyTax = (base, isSpecial) => {
  const r = isSpecial 
    ? [{l:60000000, r:0.0005, d:0}, {l:150000000, r:0.001, d:30000}, {l:300000000, r:0.002, d:180000}, {l:Infinity, r:0.0035, d:630000}]
    : [{l:60000000, r:0.001, d:0}, {l:150000000, r:0.0015, d:30000}, {l:300000000, r:0.0025, d:180000}, {l:Infinity, r:0.004, d:630000}];
  const target = r.find(range => base <= range.l) || r[3];
  return base * target.r - target.d;
};

// 2. 종부세율 (주택/개인 기준)
const getCompTax = (base, isMulti) => {
  const r = isMulti
    ? [{l:300000000, r:0.005, d:0}, {l:600000000, r:0.007, d:600000}, {l:1200000000, r:0.01, d:2400000}, {l:2500000000, r:0.02, d:14400000}, {l:Infinity, r:0.05, d:183400000}] // 3주택 이상 중과(간이)
    : [{l:300000000, r:0.005, d:0}, {l:600000000, r:0.007, d:600000}, {l:1200000000, r:0.01, d:2400000}, {l:2500000000, r:0.012, d:4800000}, {l:Infinity, r:0.027, d:71800000}]; // 일반
  const target = r.find(range => base <= range.l) || r[4];
  return base * target.r - target.d;
};

// --- 앱 초기화 ---

const initApp = () => {
  
  // SPA 네비게이션
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

  // 통합 세금 계산기
  const initTax = () => {
    const categorySelect = document.getElementById('tax-category-select');
    if (!categorySelect) return;
    const resultArea = document.getElementById('tax-result');
    const finalAmountEl = document.getElementById('tax-final-amount');
    const detailsEl = document.getElementById('tax-result-details');

    const calculate = () => {
      const type = categorySelect.value;
      let res = null;

      if (type === 'holding') {
        const val = parseNum(document.getElementById('holding-value')?.value || 0);
        const assetType = document.getElementById('holding-asset-type')?.value;
        const isH1 = document.querySelector('input[name="holding-h1"]:checked')?.value === 'yes';
        const houseCount = document.querySelector('input[name="holding-count"]:checked')?.value;
        const ownerType = document.querySelector('input[name="holding-owner"]:checked')?.value;

        if (val > 0) {
          // 1. 재산세 계산
          const propFmv = assetType === 'house' ? 0.6 : 0.7;
          const propBase = val * propFmv;
          let propTax = 0;
          let propDetail = "";

          if (assetType === 'house') {
            propTax = getPropertyTax(propBase, isH1 && val <= 900000000);
            propDetail = `재산세: ${formatCurrency(propTax)} 원 (과표 ${propFmv*100}%)`;
          } else {
            propTax = propBase * (assetType === 'land' ? 0.002 : 0.0025);
            propDetail = `재산세: ${formatCurrency(propTax)} 원 (과표 ${propFmv*100}%)`;
          }

          // 2. 종부세 계산 (주택 및 토지만)
          let compTax = 0;
          let compDetail = "종부세: 대상 아님";
          
          if (assetType !== 'building') {
            const compDeduct = (ownerType === 'ind' && assetType === 'house') ? (isH1 ? 1200000000 : 900000000) : 0;
            const compFmv = assetType === 'house' ? 0.6 : 1.0;
            const compBase = Math.max(0, val - compDeduct) * compFmv;
            
            if (compBase > 0) {
              if (ownerType === 'corp') {
                compTax = compBase * (houseCount === '3' ? 0.05 : 0.027);
              } else {
                compTax = getCompTax(compBase, houseCount === '3');
              }
              // 중복분 공제 (간이 20% 차감)
              compTax = compTax * 0.8;
              compDetail = `종부세: ${formatCurrency(compTax)} 원 (공제 후)`;
            }
          }

          res = { 
            main: propTax + compTax, 
            details: `
              <div class="row"><span>${propDetail}</span></div>
              <div class="row"><span>${compDetail}</span></div>
              <div class="row"><span>지방교육세 등 부가세(약 20%)</span><span>${formatCurrency((propTax + compTax) * 0.2)} 원</span></div>
            `
          };
        }
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy')?.value || 0), sell = parseNum(document.getElementById('gain-sell')?.value || 0);
        if (buy > 0 && sell > 0) {
          res = { main: (sell - buy) * 0.2, details: '<div class="row"><span>양도차익 기본 계산</span></div>' };
        }
      } else {
        const group = document.getElementById(`tax-input-${type}`);
        const input = group?.querySelector('input[type="text"]');
        if (input && parseNum(input.value) > 0) {
          res = { main: parseNum(input.value) * 0.01, details: '간이 계산' };
        }
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
        // 자산 유형에 따른 주택 옵션 제어
        if (e.target.id === 'holding-asset-type') {
          const opt = document.getElementById('holding-house-options');
          if (opt) opt.style.display = e.target.value === 'house' ? 'block' : 'none';
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
      if (clearBtn) clearBtn.addEventListener('click', () => {
        sec.querySelectorAll('input').forEach(i => i.value = '');
        const res = sec.querySelector('.result-area') || sec.querySelector('.pay-stub') || sec.querySelector('.loan-schedule');
        if (res) res.style.display = 'none';
      });
    });
  };

  initTax();
  initOthers();
};

document.addEventListener('DOMContentLoaded', initApp);