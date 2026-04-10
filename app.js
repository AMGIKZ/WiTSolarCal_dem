/* =============================================
   WiTSolarCal - Main Application Logic
   Author: WiT
============================================= */

// =================== STATE ===================
const state = {
  step: 1,
  objective: null,
  backupHours: 4,
  backupAppliances: [],
  monthlyBill: 0,
  unitPrice: 4.72,
  behavior: null,
  sunHours: 4.5,
  meter: 'normal',
  appliances: [],
  settings: {
    panelPrice: 12000,
    inverterPrice: 8000,
    laborPrice: 5000,
    batteryPrice: 15000,
    efficiency: 80,
    panelWatt: 600,
  },
  results: null,
  breakEvenChart: null,
};

// General appliance presets
const GENERAL_PRESETS = [
  { name: 'ทีวี LED', icon: '📺', watt: 100, defaultHours: 5 },
  { name: 'ตู้เย็น 2 ประตู', icon: '🧊', watt: 150, defaultHours: 24 },
  { name: 'พัดลม', icon: '🌀', watt: 50, defaultHours: 8 },
  { name: 'หลอดไฟ LED', icon: '💡', watt: 10, defaultHours: 6 },
  { name: 'เครื่องซักผ้า', icon: '👕', watt: 500, defaultHours: 1 },
  { name: 'ไมโครเวฟ', icon: '📡', watt: 1000, defaultHours: 0.5 },
];

const HEAVY_PRESETS = [
  { name: 'ปั๊มน้ำ', icon: '💧', watt: 400, defaultHours: 2 },
  { name: 'เตาอบ/ไมโครเวฟใหญ่', icon: '🍳', watt: 1500, defaultHours: 0.5 },
  { name: 'เครื่องทำน้ำอุ่น', icon: '🚿', watt: 3500, defaultHours: 0.5 },
  { name: 'เครื่องชาร์จรถ EV', icon: '🚗', watt: 7000, defaultHours: 3 },
];

// =================== INIT ===================
document.addEventListener('DOMContentLoaded', () => {
  initGeneralAppliances();
  bindEvents();
  updateSlider();
  updateTotalLoad();
  loadSettings();
});

function initGeneralAppliances() {
  const list = document.getElementById('generalList');
  GENERAL_PRESETS.forEach(preset => {
    list.appendChild(createGeneralRow(preset));
  });
}

function createGeneralRow(preset) {
  const row = document.createElement('div');
  row.className = 'app-row general-row';
  row.dataset.baseWatt = preset.watt;
  row.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;color:var(--text2);font-size:0.85rem;">
      <span>${preset.icon}</span><span>${preset.name}</span>
      <span style="color:var(--text3);font-size:0.75rem;">(${preset.watt}W)</span>
    </div>
    <div class="qty-wrap">
      <button class="qty-btn minus">−</button>
      <input type="number" class="qty" value="1" min="0" max="20">
      <button class="qty-btn plus">+</button>
    </div>
    <div class="hours-wrap">
      <input type="number" class="hours" value="${preset.defaultHours}" min="0" max="24" step="0.5">
      <span class="unit">ชม./วัน</span>
    </div>
    <div class="watt-display">— Wh/วัน</div>
    <span></span>
  `;
  bindRowEvents(row);
  return row;
}

function createHeavyRow(preset) {
  const row = document.createElement('div');
  row.className = 'app-row heavy-row';
  row.dataset.baseWatt = preset.watt;
  row.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;color:var(--text2);font-size:0.85rem;">
      <span>${preset.icon}</span><span>${preset.name}</span>
      <span style="color:var(--text3);font-size:0.75rem;">(${preset.watt}W)</span>
    </div>
    <div class="qty-wrap">
      <button class="qty-btn minus">−</button>
      <input type="number" class="qty" value="1" min="0" max="20">
      <button class="qty-btn plus">+</button>
    </div>
    <div class="hours-wrap">
      <input type="number" class="hours" value="${preset.defaultHours}" min="0" max="24" step="0.5">
      <span class="unit">ชม./วัน</span>
    </div>
    <div class="watt-display">— Wh/วัน</div>
    <button class="remove-row">✕</button>
  `;
  bindRowEvents(row);
  row.querySelector('.remove-row').addEventListener('click', () => {
    row.remove();
    updateTotalLoad();
  });
  return row;
}

