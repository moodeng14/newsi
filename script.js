/* ==========================================================================
   SI Physics Unit Converter — script.js
   ระบบแปลงหน่วยฟิสิกส์ตามมาตรฐาน SI พร้อมคำอุปสรรค (Prefix)
   ลำดับการใช้งาน: เลือกปริมาณ (View 1) -> เลือกหน่วยและแปลง (View 2)
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   1) ข้อมูลคำอุปสรรค SI (SI_PREFIXES)
   จำกัดช่วงไว้ที่ เอกซะ (Exa, 10^18) ถึง อัตโต (Atto, 10^-18) ตามที่ต้องการ
   key = สัญลักษณ์ของ prefix, factor = ตัวคูณเทียบกับหน่วยฐาน (10^n)
   -------------------------------------------------------------------------- */
const SI_PREFIXES = {
  E:  { th: 'เอกซะ',  en: 'exa',   factor: 1e18 },
  P:  { th: 'เพตะ',   en: 'peta',  factor: 1e15 },
  T:  { th: 'เทระ',   en: 'tera',  factor: 1e12 },
  G:  { th: 'กิกะ',   en: 'giga',  factor: 1e9  },
  M:  { th: 'เมกะ',   en: 'mega',  factor: 1e6  },
  k:  { th: 'กิโล',   en: 'kilo',  factor: 1e3  },
  h:  { th: 'เฮกโต',  en: 'hecto', factor: 1e2  },
  da: { th: 'เดคา',   en: 'deca',  factor: 1e1  },
  '': { th: 'หน่วยฐาน', en: 'base', factor: 1  },
  d:  { th: 'เดซิ',   en: 'deci',  factor: 1e-1 },
  c:  { th: 'เซนติ',  en: 'centi', factor: 1e-2 },
  m:  { th: 'มิลลิ',  en: 'milli', factor: 1e-3 },
  'µ':{ th: 'ไมโคร',  en: 'micro', factor: 1e-6 },
  n:  { th: 'นาโน',   en: 'nano',  factor: 1e-9 },
  p:  { th: 'พิโก',   en: 'pico',  factor: 1e-12 },
  f:  { th: 'เฟมโต',  en: 'femto', factor: 1e-15 },
  a:  { th: 'อัตโต',  en: 'atto',  factor: 1e-18 },
};

/* ลำดับการแสดงผลตาราง prefix จากมากไปน้อย (Exa -> Atto) */
const PREFIX_ORDER = ['E','P','T','G','M','k','h','da','','d','c','m','µ','n','p','f','a'];
const USABLE_PREFIX_KEYS = Object.keys(SI_PREFIXES);

/* --------------------------------------------------------------------------
   2) หน่วยฐาน SI ที่สามารถเติมคำอุปสรรคได้ (Prefixable base units)
   ครอบคลุมหน่วยฐาน SI ทั้ง 7 + หน่วยอนุพันธ์ SI ที่มีชื่อเฉพาะ
   -------------------------------------------------------------------------- */
const PREFIXABLE_BASES = [
  { sym: 'm',   th: 'เมตร',      en: 'meter',   cat: 'length' },
  { sym: 'g',   th: 'กรัม',      en: 'gram',    cat: 'mass' },
  { sym: 's',   th: 'วินาที',    en: 'second',  cat: 'time' },
  { sym: 'A',   th: 'แอมแปร์',   en: 'ampere',  cat: 'current' },
  { sym: 'mol', th: 'โมล',       en: 'mole',    cat: 'amount' },
  { sym: 'cd',  th: 'แคนเดลา',   en: 'candela', cat: 'luminous' },
  { sym: 'Hz',  th: 'เฮิรตซ์',   en: 'hertz',   cat: 'frequency' },
  { sym: 'N',   th: 'นิวตัน',    en: 'newton',  cat: 'force' },
  { sym: 'Pa',  th: 'ปาสคาล',    en: 'pascal',  cat: 'pressure' },
  { sym: 'J',   th: 'จูล',       en: 'joule',   cat: 'energy' },
  { sym: 'W',   th: 'วัตต์',     en: 'watt',    cat: 'power' },
  { sym: 'C',   th: 'คูลอมบ์',   en: 'coulomb', cat: 'charge' },
  { sym: 'V',   th: 'โวลต์',     en: 'volt',    cat: 'voltage' },
  { sym: 'Ω',   th: 'โอห์ม',     en: 'ohm',     cat: 'resistance' },
];

