/**
 * ThermalPrintWindow - نظام طباعة حراري احترافي
 *
 * التنسيق المرجعي (ثابت في جميع المقاسات):
 * ┌─────────────────────────────────────┐
 * │ [شعار]    شركة ليبيا للخدمات المالية│
 * │           0920563695                │
 * ├─────────────────────────────────────┤
 * │         رقم المعاملة                │
 * │      A3F7-20260315-144523           │
 * ├──────────────────────┬──────────────┤
 * │ ████ Barcode ████    │  ▓▓ QR ▓▓   │
 * │ A3F7-20260315-144523 │             │
 * ├─────────────────────────────────────┤
 * │       محمد علي الورفلي              │
 * │           15/03/2026                │
 * └─────────────────────────────────────┘
 *
 * المعايير:
 * - QR: مكتبة qrcode الرسمية (ISO/IEC 18004)
 * - Barcode: CODE128 كامل (ISO/IEC 15417)
 * - transactionId: YYYYMMDD-HHMMSS-XXXX (فريد دائماً)
 */

import QRCode from 'qrcode';

export type ThermalSize =
  | '58x40' | '58x30' | '80x50' | '100x75'
  | '25x50' | '29x90' | '40x30' | '50x25' | '62x29';

export interface ThermalSizeOption {
  value: ThermalSize;
  label: string;
  width: number;   // mm
  height: number;  // mm
  category: string;
}

export const THERMAL_SIZES: ThermalSizeOption[] = [
  { value: '58x40',  label: '58 × 40 mm',  width: 58,  height: 40,  category: 'طابعات POS' },
  { value: '58x30',  label: '58 × 30 mm',  width: 58,  height: 30,  category: 'طابعات POS' },
  { value: '80x50',  label: '80 × 50 mm',  width: 80,  height: 50,  category: 'طابعات POS' },
  { value: '100x75', label: '100 × 75 mm', width: 100, height: 75,  category: 'ملصقات مستطيلة' },
  { value: '62x29',  label: '62 × 29 mm',  width: 62,  height: 29,  category: 'ملصقات مستطيلة' },
  { value: '25x50',  label: '25 × 50 mm',  width: 25,  height: 50,  category: 'ملصقات ضيقة' },
  { value: '29x90',  label: '29 × 90 mm',  width: 29,  height: 90,  category: 'ملصقات ضيقة' },
  { value: '40x30',  label: '40 × 30 mm',  width: 40,  height: 30,  category: 'ملصقات صغيرة' },
  { value: '50x25',  label: '50 × 25 mm',  width: 50,  height: 25,  category: 'ملصقات صغيرة' },
];

export interface ThermalPrintData {
  transactionId: string;
  customerName: string;
  cardNumber?: string;
  date?: string;
}

// ============================================================
// حساب نسب التنسيق — كل شيء نسبة من أبعاد الملصق
// التنسيق ثابت دائماً، فقط الأحجام تتغير بالتناسب
// ============================================================
function calcLayout(wMm: number, hMm: number) {
  const isPortrait = hMm > wMm;
  const minDim = Math.min(wMm, hMm);
  const area = wMm * hMm;

  // padding خارجي: 2% من أصغر بُعد
  const pad = Math.max(0.5, minDim * 0.025);

  // ارتفاع الرأس: 22% من الارتفاع
  const headerH = hMm * 0.22;

  // ارتفاع رقم المعاملة: 14% من الارتفاع
  const txnH = hMm * 0.14;

  // ارتفاع منطقة الأكواد: 46% من الارتفاع
  const codesH = hMm * 0.46;

  // ارتفاع التذييل: 14% من الارتفاع
  const footerH = hMm * 0.14;

  // للملصقات الضيقة (portrait) نعدل النسب
  const headerHFinal = isPortrait ? hMm * 0.18 : headerH;
  const txnHFinal    = isPortrait ? hMm * 0.12 : txnH;
  const codesHFinal  = isPortrait ? hMm * 0.52 : codesH;
  const footerHFinal = isPortrait ? hMm * 0.14 : footerH;

  // حجم الشعار: 85% من ارتفاع الرأس
  const logoMm = Math.min(headerHFinal * 0.85, wMm * 0.22);

  // حجم QR: مربع، 85% من ارتفاع منطقة الأكواد
  // في portrait: عرض الملصق - 4mm
  // في landscape: ~35% من عرض الملصق
  const qrMm = isPortrait
    ? Math.min(wMm - pad * 2, codesHFinal * 0.85)
    : Math.min(codesHFinal * 0.85, wMm * 0.32);

  // الباركود: في landscape يأخذ المساحة المتبقية
  const bcW = isPortrait ? wMm - pad * 2 : wMm - qrMm - pad * 3;
  const bcH = isPortrait ? codesHFinal * 0.4 : codesHFinal * 0.85;

  // أحجام الخطوط: نسبة من المساحة
  const fontSm  = Math.max(2.5, Math.min(5.5,  area / 250));
  const fontMd  = Math.max(3.5, Math.min(7.5,  area / 200));
  const fontLg  = Math.max(4.5, Math.min(9.5,  area / 160));
  const fontXl  = Math.max(5.5, Math.min(11.5, area / 130));

  return {
    pad, headerH: headerHFinal, txnH: txnHFinal,
    codesH: codesHFinal, footerH: footerHFinal,
    logoMm, qrMm, bcW, bcH,
    fontSm, fontMd, fontLg, fontXl,
    isPortrait,
  };
}