function createAcRow() {
  const row = document.createElement('div');
  row.className = 'app-row ac-row';
  row.innerHTML = `
    <select class="btu-select">
      <option value="9000">9,000 BTU (~900W)</option>
      <option value="12000" selected>12,000 BTU (~1,200W)</option>
      <option value="18000">18,000 BTU (~1,800W)</option>
      <option value="24000">24,000 BTU (~2,400W)</option>
    </select>
    <div class="qty-wrap">
      <button class="qty-btn minus">−</button>
      <input type="number" class="qty" value="1" min="0" max="20">
      <button class="qty-btn plus">+</button>
    </div>
    <div class="hours-wrap">
      <input type="number" class="hours" value="8" min="0" max="24">
      <span class="unit">ชม./วัน</span>
    </div>
    <div class="watt-display">— Wh/วัน</div>
    <button class="remove-row">✕</button>
  `;
  bindRowEvents(row);
  row.querySelector('.remove-row').addEventListener('click', () => {
    row.remove();
    updateTotalLoad();
  });
  return row;
}

function bindRowEvents(row) {
  row.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('.qty');
      const val = parseInt(input.value) || 0;
      if (btn.classList.contains('plus')) input.value = val + 1;
      else if (val > 0) input.value = val - 1;
      updateRowWatt(row);
      updateTotalLoad();
    });
  });
  row.querySelectorAll('.qty, .hours').forEach(inp => {
    inp.addEventListener('input', () => {
      updateRowWatt(row);
      updateTotalLoad();
    });
  });
  const btuSelect = row.querySelector('.btu-select');
  if (btuSelect) {
    btuSelect.addEventListener('change', () => {
      updateRowWatt(row);
      updateTotalLoad();
    });
  }
  updateRowWatt(row);
}

function getRowWatt(row) {
  const qty = parseInt(row.querySelector('.qty')?.value) || 0;
  const hours = parseFloat(row.querySelector('.hours')?.value) || 0;
  let baseWatt = 0;
  const btuSelect = row.querySelector('.btu-select');
  if (btuSelect) {
    baseWatt = parseInt(btuSelect.value) / 10;
  } else {
    baseWatt = parseFloat(row.dataset.baseWatt) || 0;
  }
  return qty * baseWatt * hours;
}

function updateRowWatt(row) {
  const wh = getRowWatt(row);
  const el = row.querySelector('.watt-display');
  if (el) el.textContent = wh > 0 ? `${wh.toFixed(0)} Wh/วัน` : '— Wh/วัน';
}

function updateTotalLoad() {
  let totalWh = 0;
  document.querySelectorAll('.app-row').forEach(row => {
    totalWh += getRowWatt(row);
  });
  const totalW = totalWh / 24;
  document.getElementById('totalLoad').textContent = totalW > 0 ? `${totalW.toFixed(0)} W (avg)` : '0 W';
  document.getElementById('totalUnits').textContent = `${(totalWh / 1000).toFixed(2)} หน่วย/วัน`;
}