/* --------------------------------------------------------------------------
   3) สร้างรายการหน่วยจากหน่วยฐาน + คำอุปสรรค โดยอัตโนมัติ
   factor คือค่าตัวคูณเทียบกับหน่วยฐาน (ไม่มี prefix) ของ "สัญลักษณ์ราก" นั้น ๆ
   -------------------------------------------------------------------------- */
function generateUnitsForBase(base) {
  return USABLE_PREFIX_KEYS.map((pk) => {
    const prefix = SI_PREFIXES[pk];
    const symbol = pk + base.sym;
    const nameTh = pk === '' ? base.th : prefix.th + base.th;
    const nameEn = pk === '' ? base.en : prefix.en + base.en;
    return {
      value: symbol,
      symbol,
      nameTh,
      nameEn,
      factor: prefix.factor,
    };
  });
}

/* --------------------------------------------------------------------------
   4) รวมหน่วยทั้งหมดตามประเภท (UNITS)
   ใช้เฉพาะหน่วยที่อยู่ในระบบ SI จริง ๆ เท่านั้น (ไม่ใส่หน่วยนอกระบบ เช่น ลิตร ชั่วโมง ไร่)
   หน่วยอนุพันธ์ประกอบ (พื้นที่ / ปริมาตร / ความเร็ว / ความเร่ง / อุณหภูมิ)
   สร้างจากหน่วยฐาน SI ล้วน ๆ ด้วยคำอุปสรรคชุดเดียวกัน
   -------------------------------------------------------------------------- */
const UNITS = {};

PREFIXABLE_BASES.forEach((base) => {
  UNITS[base.cat] = generateUnitsForBase(base);
});

/* อุณหภูมิ: หน่วย SI คือเคลวิน ส่วนองศาเซลเซียสเป็นหน่วยที่ยอมรับให้ใช้คู่กับ SI
   ใช้ระบบแปลงเฉพาะ (มี offset) ไม่ใช้คำอุปสรรค */
UNITS.temperature = [
  { value: 'C', symbol: '°C', nameTh: 'องศาเซลเซียส', nameEn: 'Celsius', special: 'temp' },
  { value: 'K', symbol: 'K',  nameTh: 'เคลวิน',        nameEn: 'Kelvin',  special: 'temp' },
];

/* พื้นที่ (m² และหน่วยเติมคำอุปสรรคของเมตร ยกกำลังสอง) */
UNITS.area = [
  { value: 'km2', symbol: 'km²', nameTh: 'ตารางกิโลเมตร',   nameEn: 'square kilometer',  factor: 1e6 },
  { value: 'm2',  symbol: 'm²',  nameTh: 'ตารางเมตร',       nameEn: 'square meter',      factor: 1 },
  { value: 'dm2', symbol: 'dm²', nameTh: 'ตารางเดซิเมตร',   nameEn: 'square decimeter',  factor: 1e-2 },
  { value: 'cm2', symbol: 'cm²', nameTh: 'ตารางเซนติเมตร',  nameEn: 'square centimeter', factor: 1e-4 },
  { value: 'mm2', symbol: 'mm²', nameTh: 'ตารางมิลลิเมตร',  nameEn: 'square millimeter', factor: 1e-6 },
];