// ============================================================
// CODE128 — تشفير كامل حسب المعيار ISO/IEC 15417
// ============================================================
function generateCode128Svg(text: string, wMm: number, hMm: number): string {
  const CODE128B_START = 104;
  const CODE128_STOP   = 106;
  const PATTERNS: number[] = [
    0b11011001100,0b11001101100,0b11001100110,0b10010011000,0b10010001100,
    0b10001001100,0b10011001000,0b10011000100,0b10001100100,0b11001001000,
    0b11001000100,0b11000100100,0b10110011100,0b10011011100,0b10011001110,
    0b10111001100,0b10011101100,0b10011100110,0b11001110010,0b11001011100,
    0b11001001110,0b11011100100,0b11001110100,0b11101101110,0b11101001100,
    0b11100101100,0b11100100110,0b11101100100,0b11100110100,0b11100110010,
    0b11011011000,0b11011000110,0b11000110110,0b10100011000,0b10001011000,
    0b10001000110,0b10110001000,0b10001101000,0b10001100010,0b11010001000,
    0b11000101000,0b11000100010,0b10110111000,0b10110001110,0b10001101110,
    0b10111011000,0b10111000110,0b10001110110,0b11101110110,0b11010001110,
    0b11000101110,0b11011101000,0b11011100010,0b11011101110,0b11101011000,
    0b11101000110,0b11100010110,0b11101101000,0b11101100010,0b11100011010,
    0b11101111010,0b11001000010,0b11110001010,0b10100110000,0b10100001100,
    0b10010110000,0b10010000110,0b10000101100,0b10000100110,0b10110010000,
    0b10110000100,0b10011010000,0b10011000010,0b10000110100,0b10000110010,
    0b11000010010,0b11001010000,0b11110111010,0b11000010100,0b10001111010,
    0b10100111100,0b10010111100,0b10010011110,0b10111100100,0b10011110100,
    0b10011110010,0b11110100100,0b11110010100,0b11110010010,0b11011011110,
    0b11011110110,0b11110110110,0b10101111000,0b10100011110,0b10001011110,
    0b10111101000,0b10111100010,0b11110101000,0b11110100010,0b10111011110,
    0b10111101110,0b11101011110,0b11110101110,
    0b11010000100,0b11010010000,0b11010011110,
  ];
  const STOP_PATTERN = 0b1100011101011;

  const symbols: number[] = [CODE128B_START];
  let checksum = CODE128B_START;
  for (let i = 0; i < text.length; i++) {
    const code = Math.max(0, Math.min(94, text.charCodeAt(i) - 32));
    symbols.push(code);
    checksum += code * (i + 1);
  }
  symbols.push(checksum % 103);
  symbols.push(CODE128_STOP);

  const bits: boolean[] = [];
  for (let si = 0; si < symbols.length; si++) {
    const sym = symbols[si];
    const isStop = si === symbols.length - 1;
    const pattern = isStop ? STOP_PATTERN : PATTERNS[sym];
    const nbits = isStop ? 13 : 11;
    for (let b = nbits - 1; b >= 0; b--) {
      bits.push(((pattern >> b) & 1) === 1);
    }
  }

  const PX = 3.7795;
  const svgW = Math.round(wMm * PX);
  const svgH = Math.round(hMm * PX);
  const barH = Math.round(svgH * 0.80);
  const scale = svgW / bits.length;
  const fontSize = Math.max(4, Math.round(svgH * 0.16));

  let rects = '';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i]) {
      rects += `<rect x="${(i * scale).toFixed(2)}" y="0" width="${(scale + 0.4).toFixed(2)}" height="${barH}" fill="#000"/>`;
    }
  }
  const disp = text.length > 24 ? text.substring(0, 22) + '..' : text;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="${svgW}" height="${svgH}" fill="#fff"/>
  ${rects}
  <text x="${svgW / 2}" y="${svgH - 1}" text-anchor="middle" font-size="${fontSize}" font-family="'Courier New',monospace" fill="#000">${disp}</text>