// =================== EVENTS ===================
function bindEvents() {
  // HERO CTA
  document.getElementById('startCalc').addEventListener('click', () => {
    document.getElementById('calcSection').scrollIntoView({ behavior: 'smooth' });
  });

  // OBJECTIVE CARDS
  document.querySelectorAll('.obj-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.obj-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.objective = card.dataset.obj;
      const backupOpts = document.getElementById('backupOpts');
      if (state.objective === 'backup') {
        backupOpts.classList.remove('hidden');
      } else {
        backupOpts.classList.add('hidden');
      }
    });
  });

  // HOUR BUTTONS
  document.querySelectorAll('.hour-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hour-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.backupHours = parseInt(btn.dataset.hours);
    });
  });

  // STEP NAVIGATION
  document.getElementById('step1Next').addEventListener('click', () => {
    if (!state.objective) { shakeBtn('step1Next'); return; }
    goToStep(2);
  });
  document.getElementById('step2Back').addEventListener('click', () => goToStep(1));
  document.getElementById('step2Next').addEventListener('click', () => {
    const bill = parseFloat(document.getElementById('monthlyBill').value);
    const price = parseFloat(document.getElementById('unitPrice').value);
    if (!bill || !price || !state.behavior) { shakeBtn('step2Next'); return; }
    state.monthlyBill = bill;
    state.unitPrice = price;
    goToStep(3);
  });
  document.getElementById('step3Back').addEventListener('click', () => goToStep(2));
  document.getElementById('step3Next').addEventListener('click', () => {
    calculate();
    goToStep(4);
  });

  // BEHAVIOR
  document.querySelectorAll('.beh-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.beh-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.behavior = btn.dataset.beh;
    });
  });

  // SUN HOURS
  const sunSlider = document.getElementById('sunHours');
  sunSlider.addEventListener('input', () => {
    state.sunHours = parseFloat(sunSlider.value);
    document.getElementById('sunHoursVal').textContent = state.sunHours;
    updateSlider();
  });

  document.querySelectorAll('.sun-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sun-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sunSlider.value = btn.dataset.h;
      state.sunHours = parseFloat(btn.dataset.h);
      document.getElementById('sunHoursVal').textContent = state.sunHours;
      updateSlider();
    });
  });

  // METER
  document.querySelectorAll('input[name="meter"]').forEach(inp => {
    inp.addEventListener('change', () => {
      state.meter = inp.value;
      document.getElementById('touHint').classList.toggle('hidden', state.meter !== 'tou');
    });
  });

  // ADD APPLIANCE BUTTONS
  document.querySelector('[data-cat="ac"]').addEventListener('click', () => {
    document.getElementById('acList').appendChild(createAcRow());
    updateTotalLoad();
  });

  // HEAVY ADD
  let heavyIdx = 0;
  document.querySelector('[data-cat="heavy"]').addEventListener('click', () => {
    const panel = document.createElement('div');
    panel.className = 'heavy-select-panel';
    panel.innerHTML = `<div style="padding:12px;background:var(--card2);border:1px solid var(--border);border-radius:10px;display:flex;flex-wrap:wrap;gap:8px;">
      ${HEAVY_PRESETS.map((p, i) => `<button class="add-app-btn" data-idx="${i}">${p.icon} ${p.name}</button>`).join('')}
    </div>`;
    const list = document.getElementById('heavyList');
    const existing = list.querySelector('.heavy-select-panel');
    if (existing) existing.remove();
    else {
      list.appendChild(panel);
      panel.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          list.appendChild(createHeavyRow(HEAVY_PRESETS[parseInt(btn.dataset.idx)]));
          panel.remove();
          updateTotalLoad();
        });
      });
    }
  });

  // AI PANEL
  document.getElementById('aiBtn').addEventListener('click', toggleAI);
  document.getElementById('aiClose').addEventListener('click', closeAI);
  document.getElementById('aiOverlay').addEventListener('click', closeAI);
  document.getElementById('aiSend').addEventListener('click', sendAIMessage);
  document.getElementById('aiInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendAIMessage();
  });

  // SETTINGS
  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsPanel').classList.toggle('open');
    document.getElementById('settingsOverlay').classList.toggle('show');
  });
  document.getElementById('settingsClose').addEventListener('click', () => {
    document.getElementById('settingsPanel').classList.remove('open');
    document.getElementById('settingsOverlay').classList.remove('show');
  });
  document.getElementById('settingsOverlay').addEventListener('click', () => {
    document.getElementById('settingsPanel').classList.remove('open');
    document.getElementById('settingsOverlay').classList.remove('show');
  });
  ['setPanelPrice','setInverterPrice','setLaborPrice','setBatteryPrice','setEfficiency'].forEach(id => {
    document.getElementById(id).addEventListener('input', saveSettings);
  });

  // RECALC
  document.getElementById('recalcBtn').addEventListener('click', () => {
    goToStep(1);
    document.querySelectorAll('.obj-card').forEach(c => c.classList.remove('selected'));
    state.objective = null;
    state.behavior = null;
    document.querySelectorAll('.beh-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('monthlyBill').value = '';
    document.getElementById('calcSection').scrollIntoView({ behavior: 'smooth' });
  });

  // EXPORT PDF
  document.getElementById('exportPdf').addEventListener('click', exportPDF);
}