/* ปริมาตร (m³ และหน่วยเติมคำอุปสรรคของเมตร ยกกำลังสาม) */
UNITS.volume = [
  { value: 'km3', symbol: 'km³', nameTh: 'ลูกบาศก์กิโลเมตร',  nameEn: 'cubic kilometer',  factor: 1e9 },
  { value: 'm3',  symbol: 'm³',  nameTh: 'ลูกบาศก์เมตร',      nameEn: 'cubic meter',      factor: 1 },
  { value: 'dm3', symbol: 'dm³', nameTh: 'ลูกบาศก์เดซิเมตร',  nameEn: 'cubic decimeter',  factor: 1e-3 },
  { value: 'cm3', symbol: 'cm³', nameTh: 'ลูกบาศก์เซนติเมตร', nameEn: 'cubic centimeter', factor: 1e-6 },
  { value: 'mm3', symbol: 'mm³', nameTh: 'ลูกบาศก์มิลลิเมตร', nameEn: 'cubic millimeter', factor: 1e-9 },
];

/* ความเร็ว (m/s ตามระบบ SI ล้วน ไม่ใช้ km/h เพราะชั่วโมงไม่ใช่หน่วย SI) */
UNITS.speed = [
  { value: 'kmps', symbol: 'km/s', nameTh: 'กิโลเมตรต่อวินาที',  nameEn: 'km per second',    factor: 1000 },
  { value: 'mps',  symbol: 'm/s',  nameTh: 'เมตรต่อวินาที',      nameEn: 'meter per second', factor: 1 },
  { value: 'cmps', symbol: 'cm/s', nameTh: 'เซนติเมตรต่อวินาที', nameEn: 'cm per second',    factor: 0.01 },
  { value: 'mmps', symbol: 'mm/s', nameTh: 'มิลลิเมตรต่อวินาที', nameEn: 'mm per second',    factor: 0.001 },
];

/* ความเร่ง (m/s²) */
UNITS.acceleration = [
  { value: 'kmps2', symbol: 'km/s²', nameTh: 'กิโลเมตรต่อวินาที²',  nameEn: 'km per s²', factor: 1000 },
  { value: 'mps2',  symbol: 'm/s²',  nameTh: 'เมตรต่อวินาที²',      nameEn: 'm per s²',  factor: 1 },
  { value: 'cmps2', symbol: 'cm/s²', nameTh: 'เซนติเมตรต่อวินาที²', nameEn: 'cm per s²', factor: 0.01 },
  { value: 'mmps2', symbol: 'mm/s²', nameTh: 'มิลลิเมตรต่อวินาที²', nameEn: 'mm per s²', factor: 0.001 },
];

/* --------------------------------------------------------------------------
   5) ข้อมูลประเภทหน่วย (ไอคอน + ชื่อภาษาไทย/อังกฤษ) สำหรับหน้าเลือกปริมาณ
   -------------------------------------------------------------------------- */
const CATEGORY_META = [
  { key: 'length',       icon: '📏', th: 'ความยาว',              en: 'Length' },
  { key: 'mass',         icon: '⚖️', th: 'มวล',                  en: 'Mass' },
  { key: 'time',         icon: '⏱️', th: 'เวลา',                 en: 'Time' },
  { key: 'current',      icon: '⚡', th: 'กระแสไฟฟ้า',           en: 'Electric current' },
  { key: 'temperature',  icon: '🌡️', th: 'อุณหภูมิ',             en: 'Temperature' },
  { key: 'amount',       icon: '🧪', th: 'ปริมาณสาร',            en: 'Amount of substance' },
  { key: 'luminous',     icon: '💡', th: 'ความเข้มการส่องสว่าง', en: 'Luminous intensity' },
  { key: 'area',         icon: '📐', th: 'พื้นที่',               en: 'Area' },
  { key: 'volume',       icon: '📦', th: 'ปริมาตร',               en: 'Volume' },
  { key: 'speed',        icon: '🚗', th: 'ความเร็ว',              en: 'Speed' },
  { key: 'acceleration', icon: '🏃', th: 'ความเร่ง',              en: 'Acceleration' },
  { key: 'force',        icon: '💪', th: 'แรง',                  en: 'Force' },
  { key: 'energy',       icon: '🔥', th: 'พลังงาน',               en: 'Energy' },
  { key: 'power',        icon: '⚡', th: 'กำลัง',                 en: 'Power' },
  { key: 'pressure',     icon: '🔵', th: 'ความดัน',               en: 'Pressure' },
  { key: 'frequency',    icon: '〰️', th: 'ความถี่',               en: 'Frequency' },
  { key: 'charge',       icon: '🔋', th: 'ประจุไฟฟ้า',            en: 'Electric charge' },
  { key: 'voltage',      icon: '🔌', th: 'แรงดันไฟฟ้า',           en: 'Voltage' },
  { key: 'resistance',   icon: '🔧', th: 'ความต้านทานไฟฟ้า',      en: 'Resistance' },
];

