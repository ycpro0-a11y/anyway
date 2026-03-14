// 공통 유틸리티
const formatCurrency = (num) => {
  if (isNaN(num) || num === Infinity || num === -Infinity) return '0';
  return Math.round(num).toLocaleString('ko-KR');
};
const parseNum = (str) => {
  if (typeof str !== 'string') return parseInt(str, 10) || 0;
  return parseInt(str.replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
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

  // 2. 세금 계산기 (공정시장가액비율 차등화 및 초기화 복구)
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
        if (amt > 0) {
          res = { main: amt * 0.011, details: '<div class="row"><span>취득세율</span><span>약 1.1% 가정</span></div>' };
        }
      } else if (type === 'prop') {
        const val = parseNum(document.getElementById('prop-value')?.value || 0);
        const assetType = document.getElementById('prop-asset-type')?.value; // house, building, land
        if (val > 0) {
          const fmvRate = assetType === 'house' ? 0.6 : 0.7; // 주택 60%, 토지/건물 70%
          const base = val * fmvRate;
          res = { 
            main: base * 0.002, 
            details: `<div class="row"><span>공정시장가액비율</span><span>${fmvRate * 100}% (${assetType === 'house' ? '주택' : '토지/건물'})</span></div><div class="row"><span>과세표준</span><span>${formatCurrency(base)} 원</span></div>` 
          };
        }
      } else if (type === 'comp') {
        const val = parseNum(document.getElementById('comp-value')?.value || 0);
        const assetType = document.getElementById('comp-asset-type')?.value; // house, land
        if (val > 0) {
          const fmvRate = assetType === 'house' ? 0.6 : 1.0; // 주택 60%, 토지 100%
          const base = val * fmvRate;
          res = { 
            main: base * 0.01, 
            details: `<div class="row"><span>공정시장가액비율</span><span>${fmvRate * 100}% (${assetType === 'house' ? '주택' : '토지'})</span></div><div class="row"><span>과세표준</span><span>${formatCurrency(base)} 원</span></div>` 
          };
        }
      } else if (type === 'gain') {
        const buy = parseNum(document.getElementById('gain-buy')?.value || 0);
        const sell = parseNum(document.getElementById('gain-sell')?.value || 0);
        if (buy > 0 && sell > 0) {
          res = { main: (sell - buy) * 0.2, details: '<div class="row"><span>양도차익 기준</span><span>간이 20% 계산</span></div>' };
        }
      }

      if (res) {
        finalAmountEl.innerHTML = `${formatCurrency(res.main)} <span class="unit">원</span>`;
        detailsEl.innerHTML = res.details;
        resultArea.style.display = 'block';
      } else { resultArea.style.display = 'none'; }
    };

    // 전환 이벤트
    categorySelect.addEventListener('change', () => {
      document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
      calculate();
    });

    // 입력 이벤트
    document.querySelectorAll('#calc-tax input, #calc-tax select').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.type === 'text') {
          const v = parseNum(e.target.value);
          e.target.value = v ? formatCurrency(v) : '';
        }
        calculate();
      });
    });

    // 초기화 버튼 복구
    const clearBtn = document.querySelector('.btn-clear[data-target="tax"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        document.querySelectorAll('#calc-tax input').forEach(i => i.value = '');
        resultArea.style.display = 'none';
      });
    }

    // 초기 가시성 설정
    document.querySelectorAll('.tax-form-group').forEach(g => g.style.display = (g.id === `tax-input-${categorySelect.value}`) ? 'block' : 'none');
  };

  // 3. 나머지 계산기 모듈 (대출, 연봉 등 공통 초기화 로직)
  const initOthers = () => {
    const sections = ['calc-loan', 'calc-salary', 'calc-savings'];
    sections.forEach(id => {
      const sec = document.getElementById(id);
      if (!sec) return;
      
      // 입력 시 결과창 자동 노출
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

      // 초기화 버튼 이벤트 등록
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