function updateSlider() {
  const slider = document.getElementById('sunHours');
  const pct = ((slider.value - 3) / 3) * 100;
  slider.style.background = `linear-gradient(to right, var(--gold) ${pct}%, var(--border) ${pct}%)`;
}

// =================== STEP NAVIGATION ===================
function goToStep(n) {
  const current = state.step;
  // Update progress
  for (let i = 1; i <= 4; i++) {
    const item = document.querySelector(`.step-item[data-step="${i}"]`);
    const lines = document.querySelectorAll('.step-line');
    if (i < n) {
      item.classList.add('done');
      item.classList.remove('active');
    } else if (i === n) {
      item.classList.add('active');
      item.classList.remove('done');
    } else {
      item.classList.remove('active', 'done');
    }
    if (i <= n - 1 && lines[i-1]) lines[i-1].classList.add('done');
    else if (lines[i-1]) lines[i-1].classList.remove('done');
  }
  document.getElementById(`step${current}`).classList.remove('active');
  document.getElementById(`step${n}`).classList.add('active');
  state.step = n;
  document.getElementById('calcSection').scrollIntoView({ behavior: 'smooth' });
}

function shakeBtn(id) {
  const btn = document.getElementById(id);
  btn.style.animation = 'shake 0.4s ease';
  setTimeout(() => btn.style.animation = '', 400);
}