/* ตัวอย่างการแปลงหน่วยที่แสดงในหน้าแปลงหน่วยของแต่ละปริมาณ */
const EXAMPLES = [
  { label: '10 km → m',  category: 'length', amount: 10, from: 'km', to: 'm' },
  { label: '1 m → cm',   category: 'length', amount: 1,  from: 'm',  to: 'cm' },
  { label: '1 m → mm',   category: 'length', amount: 1,  from: 'm',  to: 'mm' },
  { label: '5 cm → m',   category: 'length', amount: 5,  from: 'cm', to: 'm' },
  { label: '2 Mm → km',  category: 'length', amount: 2,  from: 'Mm', to: 'km' },
  { label: '1 kg → g',   category: 'mass',   amount: 1,  from: 'kg', to: 'g' },
  { label: '1 g → mg',   category: 'mass',   amount: 1,  from: 'g',  to: 'mg' },
  { label: '1 MHz → Hz', category: 'frequency', amount: 1, from: 'MHz', to: 'Hz' },
  { label: '0 °C → K',   category: 'temperature', amount: 0, from: 'C', to: 'K' },
  { label: '1 kN → N',   category: 'force',  amount: 1,  from: 'kN', to: 'N' },
  { label: '1 kJ → J',   category: 'energy', amount: 1,  from: 'kJ', to: 'J' },
  { label: '1 kW → W',   category: 'power',  amount: 1,  from: 'kW', to: 'W' },
  { label: '1 kPa → Pa', category: 'pressure', amount: 1, from: 'kPa', to: 'Pa' },
  { label: '1 m² → cm²', category: 'area',   amount: 1,  from: 'm2', to: 'cm2' },
  { label: '1 m³ → dm³', category: 'volume', amount: 1,  from: 'm3', to: 'dm3' },
  { label: '1 km/s → m/s', category: 'speed', amount: 1, from: 'kmps', to: 'mps' },
];

/* --------------------------------------------------------------------------
   6) State
   -------------------------------------------------------------------------- */
let currentCategory = null;
const HISTORY_KEY = 'si_converter_history';
const THEME_KEY = 'si_converter_theme';
const MAX_HISTORY = 12;

/* --------------------------------------------------------------------------
   7) DOM references
   -------------------------------------------------------------------------- */
const homeView = document.getElementById('homeView');
const converterView = document.getElementById('converterView');
const categoryGrid = document.getElementById('categoryGrid');
const backBtn = document.getElementById('backBtn');
const convIcon = document.getElementById('convIcon');
const convTitleTh = document.getElementById('convTitleTh');
const convTitleEn = document.getElementById('convTitleEn');

const fromUnitSelect = document.getElementById('fromUnit');
const toUnitSelect = document.getElementById('toUnit');
const amountInput = document.getElementById('amountInput');
const inputError = document.getElementById('inputError');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const swapBtn = document.getElementById('swapBtn');
const resultBox = document.getElementById('resultBox');
const resultMain = document.getElementById('resultMain');
const stepsBox = document.getElementById('stepsBox');
const stepsList = document.getElementById('stepsList');
const copyBtn = document.getElementById('copyBtn');
const copyStatus = document.getElementById('copyStatus');
const examplesGrid = document.getElementById('examplesGrid');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const prefixTableBody = document.querySelector('#prefixTable tbody');
const darkModeToggle = document.getElementById('darkModeToggle');
const themeIcon = document.getElementById('themeIcon');
const sciModeToggle = document.getElementById('sciModeToggle');
const devToggle = document.getElementById('devToggle');
const devModalOverlay = document.getElementById('devModalOverlay');
const devModalClose = document.getElementById('devModalClose');