</svg>`;
}

// ============================================================
// بناء HTML الملصق للطباعة الفعلية (بالـ mm الحقيقي)
// ============================================================
export async function buildLabelHtml(
  data: ThermalPrintData,
  sizeOption: ThermalSizeOption
): Promise<string> {
  const { width: w, height: h } = sizeOption;
  const { transactionId, customerName, date } = data;
  const L = calcLayout(w, h);

  // QR Code حقيقي (ISO/IEC 18004)
  const qrData = JSON.stringify({ txn: transactionId, name: customerName, date: date || '' });
  let qrSvg = '';
  try {
    qrSvg = await QRCode.toString(qrData, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  } catch {
    qrSvg = `<svg width="30" height="30" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="30" fill="#fff"/><text x="15" y="17" text-anchor="middle" font-size="5" fill="#f00">QR</text></svg>`;
  }

  // Barcode CODE128 حقيقي (ISO/IEC 15417)
  const bcSvg = generateCode128Svg(transactionId, L.bcW, L.bcH);

  const LOGO = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/bjCunNzkJAZLbySx.png';
  const displayDate = date || new Date().toLocaleDateString('ar-LY');

  // CSS مبني على mm حقيقي — كل شيء بنسبة ثابتة
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>ملصق - ${customerName}</title>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}mm;height:${h}mm;overflow:hidden;background:#fff;font-family:'Arial','Tahoma',sans-serif;direction:rtl}
@page{size:${w}mm ${h}mm;margin:0}

.label{
  width:${w}mm;height:${h}mm;
  padding:${L.pad}mm;
  display:flex;flex-direction:column;
  background:#fff;overflow:hidden;
}

/* ===== الرأس: شعار يسار + اسم الشركة يمين ===== */
.header{
  height:${L.headerH}mm;
  display:flex;flex-direction:row;
  align-items:center;justify-content:space-between;
  flex-shrink:0;gap:${L.pad * 0.5}mm;
}
.logo{
  width:${L.logoMm}mm;height:${L.logoMm}mm;
  object-fit:contain;flex-shrink:0;
}
.company{
  flex:1;text-align:right;overflow:hidden;
  display:flex;flex-direction:column;justify-content:center;
}
.company-name{
  font-size:${L.fontXl}pt;font-weight:900;color:#000;
  line-height:1.15;white-space:nowrap;overflow:hidden;
}
.company-phone{
  font-size:${L.fontSm}pt;color:#555;
  margin-top:${L.pad * 0.15}mm;white-space:nowrap;
}

/* ===== الفاصل ===== */
.divider{
  border:none;border-top:0.3mm solid #000;
  flex-shrink:0;margin:${L.pad * 0.25}mm 0;
}

/* ===== رقم المعاملة ===== */
.txn{
  height:${L.txnH}mm;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  flex-shrink:0;text-align:center;
}
.txn-label{font-size:${L.fontSm}pt;color:#666;line-height:1;}
.txn-num{
  font-size:${L.fontMd}pt;font-weight:900;
  font-family:'Courier New',monospace;color:#000;
  line-height:1.2;word-break:break-all;letter-spacing:0.3px;
}

/* ===== منطقة الأكواد: Barcode يسار + QR يمين ===== */
.codes{
  height:${L.codesH}mm;
  display:flex;
  flex-direction:${L.isPortrait ? 'column' : 'row'};
  align-items:center;justify-content:center;
  gap:${L.pad * 0.5}mm;
  flex-shrink:0;overflow:hidden;
}
.bc-block{
  display:flex;flex-direction:column;align-items:center;
  gap:${L.pad * 0.1}mm;
  ${L.isPortrait ? '' : 'flex:1;'}
}
.qr-block{
  display:flex;flex-direction:column;align-items:center;
  gap:${L.pad * 0.1}mm;flex-shrink:0;
}
.code-lbl{font-size:${L.fontSm}pt;color:#555;font-weight:bold;line-height:1;}

/* تحجيم QR */
.qr-block svg{
  width:${L.qrMm}mm !important;
  height:${L.qrMm}mm !important;
  display:block;
}
/* تحجيم Barcode */
.bc-block svg{
  width:${L.bcW}mm !important;
  height:${L.bcH}mm !important;
  display:block;
}

/* ===== التذييل: اسم الزبون + التاريخ ===== */
.footer{
  height:${L.footerH}mm;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  flex-shrink:0;text-align:center;
}
.cust-name{
  font-size:${L.fontLg}pt;font-weight:900;color:#000;
  line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  max-width:${w - L.pad * 2}mm;
}
.cust-date{font-size:${L.fontSm}pt;color:#555;line-height:1;}

@media print{
  html,body{width:${w}mm;height:${h}mm;}
  @page{size:${w}mm ${h}mm;margin:0;}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
}
</style>
</head>
<body>
<div class="label">

  <!-- الرأس: شعار يسار + اسم الشركة يمين -->
  <div class="header">
    <img class="logo" src="${LOGO}" alt="" onerror="this.style.display='none'"/>
    <div class="company">
      <div class="company-name">شركة ليبيا للخدمات المالية</div>
      <div class="company-phone">0920563695</div>
    </div>
  </div>

  <hr class="divider"/>

  <!-- رقم المعاملة -->
  <div class="txn">
    <div class="txn-label">رقم المعاملة</div>
    <div class="txn-num">${transactionId}</div>
  </div>

  <!-- Barcode يسار + QR يمين -->
  <div class="codes">
    ${L.isPortrait ? `
    <div class="qr-block">
      ${qrSvg}
      <span class="code-lbl">QR</span>
    </div>
    <div class="bc-block">
      ${bcSvg}
      <span class="code-lbl">Barcode</span>
    </div>
    ` : `
    <div class="bc-block">
      ${bcSvg}
      <span class="code-lbl">Barcode</span>
    </div>
    <div class="qr-block">
      ${qrSvg}
      <span class="code-lbl">QR</span>
    </div>
    `}
  </div>

  <hr class="divider"/>

  <!-- اسم الزبون + التاريخ -->
  <div class="footer">
    <div class="cust-name">${customerName}</div>
    <div class="cust-date">${displayDate}</div>
  </div>

</div>
<script>
  window.onload = function() { setTimeout(function(){ window.print(); }, 600); };
  window.onafterprint = function() { window.close(); };
<\/script>
</body>
</html>`;
}