// =================== CALCULATION ENGINE ===================
function calculate() {
  loadSettings();

  // --- 1. เช็คมิเตอร์ TOU ---
  const meterSelect = document.getElementById('meterType');
  const meterType = meterSelect ? meterSelect.value : 'normal';
  
  // ใช้ค่าไฟ On-Peak (~5.8 บาท) สำหรับคำนวณความคุ้มค่าโซลาร์
  let calculationUnitPrice = state.unitPrice; 
  if (meterType === 'tou') {
    calculationUnitPrice = 5.8; 
  }

  // --- 2. คำนวณหน่วยไฟต่อวัน ---
  // ใช้ calculationUnitPrice เพื่อหาจำนวนหน่วยที่ใช้จริงจากค่าไฟ
  const unitsPerDay = state.monthlyBill / (calculationUnitPrice * 30);

  // คำนวณโหลดจากเครื่องใช้ไฟฟ้า
  let applianceWh = 0;
  document.querySelectorAll('.app-row').forEach(row => {
    applianceWh += getRowWatt(row);
  });
  const applianceUnits = applianceWh / 1000;

  // เลือกใช้ค่าที่เหมาะสมที่สุด
  const finalUnits = applianceUnits > 0.5 ? applianceUnits : unitsPerDay;
  const eff = state.settings.efficiency / 100;

  // --- 3. คำนวณขนาดระบบ ---
  const systemKwp = finalUnits / (state.sunHours * eff);
  let adjustedKwp = systemKwp;

  if (state.objective === 'save') {
    const dayRatio = state.behavior === 'night' ? 0.3 : (state.behavior === 'day' ? 0.65 : 0.5);
    adjustedKwp = systemKwp * dayRatio;
  } else if (state.objective === 'backup') {
    adjustedKwp = systemKwp * 0.5;
  }

  adjustedKwp = Math.max(0.5, adjustedKwp);
  const roundedKwp = Math.ceil(adjustedKwp * 2) / 2;

  // คำนวณแผงและพื้นที่
   // เปลี่ยนจากเลข 500 เดิม เป็น state.settings.panelWatt
  const panels = Math.ceil(roundedKwp * 1000 / state.settings.panelWatt);
  const roofArea = panels * 2.0;

  // --- 4. คำนวณค่าใช้จ่าย ---
  const costPanel = roundedKwp * state.settings.panelPrice;
  const costInverter = roundedKwp * state.settings.inverterPrice;
  const costLabor = roundedKwp * state.settings.laborPrice;

  let costBattery = 0;
  let batteryKwh = 0;
  if (state.objective === 'backup') {
    const backupW = state.backupAppliances.reduce((sum, w) => sum + w, 0) || 500;
    batteryKwh = (backupW * state.backupHours / 1000) * 1.3;
    costBattery = batteryKwh * state.settings.batteryPrice;
  } else if (state.objective === 'full') {
    batteryKwh = finalUnits * 0.4;
    costBattery = batteryKwh * state.settings.batteryPrice;
  }

  const costTotal = costPanel + costInverter + costLabor + costBattery;

  // --- 5. คำนวณเงินประหยัด (Saving) และจุดคืนทุน ---
  const dailyGen = roundedKwp * state.sunHours * eff;
  const monthlySaving = dailyGen * 30 * calculationUnitPrice;
  const yearlySaving = monthlySaving * 12;
  const paybackYears = yearlySaving > 0 ? costTotal / yearlySaving : 99;
  const profit20y = (yearlySaving * 20) - costTotal;

  // ผลกระทบสิ่งแวดล้อม
  const co2Year = (dailyGen * 365 * 0.4999) / 1000;
  const treesEq = Math.round(co2Year * 1000 / 21.77);

  // กำหนดชื่อประเภทระบบ
  let systemLabel = 'On-grid';
  if (state.objective === 'backup') systemLabel = 'Hybrid';
  else if (state.objective === 'full') systemLabel = 'Hybrid+';

  // --- 6. เก็บผลลัพธ์ลง State ---
  state.results = {
    kwp: roundedKwp,
    panels,
    roofArea,
    costPanel, costInverter, costLabor, costBattery, costTotal,
    monthlySaving, yearlySaving, paybackYears, profit20y,
    co2Year, treesEq,
    systemLabel,
    batteryKwh,
  };

  renderResults();
}
function renderResults() {
  const r = state.results;

  document.getElementById('recBadge').textContent = r.systemLabel;
  document.getElementById('recKw').textContent = r.kwp.toFixed(1);
  
  // --- แก้ไขจุดนี้: ให้แสดงขนาดวัตต์ที่ใช้คำนวณด้วย ---
  // เดิม: document.getElementById('recPanels').textContent = r.panels;
  
  // แบบใหม่: แสดงจำนวนแผง และระบุขนาดวัตต์ต่อแผงที่ดึงมาจาก Settings
  const panelElement = document.getElementById('recPanels');
if (panelElement) {
    // ใช้ .innerHTML = "" เพื่อล้างทุกอย่างทิ้งก่อน แล้วค่อยใส่ค่าใหม่ที่ถูกต้องเข้าไป
    panelElement.innerHTML = `${r.panels} <span style="font-size: 0.8rem; color: var(--text2); font-weight: normal;">แผง (${state.settings.panelWatt}W)</span>`;
}
  
  document.getElementById('roofArea').textContent = r.roofArea.toFixed(1);

  // ... (โค้ดส่วนอื่นๆ เหมือนเดิม) ...
  document.getElementById('costPanel').textContent = `฿${r.costPanel.toLocaleString()}`;
  document.getElementById('costInverter').textContent = `฿${r.costInverter.toLocaleString()}`;
  document.getElementById('costLabor').textContent = `฿${r.costLabor.toLocaleString()}`;
  document.getElementById('costTotal').textContent = `฿${r.costTotal.toLocaleString()}`;

  if (r.costBattery > 0) {
    document.getElementById('batteryCostRow')?.classList.remove('hidden');
    const batteryElem = document.getElementById('costBattery');
    if (batteryElem) batteryElem.textContent = `฿${r.costBattery.toLocaleString()} (${r.batteryKwh.toFixed(1)} kWh)`;
  }

  document.getElementById('monthlySavings').textContent = `฿${r.monthlySaving.toLocaleString('th', {maximumFractionDigits:0})}`;
  document.getElementById('paybackYears').textContent = r.paybackYears < 50 ? r.paybackYears.toFixed(1) : '>25';
  document.getElementById('profit20y').textContent = `฿${Math.max(0, r.profit20y).toLocaleString('th', {maximumFractionDigits:0})}`;

  document.getElementById('co2Year').textContent = r.co2Year.toFixed(2);
  document.getElementById('treesEq').textContent = r.treesEq.toLocaleString();

  // --- อัปเดตคำแนะนำเรื่องมิเตอร์ให้ถูกต้องตามหลักการที่เราคุยกัน ---
  const meterRec = document.getElementById('meterRecContent');
  if (meterRec) {
    if (state.meter === 'tou') {
      meterRec.innerHTML = `<div class="hint-box info">✅ <strong>มิเตอร์ TOU + Solar Cell:</strong> เป็นการจับคู่ที่ยอดเยี่ยม! โซลาร์จะช่วยลดค่าไฟในช่วง On-Peak (กลางวัน) ที่มีราคาแพงที่สุด (~5.8 บาท) ทำให้คุณคืนทุนเร็วขึ้นมาก</div>`;
    } else {
      meterRec.innerHTML = `<div class="hint-box warn">💡 <strong>มิเตอร์ปกติ:</strong> หากคุณมีพฤติกรรมใช้ไฟกลางคืนเยอะ หรือชาร์จรถ EV แนะนำให้เปลี่ยนเป็น <strong>มิเตอร์ TOU</strong> เพื่อรับอัตราค่าไฟที่ถูกลงในช่วงกลางคืน</div>`;
    }
  }

  renderChart();
}