/* --------------------------------------------------------------------------
   8) ฟังก์ชันแปลงหน่วย (Conversion Engine)
   -------------------------------------------------------------------------- */

/* แปลงอุณหภูมิ (มีค่า offset จึงต้องคำนวณแยกจากระบบ prefix เชิงเส้นปกติ) */
function convertTemperature(value, fromKey, toKey) {
  let kelvin;
  if (fromKey === 'C') kelvin = value + 273.15;
  else kelvin = value; // K

  if (toKey === 'C') return kelvin - 273.15;
  return kelvin;
}

/* แปลงหน่วยทั่วไปโดยอิงหน่วยฐานของหมวดหมู่ (factor เทียบกับหน่วยฐาน) */
function convertUnit(value, fromValue, toValue, category) {
  if (category === 'temperature') {
    return convertTemperature(value, fromValue, toValue);
  }
  const units = UNITS[category];
  const fromUnit = units.find((u) => u.value === fromValue);
  const toUnit = units.find((u) => u.value === toValue);
  const baseValue = value * fromUnit.factor;
  return baseValue / toUnit.factor;
}

/* --------------------------------------------------------------------------
   9) จัดรูปแบบตัวเลขให้อ่านง่าย
   -------------------------------------------------------------------------- */
function formatNumber(num) {
  if (!isFinite(num)) return 'ไม่สามารถคำนวณได้';
  if (num === 0) return '0';

  const abs = Math.abs(num);

  if (abs >= 1e15 || (abs < 1e-6 && abs > 0)) {
    const exp = num.toExponential(4).replace(/e([+-])(\d+)/, (m, sign, digits) => {
      const supDigits = digits.replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
      return ` × 10${sign === '-' ? '⁻' : ''}${supDigits}`;
    });
    return exp.replace(/(\.\d*?)0+( ×|$)/, '$1$2').replace(/\.( ×|$)/, '$1');
  }

  if (Number.isInteger(num)) {
    return num.toLocaleString('en-US');
  }

  let rounded = parseFloat(num.toFixed(6));
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/* --------------------------------------------------------------------------
   9.1) จัดรูปแบบตัวเลขเป็น "เลขสัญกรณ์วิทยาศาสตร์" (Scientific Notation) เสมอ
   ใช้เมื่อผู้ใช้เปิดสวิตช์ 🔬 บนหน้าแปลงหน่วย — ใช้ได้กับทุกปริมาณ
   -------------------------------------------------------------------------- */
function toScientific(num, digits = 4) {
  if (!isFinite(num)) return 'ไม่สามารถคำนวณได้';
  if (num === 0) return '0 × 10⁰';
  const exp = num.toExponential(digits).replace(/e([+-])(\d+)/, (m, sign, expDigits) => {
    const supDigits = expDigits.replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
    return ` × 10${sign === '-' ? '⁻' : ''}${supDigits}`;
  });
  return exp.replace(/(\.\d*?)0+( ×|$)/, '$1$2').replace(/\.( ×|$)/, '$1');
}

/* เลือกรูปแบบการแสดงผลตัวเลข ตามสถานะสวิตช์เลขสัญกรณ์วิทยาศาสตร์ */
function displayNumber(num) {
  if (sciModeToggle && sciModeToggle.checked) return toScientific(num);
  return formatNumber(num);
}

/* --------------------------------------------------------------------------
   10) ตรวจสอบความถูกต้องของข้อมูล
   -------------------------------------------------------------------------- */
function validateAmount(raw) {
  if (raw.trim() === '') return { valid: false };
  const num = Number(raw);
  if (Number.isNaN(num)) return { valid: false };
  if (!isFinite(num)) return { valid: false };
  return { valid: true, value: num };
}

/* --------------------------------------------------------------------------
   11) หน้าเลือกปริมาณ (View 1) — สร้างการ์ดของแต่ละประเภทหน่วย
   -------------------------------------------------------------------------- */
function renderCategoryGrid() {
  categoryGrid.innerHTML = CATEGORY_META.map(
    (c) => `
      <button type="button" class="category-card" role="listitem" data-key="${c.key}" aria-label="เลือกปริมาณ ${c.th}">
        <span class="category-icon" aria-hidden="true">${c.icon}</span>
        <span class="category-th">${c.th}</span>
        <span class="category-en">${c.en}</span>
      </button>`
  ).join('');

  categoryGrid.querySelectorAll('.category-card').forEach((btn) => {
    btn.addEventListener('click', () => goToConverter(btn.dataset.key));
  });
}

/* --------------------------------------------------------------------------
   12) สลับหน้า (View Navigation)
   -------------------------------------------------------------------------- */
function goToConverter(categoryKey) {
  currentCategory = categoryKey;
  const meta = CATEGORY_META.find((c) => c.key === categoryKey);

  convIcon.textContent = meta.icon;
  convTitleTh.textContent = meta.th;
  convTitleEn.textContent = meta.en;

  renderUnitOptions();
  renderExamples();
  clearConverter();

  homeView.hidden = true;
  converterView.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToHome() {
  homeView.hidden = false;
  converterView.hidden = true;
  currentCategory = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --------------------------------------------------------------------------
   13) เติมตัวเลือกหน่วยต้นทาง/ปลายทาง ตามปริมาณที่เลือก
   -------------------------------------------------------------------------- */
function unitLabel(u) {
  return `${u.nameTh} (${u.symbol})`;
}

function renderUnitOptions() {
  const units = UNITS[currentCategory];
  const optionsHtml = units.map((u) => `<option value="${u.value}">${unitLabel(u)}</option>`).join('');
  fromUnitSelect.innerHTML = optionsHtml;
  toUnitSelect.innerHTML = optionsHtml;

  fromUnitSelect.selectedIndex = 0;
  toUnitSelect.selectedIndex = units.length > 1 ? 1 : 0;
}

/* --------------------------------------------------------------------------
   14) สลับหน่วยต้นทาง <-> ปลายทาง
   -------------------------------------------------------------------------- */
function swapUnits() {
  const fromVal = fromUnitSelect.value;
  const toVal = toUnitSelect.value;
  fromUnitSelect.value = toVal;
  toUnitSelect.value = fromVal;
  if (resultMain.textContent) performConversion();
}

/* --------------------------------------------------------------------------
   15) ล้างข้อมูลทั้งหมดในเครื่องคำนวณ
   -------------------------------------------------------------------------- */
function clearConverter() {
  amountInput.value = '';
  inputError.hidden = true;
  hideResult();
}

function hideResult() {
  resultBox.hidden = true;
  stepsBox.hidden = true;
  copyStatus.textContent = '';
}

/* --------------------------------------------------------------------------
   16) สร้างข้อความ "วิธีทำ" แบบเป็นขั้นตอน
   -------------------------------------------------------------------------- */
function showCalculation(amount, fromUnit, toUnit, result) {
  stepsList.innerHTML = '';
  const steps = [];

  if (currentCategory === 'temperature') {
    if (fromUnit.value === toUnit.value) {
      steps.push(`${fromUnit.symbol} และ ${toUnit.symbol} เป็นหน่วยเดียวกัน จึงมีค่าเท่าเดิม`);
    } else if (fromUnit.value === 'C' && toUnit.value === 'K') {
      steps.push('สูตร: K = °C + 273.15');
      steps.push(`K = ${amount} + 273.15`);
      steps.push(`K = ${displayNumber(result)} K`);
    } else {
      steps.push('สูตร: °C = K − 273.15');
      steps.push(`°C = ${amount} − 273.15`);
      steps.push(`°C = ${displayNumber(result)} °C`);
    }
  } else {
    const fFrom = fromUnit.factor;
    const fTo = toUnit.factor;
    const baseValue = amount * fFrom;
    const rootSymbol = rootUnitSymbol();

    steps.push(`1 ${fromUnit.symbol} = ${formatNumber(fFrom)} ${rootSymbol}`);
    steps.push(`${amount} ${fromUnit.symbol} = ${amount} × ${formatNumber(fFrom)} = ${formatNumber(baseValue)} ${rootSymbol}`);
    steps.push(`แปลงเป็น ${toUnit.symbol}: ${formatNumber(baseValue)} ÷ ${formatNumber(fTo)} = ${displayNumber(result)} ${toUnit.symbol}`);
  }

  steps.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    stepsList.appendChild(li);
  });

  stepsBox.hidden = false;
}