// ============================================================
// نافذة مستقلة: اختيار المقاس + معاينة حقيقية + طباعة
// ============================================================
export async function openThermalPrintWindow(
  data: ThermalPrintData,
  initialSize?: ThermalSizeOption
): Promise<void> {
  const defaultSize = initialSize || THERMAL_SIZES[0];
  const sizesJson   = JSON.stringify(THERMAL_SIZES);
  const dataJson    = JSON.stringify(data);

  const windowHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>طباعة ملصق - ${data.customerName}</title>
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{background:#1a1a2e;color:#eee;font-family:Arial,Tahoma,sans-serif;direction:rtl;min-height:100vh;display:flex;flex-direction:column}

    .toolbar{background:#16213e;border-bottom:2px solid #C9A34D;padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .toolbar-title{font-size:14px;font-weight:bold;color:#C9A34D;margin-left:auto}
    .size-groups{display:flex;flex-wrap:wrap;gap:6px;flex:1}
    .size-group{display:flex;flex-direction:column;gap:3px}
    .size-group-label{font-size:9px;color:#888;text-align:center}
    .size-btns{display:flex;gap:3px}
    .size-btn{background:#0f3460;border:1px solid #333;color:#ccc;padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;white-space:nowrap;transition:all .15s}
    .size-btn:hover{background:#1a4a7a;border-color:#C9A34D}
    .size-btn.active{background:#C9A34D;color:#000;border-color:#C9A34D;font-weight:bold}
    .print-btn{background:#C9A34D;color:#000;border:none;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;flex-shrink:0}
    .print-btn:hover{background:#e0b85a}

    .preview-area{flex:1;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto}
    .iframe-wrapper{box-shadow:0 4px 24px rgba(0,0,0,0.6);border:1px solid #444;border-radius:2px;overflow:hidden;background:#fff;transition:all .2s}
    iframe{display:block;border:none;background:#fff}

    .size-info{background:#0f3460;padding:6px 16px;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #333}
  </style>
</head>
<body>

<div class="toolbar">
  <div class="size-groups" id="size-groups"></div>
  <button class="print-btn" onclick="doPrint()">🖨️ طباعة</button>
  <div class="toolbar-title">ملصق: ${data.customerName}</div>
</div>

<div class="preview-area">
  <div class="iframe-wrapper" id="iframe-wrapper">
    <iframe id="label-iframe" scrolling="no"></iframe>
  </div>
</div>

<div class="size-info" id="size-info">جاري التحميل...</div>

<script>
const SIZES = ${sizesJson};
const DATA  = ${dataJson};
let currentSize = SIZES.find(s => s.value === '${defaultSize.value}') || SIZES[0];

// ===== حساب نسب التنسيق (نفس منطق TypeScript) =====
function calcLayout(wMm, hMm) {
  const isPortrait = hMm > wMm;
  const minDim = Math.min(wMm, hMm);
  const area = wMm * hMm;
  const pad = Math.max(0.5, minDim * 0.025);
  const headerH = isPortrait ? hMm * 0.18 : hMm * 0.22;
  const txnH    = isPortrait ? hMm * 0.12 : hMm * 0.14;
  const codesH  = isPortrait ? hMm * 0.52 : hMm * 0.46;
  const footerH = isPortrait ? hMm * 0.14 : hMm * 0.14;
  const logoMm  = Math.min(headerH * 0.85, wMm * 0.22);
  const qrMm    = isPortrait
    ? Math.min(wMm - pad * 2, codesH * 0.85)
    : Math.min(codesH * 0.85, wMm * 0.32);
  const bcW = isPortrait ? wMm - pad * 2 : wMm - qrMm - pad * 3;
  const bcH = isPortrait ? codesH * 0.4  : codesH * 0.85;
  const fontSm = Math.max(2.5, Math.min(5.5,  area / 250));
  const fontMd = Math.max(3.5, Math.min(7.5,  area / 200));
  const fontLg = Math.max(4.5, Math.min(9.5,  area / 160));
  const fontXl = Math.max(5.5, Math.min(11.5, area / 130));
  return { pad, headerH, txnH, codesH, footerH, logoMm, qrMm, bcW, bcH, fontSm, fontMd, fontLg, fontXl, isPortrait };
}

// ===== CODE128 حقيقي =====
function code128Svg(text, wMm, hMm, ZOOM) {
  const CODE128B_START=104, CODE128_STOP=106;
  const PATTERNS=[0b11011001100,0b11001101100,0b11001100110,0b10010011000,0b10010001100,0b10001001100,0b10011001000,0b10011000100,0b10001100100,0b11001001000,0b11001000100,0b11000100100,0b10110011100,0b10011011100,0b10011001110,0b10111001100,0b10011101100,0b10011100110,0b11001110010,0b11001011100,0b11001001110,0b11011100100,0b11001110100,0b11101101110,0b11101001100,0b11100101100,0b11100100110,0b11101100100,0b11100110100,0b11100110010,0b11011011000,0b11011000110,0b11000110110,0b10100011000,0b10001011000,0b10001000110,0b10110001000,0b10001101000,0b10001100010,0b11010001000,0b11000101000,0b11000100010,0b10110111000,0b10110001110,0b10001101110,0b10111011000,0b10111000110,0b10001110110,0b11101110110,0b11010001110,0b11000101110,0b11011101000,0b11011100010,0b11011101110,0b11101011000,0b11101000110,0b11100010110,0b11101101000,0b11101100010,0b11100011010,0b11101111010,0b11001000010,0b11110001010,0b10100110000,0b10100001100,0b10010110000,0b10010000110,0b10000101100,0b10000100110,0b10110010000,0b10110000100,0b10011010000,0b10011000010,0b10000110100,0b10000110010,0b11000010010,0b11001010000,0b11110111010,0b11000010100,0b10001111010,0b10100111100,0b10010111100,0b10010011110,0b10111100100,0b10011110100,0b10011110010,0b11110100100,0b11110010100,0b11110010010,0b11011011110,0b11011110110,0b11110110110,0b10101111000,0b10100011110,0b10001011110,0b10111101000,0b10111100010,0b11110101000,0b11110100010,0b10111011110,0b10111101110,0b11101011110,0b11110101110,0b11010000100,0b11010010000,0b11010011110];
  const STOP_PATTERN=0b1100011101011;
  const syms=[CODE128B_START]; let cs=CODE128B_START;
  for(let i=0;i<text.length;i++){const c=Math.max(0,Math.min(94,text.charCodeAt(i)-32));syms.push(c);cs+=c*(i+1);}
  syms.push(cs%103);syms.push(CODE128_STOP);
  const bits=[];
  for(let si=0;si<syms.length;si++){const sym=syms[si];const isStop=si===syms.length-1;const pat=isStop?STOP_PATTERN:PATTERNS[sym];const nb=isStop?13:11;for(let b=nb-1;b>=0;b--)bits.push(((pat>>b)&1)===1);}
  const PX=3.7795*ZOOM; const svgW=Math.round(wMm*PX); const svgH=Math.round(hMm*PX);
  const barH=Math.round(svgH*0.80); const scale=svgW/bits.length; const fs=Math.max(4,Math.round(svgH*0.16));
  let rects='';
  for(let i=0;i<bits.length;i++){if(bits[i])rects+='<rect x="'+(i*scale).toFixed(2)+'" y="0" width="'+(scale+0.4).toFixed(2)+'" height="'+barH+'" fill="#000"/>';}
  const disp=text.length>24?text.substring(0,22)+'..':text;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+svgW+'" height="'+svgH+'" viewBox="0 0 '+svgW+' '+svgH+'"><rect width="'+svgW+'" height="'+svgH+'" fill="#fff"/>'+rects+'<text x="'+(svgW/2)+'" y="'+(svgH-1)+'" text-anchor="middle" font-size="'+fs+'" font-family="Courier New,monospace" fill="#000">'+disp+'</text></svg>';
}

// ===== تحميل مكتبة QR =====
function loadQRLib(){
  return new Promise(res=>{
    if(window.QRCode){res();return;}
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload=res; s.onerror=res;
    document.head.appendChild(s);
  });
}

// ===== بناء HTML المعاينة (بزوم 3x) =====
async function buildPreviewHtml(sz) {
  const ZOOM=3, PX=3.7795;
  const w=sz.width, h=sz.height;
  const L=calcLayout(w,h);
  const LOGO='https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/bjCunNzkJAZLbySx.png';
  const { transactionId, customerName, date } = DATA;
  const displayDate = date || new Date().toLocaleDateString('ar-LY');

  // QR
  let qrHtml='';
  try {
    await loadQRLib();
    if(window.QRCode){
      const tmp=document.createElement('div'); tmp.style.display='none'; document.body.appendChild(tmp);
      const qrPx=Math.round(L.qrMm*PX*ZOOM);
      await new Promise(res=>{
        new window.QRCode(tmp,{text:JSON.stringify({txn:transactionId,name:customerName,date:date||''}),width:qrPx,height:qrPx,colorDark:'#000',colorLight:'#fff',correctLevel:window.QRCode.CorrectLevel.H});
        setTimeout(res,250);
      });
      const canvas=tmp.querySelector('canvas');
      if(canvas) qrHtml='<img src="'+canvas.toDataURL('image/png')+'" style="width:'+(L.qrMm*ZOOM*PX)+'px;height:'+(L.qrMm*ZOOM*PX)+'px;display:block"/>';
      document.body.removeChild(tmp);
    }
  } catch(e){}
  if(!qrHtml) qrHtml='<div style="width:'+(L.qrMm*PX*ZOOM)+'px;height:'+(L.qrMm*PX*ZOOM)+'px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999">QR</div>';

  // Barcode
  const bcSvg=code128Svg(transactionId, L.bcW, L.bcH, ZOOM);

  // CSS بالـ px (zoom 3x)
  const Z=ZOOM*PX;
  const css=\`
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html,body{width:\${Math.round(w*Z)}px;height:\${Math.round(h*Z)}px;overflow:hidden;background:#fff;font-family:Arial,Tahoma,sans-serif;direction:rtl}
    .label{width:\${Math.round(w*Z)}px;height:\${Math.round(h*Z)}px;padding:\${Math.round(L.pad*Z)}px;display:flex;flex-direction:column;background:#fff;overflow:hidden}
    .header{height:\${Math.round(L.headerH*Z)}px;display:flex;flex-direction:row;align-items:center;justify-content:space-between;flex-shrink:0;gap:\${Math.round(L.pad*0.5*Z)}px}
    .logo{width:\${Math.round(L.logoMm*Z)}px;height:\${Math.round(L.logoMm*Z)}px;object-fit:contain;flex-shrink:0}
    .company{flex:1;text-align:right;overflow:hidden;display:flex;flex-direction:column;justify-content:center}
    .company-name{font-size:\${(L.fontXl*ZOOM*0.75).toFixed(1)}px;font-weight:900;color:#000;line-height:1.15;white-space:nowrap;overflow:hidden}
    .company-phone{font-size:\${(L.fontSm*ZOOM*0.75).toFixed(1)}px;color:#555;margin-top:\${Math.round(L.pad*0.15*Z)}px;white-space:nowrap}
    .divider{border:none;border-top:1px solid #000;flex-shrink:0;margin:\${Math.round(L.pad*0.25*Z)}px 0}
    .txn{height:\${Math.round(L.txnH*Z)}px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;text-align:center}
    .txn-label{font-size:\${(L.fontSm*ZOOM*0.75).toFixed(1)}px;color:#666;line-height:1}
    .txn-num{font-size:\${(L.fontMd*ZOOM*0.75).toFixed(1)}px;font-weight:900;font-family:Courier New,monospace;color:#000;line-height:1.2;word-break:break-all;letter-spacing:0.3px}
    .codes{height:\${Math.round(L.codesH*Z)}px;display:flex;flex-direction:\${L.isPortrait?'column':'row'};align-items:center;justify-content:center;gap:\${Math.round(L.pad*0.5*Z)}px;flex-shrink:0;overflow:hidden}
    .bc-block{display:flex;flex-direction:column;align-items:center;gap:\${Math.round(L.pad*0.1*Z)}px;\${L.isPortrait?'':'flex:1;'}}
    .qr-block{display:flex;flex-direction:column;align-items:center;gap:\${Math.round(L.pad*0.1*Z)}px;flex-shrink:0}
    .code-lbl{font-size:\${(L.fontSm*ZOOM*0.75).toFixed(1)}px;color:#555;font-weight:bold;line-height:1}
    .qr-block img,.qr-block svg{width:\${Math.round(L.qrMm*Z)}px !important;height:\${Math.round(L.qrMm*Z)}px !important;display:block}
    .bc-block svg{width:\${Math.round(L.bcW*Z)}px !important;height:\${Math.round(L.bcH*Z)}px !important;display:block}
    .footer{height:\${Math.round(L.footerH*Z)}px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;text-align:center}
    .cust-name{font-size:\${(L.fontLg*ZOOM*0.75).toFixed(1)}px;font-weight:900;color:#000;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:\${Math.round((w-L.pad*2)*Z)}px}
    .cust-date{font-size:\${(L.fontSm*ZOOM*0.75).toFixed(1)}px;color:#555;line-height:1}
  \`;

  const codesHtml = L.isPortrait
    ? \`<div class="qr-block">\${qrHtml}<span class="code-lbl">QR</span></div><div class="bc-block">\${bcSvg}<span class="code-lbl">Barcode</span></div>\`
    : \`<div class="bc-block">\${bcSvg}<span class="code-lbl">Barcode</span></div><div class="qr-block">\${qrHtml}<span class="code-lbl">QR</span></div>\`;

  return '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>'+css+'</style></head><body>'
    +'<div class="label">'
    +'<div class="header"><img class="logo" src="'+LOGO+'" onerror="this.style.display=\'none\'"/><div class="company"><div class="company-name">شركة ليبيا للخدمات المالية</div><div class="company-phone">0920563695</div></div></div>'
    +'<hr class="divider"/>'
    +'<div class="txn"><div class="txn-label">رقم المعاملة</div><div class="txn-num">'+transactionId+'</div></div>'
    +'<div class="codes">'+codesHtml+'</div>'
    +'<hr class="divider"/>'
    +'<div class="footer"><div class="cust-name">'+customerName+'</div><div class="cust-date">'+displayDate+'</div></div>'
    +'</div></body></html>';
}

// ===== عرض الملصق في iframe =====
async function renderLabel() {
  const sz=currentSize;
  const ZOOM=3, PX=3.7795;
  const pw=Math.round(sz.width*PX*ZOOM);
  const ph=Math.round(sz.height*PX*ZOOM);
  const iframe=document.getElementById('label-iframe');
  const wrapper=document.getElementById('iframe-wrapper');
  iframe.style.width=pw+'px'; iframe.style.height=ph+'px';
  wrapper.style.width=pw+'px'; wrapper.style.height=ph+'px';
  document.getElementById('size-info').textContent=sz.label+' — معاينة بزوم 3x';
  const html=await buildPreviewHtml(sz);
  const blob=new Blob([html],{type:'text/html'});
  iframe.src=URL.createObjectURL(blob);
}

// ===== طباعة: نافذة بالمقاس الصحيح =====
async function doPrint() {
  const sz=currentSize;
  const pw=Math.round(sz.width*5); const ph=Math.round(sz.height*5);
  const win=window.open('','_blank','width='+pw+',height='+ph);
  if(!win){alert('يرجى السماح بفتح النوافذ المنبثقة');return;}
  const { transactionId, customerName, date } = DATA;
  const L=calcLayout(sz.width,sz.height);
  const LOGO='https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/bjCunNzkJAZLbySx.png';
  const displayDate=date||new Date().toLocaleDateString('ar-LY');
  const w=sz.width, h=sz.height;

  // Barcode
  const bcSvg=code128Svg(transactionId,L.bcW,L.bcH,1);

  const codesPlaceholder=L.isPortrait
    ?'<div class="qr-block">QR_PLACEHOLDER<span class="code-lbl">QR</span></div><div class="bc-block">'+bcSvg+'<span class="code-lbl">Barcode</span></div>'
    :'<div class="bc-block">'+bcSvg+'<span class="code-lbl">Barcode</span></div><div class="qr-block">QR_PLACEHOLDER<span class="code-lbl">QR</span></div>';

  let printHtml='<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}html,body{width:'+w+'mm;height:'+h+'mm;overflow:hidden;background:#fff;font-family:Arial,Tahoma,sans-serif;direction:rtl}@page{size:'+w+'mm '+h+'mm;margin:0}.label{width:'+w+'mm;height:'+h+'mm;padding:'+L.pad+'mm;display:flex;flex-direction:column;background:#fff;overflow:hidden}.header{height:'+L.headerH+'mm;display:flex;flex-direction:row;align-items:center;justify-content:space-between;flex-shrink:0;gap:'+(L.pad*0.5)+'mm}.logo{width:'+L.logoMm+'mm;height:'+L.logoMm+'mm;object-fit:contain;flex-shrink:0}.company{flex:1;text-align:right;overflow:hidden;display:flex;flex-direction:column;justify-content:center}.company-name{font-size:'+L.fontXl+'pt;font-weight:900;color:#000;line-height:1.15;white-space:nowrap;overflow:hidden}.company-phone{font-size:'+L.fontSm+'pt;color:#555;margin-top:'+(L.pad*0.15)+'mm;white-space:nowrap}.divider{border:none;border-top:.3mm solid #000;flex-shrink:0;margin:'+(L.pad*0.25)+'mm 0}.txn{height:'+L.txnH+'mm;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;text-align:center}.txn-label{font-size:'+L.fontSm+'pt;color:#666;line-height:1}.txn-num{font-size:'+L.fontMd+'pt;font-weight:900;font-family:Courier New,monospace;color:#000;line-height:1.2;word-break:break-all}.codes{height:'+L.codesH+'mm;display:flex;flex-direction:'+(L.isPortrait?'column':'row')+';align-items:center;justify-content:center;gap:'+(L.pad*0.5)+'mm;flex-shrink:0;overflow:hidden}.bc-block{display:flex;flex-direction:column;align-items:center;gap:'+(L.pad*0.1)+'mm;'+(L.isPortrait?'':'flex:1;')+'}.qr-block{display:flex;flex-direction:column;align-items:center;gap:'+(L.pad*0.1)+'mm;flex-shrink:0}.code-lbl{font-size:'+L.fontSm+'pt;color:#555;font-weight:bold;line-height:1}.qr-block img,.qr-block svg{width:'+L.qrMm+'mm !important;height:'+L.qrMm+'mm !important;display:block}.bc-block svg{width:'+L.bcW+'mm !important;height:'+L.bcH+'mm !important;display:block}.footer{height:'+L.footerH+'mm;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;text-align:center}.cust-name{font-size:'+L.fontLg+'pt;font-weight:900;color:#000;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cust-date{font-size:'+L.fontSm+'pt;color:#555;line-height:1}@media print{html,body{width:'+w+'mm;height:'+h+'mm}@page{size:'+w+'mm '+h+'mm;margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="label"><div class="header"><img class="logo" src="'+LOGO+'" onerror="this.style.display=\'none\'"/><div class="company"><div class="company-name">شركة ليبيا للخدمات المالية</div><div class="company-phone">0920563695</div></div></div><hr class="divider"/><div class="txn"><div class="txn-label">رقم المعاملة</div><div class="txn-num">'+transactionId+'</div></div><div class="codes">'+codesPlaceholder+'</div><hr class="divider"/><div class="footer"><div class="cust-name">'+customerName+'</div><div class="cust-date">'+displayDate+'</div></div></div><script>window.onload=function(){setTimeout(function(){window.print();},600)};window.onafterprint=function(){window.close()};<\/script></body></html>';

  // QR حقيقي
  await loadQRLib();
  if(window.QRCode){
    const tmp=document.createElement('div');tmp.style.display='none';document.body.appendChild(tmp);
    const qrPx=Math.round(L.qrMm*3.7795);
    await new Promise(res=>{
      new window.QRCode(tmp,{text:JSON.stringify({txn:transactionId,name:customerName,date:date||''}),width:qrPx,height:qrPx,colorDark:'#000',colorLight:'#fff',correctLevel:window.QRCode.CorrectLevel.H});
      setTimeout(res,300);
    });
    const canvas=tmp.querySelector('canvas');
    if(canvas) printHtml=printHtml.replace('QR_PLACEHOLDER','<img src="'+canvas.toDataURL('image/png')+'" style="width:'+L.qrMm+'mm;height:'+L.qrMm+'mm;display:block"/>');
    document.body.removeChild(tmp);
  }

  win.document.write(printHtml);
  win.document.close();
}

// ===== بناء أزرار المقاسات =====
function buildSizeControls(){
  const container=document.getElementById('size-groups');
  const groups={};
  SIZES.forEach(s=>{if(!groups[s.category])groups[s.category]=[];groups[s.category].push(s);});
  Object.entries(groups).forEach(([cat,sizes])=>{
    const grp=document.createElement('div');grp.className='size-group';
    grp.innerHTML='<div class="size-group-label">'+cat+'</div>';
    const btns=document.createElement('div');btns.className='size-btns';
    sizes.forEach(sz=>{
      const btn=document.createElement('button');
      btn.className='size-btn'+(sz.value===currentSize.value?' active':'');
      btn.textContent=sz.label;
      btn.onclick=()=>{
        document.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');currentSize=sz;renderLabel();
      };
      btns.appendChild(btn);
    });
    grp.appendChild(btns);container.appendChild(grp);
  });
}

buildSizeControls();
renderLabel();
<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1000,height=700');
  if (!win) {
    alert('يرجى السماح بفتح النوافذ المنبثقة في المتصفح للطباعة');
    return;
  }
  win.document.write(windowHtml);
  win.document.close();
}