function renderChart() {
  const r = state.results;
  const ctx = document.getElementById('breakEvenChart').getContext('2d');

  const years = Array.from({ length: 21 }, (_, i) => `ปีที่ ${i}`);
  const withoutSolar = years.map((_, i) => i * r.yearlySaving * -1); // cumulative cost
  const withSolar = years.map((_, i) => (i * r.yearlySaving) - r.costTotal);

  if (state.breakEvenChart) state.breakEvenChart.destroy();

  state.breakEvenChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          label: 'ติดโซลาร์ (กำไร/ขาดทุนสะสม)',
          data: withSolar,
          borderColor: '#FFD700',
          backgroundColor: 'rgba(255,215,0,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 2,
        },
        {
          label: 'ไม่ติดโซลาร์ (ค่าไฟสะสม)',
          data: withoutSolar,
          borderColor: '#ef5350',
          backgroundColor: 'rgba(239,83,80,0.06)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 2,
          borderDash: [6, 3],
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#9ab89a', font: { family: 'Prompt', size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ฿${ctx.parsed.y.toLocaleString('th', {maximumFractionDigits:0})}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#5a7a5a', font: { size: 10 }, maxRotation: 0 },
          grid: { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          ticks: {
            color: '#5a7a5a',
            font: { size: 10 },
            callback: v => `฿${(v/1000).toFixed(0)}K`
          },
          grid: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
  });
}

// =================== AI PANEL ===================
function toggleAI() {
  const panel = document.getElementById('aiPanel');
  const overlay = document.getElementById('aiOverlay');
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    closeAI();
  } else {
    panel.classList.add('open');
    overlay.classList.add('show');
    // Auto-greet if first time with results
    if (state.results && document.getElementById('aiMessages').children.length < 2) {
      addAIMessage(`ดูจากผลการคำนวณ คุณควรติดระบบขนาด ${state.results.kwp.toFixed(1)} kWp (${state.results.systemLabel}) มีอะไรสงสัยเพิ่มเติมไหมครับ? 🌞`, 'ai');
    }
  }
}

function closeAI() {
  document.getElementById('aiPanel').classList.remove('open');
  document.getElementById('aiOverlay').classList.remove('show');
}