/* หาสัญลักษณ์หน่วยฐาน (ไม่มี prefix) ของหมวดปัจจุบัน สำหรับใช้อธิบายวิธีทำ */
function rootUnitSymbol() {
  const units = UNITS[currentCategory];
  const baseUnit = units.find((u) => u.factor === 1);
  return baseUnit ? baseUnit.symbol : units[0].symbol;
}

/* --------------------------------------------------------------------------
   17) ฟังก์ชันหลัก: ทำการแปลงหน่วยเมื่อกดปุ่ม "แปลงหน่วย"
   -------------------------------------------------------------------------- */
function performConversion() {
  const raw = amountInput.value;
  const check = validateAmount(raw);

  if (!check.valid) {
    inputError.hidden = false;
    hideResult();
    return;
  }
  inputError.hidden = true;

  const amount = check.value;
  const units = UNITS[currentCategory];
  const fromUnit = units.find((u) => u.value === fromUnitSelect.value);
  const toUnit = units.find((u) => u.value === toUnitSelect.value);

  const result = convertUnit(amount, fromUnit.value, toUnit.value, currentCategory);

  resultMain.textContent = `${displayNumber(amount)} ${fromUnit.symbol} = ${displayNumber(result)} ${toUnit.symbol}`;
  resultBox.hidden = false;

  showCalculation(amount, fromUnit, toUnit, result);

  const meta = CATEGORY_META.find((c) => c.key === currentCategory);
  saveHistory(`${displayNumber(amount)} ${fromUnit.symbol} → ${displayNumber(result)} ${toUnit.symbol}`, `${meta.icon} ${meta.th}`);
}