function addAIMessage(text, role) {
  const msgs = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.innerHTML = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function sendAIMessage() {
  const input = document.getElementById('aiInput');
  const text = input.value.trim();
  if (!text) return;

  addAIMessage(text, 'user');
  input.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ai-msg ai loading';
  loadingDiv.textContent = '⏳ กำลังคิด...';
  document.getElementById('aiMessages').appendChild(loadingDiv);

  // --- แก้ไขตรงนี้: ใส่ Key ตรงๆ และใช้ URL ที่ถูกต้อง ---
  const API_KEY = 'AIzaSyDd4teci0Mynha-arnUnG6zjYPPjcjFkLA'; 
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `คุณคือ WiTSolarBot คำถามคือ: ${text}` }]
        }]
      })
    });

    const data = await response.json();
    loadingDiv.remove();

    if (data.candidates && data.candidates[0].content.parts[0].text) {
      addAIMessage(data.candidates[0].content.parts[0].text, 'ai');
    } else {
      // ถ้า Error จะโชว์ใน Console (F12) เพื่อให้เราเช็คสาเหตุได้
      console.error("AI Error:", data);
      addAIMessage('AI ปฏิเสธคำขอ ตรวจสอบหน้า Console (F12) นะครับ', 'ai');
    }
  } catch (e) {
    loadingDiv.remove();
    console.error("Fetch Error:", e);
    addAIMessage('เชื่อมต่อไม่ได้ ตรวจสอบ Internet นะครับ', 'ai');
  }
}

// =================== SETTINGS ===================
function saveSettings() {
  state.settings.panelPrice = parseFloat(document.getElementById('setPanelPrice').value);
  state.settings.inverterPrice = parseFloat(document.getElementById('setInverterPrice').value);
  state.settings.laborPrice = parseFloat(document.getElementById('setLaborPrice').value);
  state.settings.batteryPrice = parseFloat(document.getElementById('setBatteryPrice').value);
  state.settings.efficiency = parseFloat(document.getElementById('setEfficiency').value);
  
  // *** เพิ่มบรรทัดนี้: ดึงค่าจากช่องที่คุณกรอกขวาบน ***
  state.settings.panelWatt = parseFloat(document.getElementById('setPanelWatt').value) || 600;

  localStorage.setItem('witSolarSettings', JSON.stringify(state.settings));
  
  // ปิดหน้าต่างและคำนวณใหม่ทันที
  document.getElementById('settingsPanel').classList.remove('open');
  document.getElementById('settingsOverlay').classList.remove('active');
  calculate(); 
}

function loadSettings() {
  const saved = localStorage.getItem('witSolarSettings');
  if (saved) {
    Object.assign(state.settings, JSON.parse(saved));
    document.getElementById('setPanelPrice').value = state.settings.panelPrice;
    document.getElementById('setInverterPrice').value = state.settings.inverterPrice;
    document.getElementById('setLaborPrice').value = state.settings.laborPrice;
    document.getElementById('setBatteryPrice').value = state.settings.batteryPrice;
    document.getElementById('setEfficiency').value = state.settings.efficiency;
    // เพิ่มบรรทัดนี้เพื่อดึงค่าขนาดแผงมาใส่ในช่อง Input
    if(document.getElementById('setPanelWatt')) {
      document.getElementById('setPanelWatt').value = state.settings.panelWatt || 600;
    }
  }
}