/* --------------------------------------------------------------------------
   18) ประวัติการคำนวณ (localStorage) — เก็บรวมทุกปริมาณ แสดงในหน้าเลือกปริมาณ
   -------------------------------------------------------------------------- */
function loadHistory() {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (e) {
    history = [];
  }
  renderHistory(history);
  return history;
}

function saveHistory(text, catLabel) {
  const history = loadHistory();
  history.unshift({
    text,
    cat: catLabel,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
  });
  const trimmed = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  renderHistory(trimmed);
}

function renderHistory(history) {
  if (!history || history.length === 0) {
    historyList.innerHTML = '<li class="history-empty">ยังไม่มีประวัติการคำนวณ</li>';
    return;
  }
  historyList.innerHTML = history
    .map(
      (h) =>
        `<li>
          <span>${h.text}<br><span class="history-cat">${h.cat || ''}</span></span>
          <span class="history-time">${h.time || ''}</span>
        </li>`
    )
    .join('');
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory([]);
}

/* --------------------------------------------------------------------------
   19) ตาราง SI Prefix (Exa -> Atto)
   -------------------------------------------------------------------------- */
function renderPrefixTable() {
  prefixTableBody.innerHTML = PREFIX_ORDER.map((key) => {
    const p = SI_PREFIXES[key];
    const isBase = key === '';
    const rowClass = isBase ? ' class="row-base"' : '';
    const prefixCell = isBase ? '—' : key;
    const nameCell = isBase ? 'หน่วยฐาน' : `${p.en} (${p.th})`;
    const symbolCell = isBase ? '—' : key;
    const expo = Math.log10(p.factor);
    const factorCell = `10<sup>${expo}</sup>`;
    return `<tr${rowClass}>
      <td>${prefixCell}</td>
      <td>${nameCell}</td>
      <td>${symbolCell}</td>
      <td>${factorCell}</td>
    </tr>`;
  }).join('');
}