// =================== EXPORT PDF ===================
async function exportPDF() {
  if (!state.results) return;
  const r = state.results;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });

  // 1. ดึงประเภทมิเตอร์มาโชว์ใน Report (เพิ่มความโปร)
  const meterSelect = document.getElementById('meterType');
  const meterName = meterSelect ? (meterSelect.value === 'tou' ? 'TOU Tariff' : 'Normal Tariff') : 'Normal Tariff';

  // Header Background
  doc.setFillColor(10, 15, 10);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setTextColor(255, 215, 0);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('WiTSolarCal', 20, 28);

  doc.setFontSize(10);
  doc.setTextColor(154, 184, 154);
  doc.text('Solar PV System Recommendation Report', 20, 36);
  doc.text(`Generated: ${new Date().toLocaleDateString('th-TH')} | Meter: ${meterName}`, 20, 42);

  // Divider
  doc.setDrawColor(255, 215, 0);
  doc.setLineWidth(0.5);
  doc.line(20, 47, 190, 47);

  // --- Section: Recommended System ---
  doc.setTextColor(255, 215, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommended System', 20, 58);

  doc.setTextColor(240, 245, 240);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  // แก้ไข: เปลี่ยนจาก 500W เป็นค่าจาก state.settings.panelWatt
  const sysData = [
  [`System Type`, r.systemLabel],
  [`System Size`, `${r.kwp.toFixed(1)} kWp`],
  // แก้บรรทัดนี้: ใช้ state.settings.panelWatt แทนการพิมพ์ 500W ค้างไว้
  [`Number of Panels`, `${r.panels} panels (${state.settings.panelWatt}W/panel)`],
  [`Required Roof Area`, `${r.roofArea.toFixed(1)} sq.m.`],
];

  let y = 66;
  sysData.forEach(([label, val]) => {
    doc.setTextColor(154, 184, 154);
    doc.text(label, 25, y);
    doc.setTextColor(240, 245, 240);
    doc.text(val, 110, y);
    y += 8;
  });

  // --- Section: Cost Estimate ---
  y += 6;
  doc.setTextColor(255, 215, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Cost Estimate', 20, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const costData = [
    ['Solar Panels', `THB ${r.costPanel.toLocaleString()}`],
    ['Inverter', `THB ${r.costInverter.toLocaleString()}`],
    r.costBattery > 0 ? ['Battery Storage', `THB ${r.costBattery.toLocaleString()}`] : null,
    ['Installation Labor', `THB ${r.costLabor.toLocaleString()}`],
    ['TOTAL ESTIMATE', `THB ${r.costTotal.toLocaleString()}`],
  ].filter(Boolean);

  costData.forEach(([label, val]) => {
    // ถ้าเป็นแถว Total ให้เปลี่ยนสีเป็นสีทองเข้ม
    if (label === 'TOTAL ESTIMATE') {
        doc.setTextColor(255, 215, 0);
        doc.setFont('helvetica', 'bold');
    } else {
        doc.setTextColor(154, 184, 154);
        doc.setFont('helvetica', 'normal');
    }
    doc.text(label, 25, y);
    doc.setTextColor(240, 245, 240);
    doc.text(val, 110, y);
    y += 8;
  });

  // --- Section: Financial Analysis ---
  y += 6;
  doc.setTextColor(255, 215, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Analysis', 20, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  // ตัวเลขตรงนี้จะถูกดึงมาจาก state.results ที่คำนวณ TOU มาแล้วโดยอัตโนมัติ
  const finData = [
    ['Monthly Savings', `THB ${r.monthlySaving.toLocaleString('th', {maximumFractionDigits:0})}`],
    ['Annual Savings', `THB ${r.yearlySaving.toLocaleString('th', {maximumFractionDigits:0})}`],
    ['Payback Period', `${r.paybackYears.toFixed(1)} years`],
    ['20-Year Net Profit', `THB ${Math.max(0, r.profit20y).toLocaleString('th', {maximumFractionDigits:0})}`],
  ];

  finData.forEach(([label, val]) => {
    doc.setTextColor(154, 184, 154);
    doc.text(label, 25, y);
    doc.setTextColor(240, 245, 240);
    doc.text(val, 110, y);
    y += 8;
  });

  // --- Section: Environmental ---
  y += 6;
  doc.setTextColor(67, 160, 71); // Green color
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Environmental Impact', 20, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  [
    ['CO2 Reduced per Year', `${r.co2Year.toFixed(2)} metric tons`],
    ['Equivalent Trees Planted', `${r.treesEq.toLocaleString()} trees`],
  ].forEach(([label, val]) => {
    doc.setTextColor(154, 184, 154);
    doc.text(label, 25, y);
    doc.setTextColor(240, 245, 240);
    doc.text(val, 110, y);
    y += 8;
  });

  // Footer
  doc.setTextColor(90, 122, 90);
  doc.setFontSize(8);
  doc.text('WiTSolarCal — Technical estimation based on selected meter type and solar irradiance in Thailand.', 20, 285);

  doc.save('WiTSolarCal_Report.pdf');
}

// =================== BACKUP APPLIANCE TRACKING ===================
document.addEventListener('change', e => {
  if (e.target.closest('.tag-check')) {
    const checked = document.querySelectorAll('.backup-appliances input[type="checkbox"]:checked');
    state.backupAppliances = Array.from(checked).map(c => parseFloat(c.dataset.w));
  }
});

// CSS Animation for shake
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
`;
document.head.appendChild(style);