/* --------------------------------------------------------------------------
   20) ตัวอย่างการแปลงหน่วย ของปริมาณที่กำลังเลือกอยู่ (คลิกแล้วเติมค่าให้อัตโนมัติ)
   -------------------------------------------------------------------------- */
function renderExamples() {
  const list = EXAMPLES.filter((ex) => ex.category === currentCategory);

  if (list.length === 0) {
    examplesGrid.innerHTML = '<p class="examples-empty">ยังไม่มีตัวอย่างสำหรับปริมาณนี้ ลองกรอกค่าด้วยตัวเองได้เลย</p>';
    return;
  }

  examplesGrid.innerHTML = list
    .map((ex, i) => `<button type="button" class="example-chip" data-index="${i}">${ex.label}</button>`)
    .join('');

  examplesGrid.querySelectorAll('.example-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ex = list[Number(btn.dataset.index)];
      fromUnitSelect.value = ex.from;
      toUnitSelect.value = ex.to;
      amountInput.value = ex.amount;
      performConversion();
    });
  });
}

/* --------------------------------------------------------------------------
   21) หน้าต่างข้อมูลผู้พัฒนา (Developer Modal)
   -------------------------------------------------------------------------- */
function openDevModal() {
  devModalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  devModalClose.focus();
}

function closeDevModal() {
  devModalOverlay.hidden = true;
  document.body.style.overflow = '';
  devToggle.focus();
}

/* --------------------------------------------------------------------------
   22) คัดลอกผลลัพธ์
   -------------------------------------------------------------------------- */
function copyResult() {
  const text = resultMain.textContent;
  if (!text) return;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      copyStatus.textContent = 'คัดลอกแล้ว ✓';
      setTimeout(() => (copyStatus.textContent = ''), 2200);
    })
    .catch(() => {
      copyStatus.textContent = 'คัดลอกไม่สำเร็จ';
    });
}

/* --------------------------------------------------------------------------
   23) Dark Mode
   -------------------------------------------------------------------------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

/* --------------------------------------------------------------------------
   24) ผูก Event Listeners ทั้งหมด
   -------------------------------------------------------------------------- */
function bindEvents() {
  backBtn.addEventListener('click', goToHome);
  convertBtn.addEventListener('click', performConversion);
  clearBtn.addEventListener('click', clearConverter);
  swapBtn.addEventListener('click', swapUnits);
  copyBtn.addEventListener('click', copyResult);
  clearHistoryBtn.addEventListener('click', clearHistory);
  darkModeToggle.addEventListener('click', toggleTheme);

  amountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performConversion();
  });

  /* สวิตช์เลขสัญกรณ์วิทยาศาสตร์: ถ้ามีผลลัพธ์อยู่แล้ว ให้คำนวณใหม่ทันทีเพื่ออัปเดตรูปแบบ */
  sciModeToggle.addEventListener('change', () => {
    if (!resultBox.hidden) performConversion();
  });

  /* หน้าต่างผู้พัฒนา: เปิด/ปิดด้วยปุ่ม, คลิกฉากหลัง, หรือกด Esc */
  devToggle.addEventListener('click', openDevModal);
  devModalClose.addEventListener('click', closeDevModal);
  devModalOverlay.addEventListener('click', (e) => {
    if (e.target === devModalOverlay) closeDevModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !devModalOverlay.hidden) closeDevModal();
  });
}

/* --------------------------------------------------------------------------
   25) เริ่มต้นแอปพลิเคชัน
   -------------------------------------------------------------------------- */
function init() {
  initTheme();
  renderCategoryGrid();
  renderPrefixTable();
  loadHistory();
  bindEvents();
  goToHome();
}

document.addEventListener('DOMContentLoaded', init);
