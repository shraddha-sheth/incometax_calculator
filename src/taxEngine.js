// ═══════════════════════════════════════════════════════════════════
// Indian Income Tax Calculator — Engine
// Supports FY 2024-25 and FY 2025-26
// ═══════════════════════════════════════════════════════════════════

// ─── FY-wise Tax Slab Constants ──────────────────────────────────
const SLABS = {
  "2024-25": {
    old: {
      below60: [
        { min: 0, max: 250000, rate: 0 },
        { min: 250000, max: 500000, rate: 0.05 },
        { min: 500000, max: 1000000, rate: 0.2 },
        { min: 1000000, max: Infinity, rate: 0.3 },
      ],
      "60to80": [
        { min: 0, max: 300000, rate: 0 },
        { min: 300000, max: 500000, rate: 0.05 },
        { min: 500000, max: 1000000, rate: 0.2 },
        { min: 1000000, max: Infinity, rate: 0.3 },
      ],
      above80: [
        { min: 0, max: 500000, rate: 0 },
        { min: 500000, max: 1000000, rate: 0.2 },
        { min: 1000000, max: Infinity, rate: 0.3 },
      ],
    },
    new: [
      { min: 0, max: 300000, rate: 0 },
      { min: 300000, max: 600000, rate: 0.05 },
      { min: 600000, max: 900000, rate: 0.1 },
      { min: 900000, max: 1200000, rate: 0.15 },
      { min: 1200000, max: 1500000, rate: 0.2 },
      { min: 1500000, max: Infinity, rate: 0.3 },
    ],
    standardDeduction: 50000,
    rebateOld: { limit: 500000, amount: 12500 },
    rebateNew: { limit: 700000, amount: 25000 },
  },
  "2025-26": {
    old: {
      below60: [
        { min: 0, max: 250000, rate: 0 },
        { min: 250000, max: 500000, rate: 0.05 },
        { min: 500000, max: 1000000, rate: 0.2 },
        { min: 1000000, max: Infinity, rate: 0.3 },
      ],
      "60to80": [
        { min: 0, max: 300000, rate: 0 },
        { min: 300000, max: 500000, rate: 0.05 },
        { min: 500000, max: 1000000, rate: 0.2 },
        { min: 1000000, max: Infinity, rate: 0.3 },
      ],
      above80: [
        { min: 0, max: 500000, rate: 0 },
        { min: 500000, max: 1000000, rate: 0.2 },
        { min: 1000000, max: Infinity, rate: 0.3 },
      ],
    },
    new: [
      { min: 0, max: 400000, rate: 0 },
      { min: 400000, max: 800000, rate: 0.05 },
      { min: 800000, max: 1200000, rate: 0.1 },
      { min: 1200000, max: 1600000, rate: 0.15 },
      { min: 1600000, max: 2000000, rate: 0.2 },
      { min: 2000000, max: 2400000, rate: 0.25 },
      { min: 2400000, max: Infinity, rate: 0.3 },
    ],
    standardDeduction: 75000,
    rebateOld: { limit: 500000, amount: 12500 },
    rebateNew: { limit: 1200000, amount: 60000 },
  },
};

// ─── Surcharge Tiers ─────────────────────────────────────────────
const SURCHARGE_OLD = [
  { min: 0, max: 5000000, rate: 0 },
  { min: 5000000, max: 10000000, rate: 0.1 },
  { min: 10000000, max: 20000000, rate: 0.15 },
  { min: 20000000, max: 50000000, rate: 0.25 },
  { min: 50000000, max: Infinity, rate: 0.37 },
];
const SURCHARGE_NEW = [
  { min: 0, max: 5000000, rate: 0 },
  { min: 5000000, max: 10000000, rate: 0.1 },
  { min: 10000000, max: 20000000, rate: 0.15 },
  { min: 20000000, max: Infinity, rate: 0.25 },
];

// ─── CII Data ────────────────────────────────────────────────────
export const CII_DATA = {
  "2001-02": 100, "2002-03": 105, "2003-04": 109, "2004-05": 113,
  "2005-06": 117, "2006-07": 122, "2007-08": 129, "2008-09": 137,
  "2009-10": 148, "2010-11": 167, "2011-12": 184, "2012-13": 200,
  "2013-14": 220, "2014-15": 240, "2015-16": 254, "2016-17": 264,
  "2017-18": 272, "2018-19": 280, "2019-20": 289, "2020-21": 301,
  "2021-22": 317, "2022-23": 331, "2023-24": 348, "2024-25": 363,
  "2025-26": 377,
};

// ─── Default Values ──────────────────────────────────────────────
export const DEFAULT_VALUES = {
  fy: "2024-25", age: "below60", residential: "resident",
  residentialSubType: "ordinary",
  basicSalary: 0, hraReceived: 0, rentPaid: 0, metro: "metro",
  otherAllowances: 0, perquisites: 0,
  rentalIncome: 0, homeLoanInterest: 0, propertyTax: 0,
  businessIncome: 0, stcg: 0, ltcg: 0,
  interestIncome: 0, otherSources: 0,
  sec80c: 0, sec80ccd1b: 0, sec80d: 0, sec80e: 0, sec80g: 0, sec80tta: 0,
  freelancerMode: false, grossReceipts: 0, profession44ADA: false,
  digitalReceipts: 0, cashReceipts: 0,
};

export const SECTION_80C_ITEMS = [
  "PPF (Public Provident Fund)", "ELSS (Equity Linked Savings Scheme)",
  "Life Insurance Premium (LIC)", "National Savings Certificate (NSC)",
  "5-Year Fixed Deposit", "Sukanya Samriddhi Yojana",
  "Senior Citizens Savings Scheme", "Tuition Fees (max 2 children)",
  "Home Loan Principal Repayment", "Employee Provident Fund (EPF)",
];

export const fmt = (n) => Math.round(n).toLocaleString("en-IN");

// ─── Core Helpers ────────────────────────────────────────────────
function calcSlabTax(income, slabs) {
  let tax = 0, rem = income;
  for (const s of slabs) {
    const t = Math.min(rem, s.max - s.min);
    if (t <= 0) break;
    tax += t * s.rate;
    rem -= t;
  }
  return tax;
}

function getSurchargeRate(income, tiers) {
  let rate = 0;
  for (const t of tiers) { if (income > t.min) rate = t.rate; }
  return rate;
}

function calcSurchargeWithRelief(income, baseTax, regime) {
  const tiers = regime === "new" ? SURCHARGE_NEW : SURCHARGE_OLD;
  const rate = getSurchargeRate(income, tiers);
  if (rate === 0) return { surcharge: 0, marginalRelief: 0 };

  const surcharge = baseTax * rate;
  let relief = 0;

  // Marginal relief check at each threshold
  const thresholds = regime === "new" ? [5000000, 10000000, 20000000] : [5000000, 10000000, 20000000, 50000000];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    const th = thresholds[i];
    if (income > th) {
      const prevRate = i > 0 ? getSurchargeRate(th, tiers) : 0;
      const taxAtThreshold = calcSlabTax(th, regime === "new" ? SLABS["2024-25"].new : SLABS["2024-25"].old.below60);
      const surchargeAtThreshold = taxAtThreshold * prevRate;
      const totalAtThreshold = taxAtThreshold + surchargeAtThreshold;
      const excess = income - th;
      const totalWithSurcharge = baseTax + surcharge;
      if (totalWithSurcharge > totalAtThreshold + excess) {
        relief = totalWithSurcharge - (totalAtThreshold + excess);
      }
      break;
    }
  }

  return {
    surcharge: Math.round(Math.max(0, surcharge - relief)),
    marginalRelief: Math.round(relief),
  };
}

// ─── Presumptive Taxation ────────────────────────────────────────
export function calcPresumptiveIncome(v) {
  if (!v.freelancerMode) return 0;
  if (v.profession44ADA) return Math.round(v.grossReceipts * 0.5);
  return Math.round((v.digitalReceipts || 0) * 0.06 + (v.cashReceipts || 0) * 0.08);
}

// ─── Main Tax Computation ────────────────────────────────────────
export function computeTax(v) {
  const fy = v.fy || "2024-25";
  const cfg = SLABS[fy];
  const stdDed = cfg.standardDeduction;
  const isMetro = v.metro === "metro";

  const hraExemption = Math.max(0, Math.min(
    v.hraReceived, v.rentPaid - 0.1 * v.basicSalary,
    (isMetro ? 0.5 : 0.4) * v.basicSalary
  ));

  const grossSalary = v.basicSalary + v.hraReceived + v.otherAllowances + v.perquisites;
  const netSalary = grossSalary - hraExemption - stdDed;

  const nav = v.rentalIncome - v.propertyTax;
  let hpIncome = nav - 0.3 * nav - v.homeLoanInterest;
  if (v.rentalIncome === 0 && v.homeLoanInterest > 0) hpIncome = Math.max(-200000, -v.homeLoanInterest);

  const ltcgExemptLimit = fy === "2025-26" ? 125000 : 100000;
  const ltcgTaxable = Math.max(0, v.ltcg - ltcgExemptLimit);

  const presumptiveIncome = calcPresumptiveIncome(v);
  const businessInc = v.freelancerMode ? presumptiveIncome : v.businessIncome;

  const gti = netSalary + hpIncome + businessInc + v.stcg + ltcgTaxable + v.interestIncome + v.otherSources;

  const totalDed = Math.min(v.sec80c, 150000) + Math.min(v.sec80ccd1b, 50000) + v.sec80d + v.sec80e + v.sec80g + v.sec80tta;

  const tiOld = Math.max(0, gti - totalDed);
  const tiNew = Math.max(0, gti);

  // Old Regime
  let oldBase = calcSlabTax(tiOld, cfg.old[v.age]);
  if (tiOld <= cfg.rebateOld.limit) oldBase = Math.max(0, oldBase - cfg.rebateOld.amount);
  const cgTax = 0.15 * v.stcg + 0.1 * ltcgTaxable;
  oldBase += cgTax;
  const oldSC = calcSurchargeWithRelief(tiOld, oldBase, "old");
  const oldAfterSC = oldBase + oldSC.surcharge;
  const oldCess = Math.round(oldAfterSC * 0.04);
  const oldTax = Math.round(oldAfterSC + oldCess);

  // New Regime
  let newBase = calcSlabTax(tiNew, cfg.new);
  if (tiNew <= cfg.rebateNew.limit) newBase = Math.max(0, newBase - cfg.rebateNew.amount);
  newBase += cgTax;
  const newSC = calcSurchargeWithRelief(tiNew, newBase, "new");
  const newAfterSC = newBase + newSC.surcharge;
  const newCess = Math.round(newAfterSC * 0.04);
  const newTax = Math.round(newAfterSC + newCess);

  const savings = Math.round(Math.abs(oldTax - newTax));

  return {
    fy, grossTotalIncome: Math.round(gti), totalDeductions: Math.round(totalDed),
    taxableIncomeOld: Math.round(tiOld), taxableIncomeNew: Math.round(tiNew),
    oldBaseTax: Math.round(oldBase), newBaseTax: Math.round(newBase),
    oldSurcharge: oldSC.surcharge, newSurcharge: newSC.surcharge,
    oldMarginalRelief: oldSC.marginalRelief, newMarginalRelief: newSC.marginalRelief,
    oldCess, newCess, oldTax, newTax,
    oldEffectiveRate: tiOld > 0 ? ((oldTax / tiOld) * 100).toFixed(2) : "0.00",
    newEffectiveRate: tiNew > 0 ? ((newTax / tiNew) * 100).toFixed(2) : "0.00",
    savings, recommended: oldTax < newTax ? "old" : newTax < oldTax ? "new" : "equal",
    hraExemption: Math.round(hraExemption), housePropertyIncome: Math.round(hpIncome),
    presumptiveIncome, standardDeduction: stdDed, capitalGainsTax: Math.round(cgTax),
  };
}

// ─── Tax Planning Suggestions ────────────────────────────────────
export function generateSuggestions(v, r) {
  const s = [];
  if (v.sec80c < 150000) { const g = 150000 - v.sec80c; s.push({ title: "Maximize Section 80C", description: `Invest ₹${g.toLocaleString("en-IN")} more under 80C. Consider ELSS, PPF (7.1%), or NSC.`, potentialSaving: Math.round(g * 0.3 * 1.04), priority: "high", category: "investment" }); }
  if (v.sec80ccd1b < 50000) { const g = 50000 - v.sec80ccd1b; s.push({ title: "NPS Additional (80CCD1B)", description: `Invest ₹${g.toLocaleString("en-IN")} more in NPS. Tax savings + retirement corpus.`, potentialSaving: Math.round(g * 0.3 * 1.04), priority: "high", category: "investment" }); }
  if (v.sec80d === 0) s.push({ title: "Health Insurance (80D)", description: "Premiums up to ₹25K (₹50K for seniors) deductible. Add parents for up to ₹1L.", potentialSaving: Math.round(25000 * 0.3 * 1.04), priority: "high", category: "insurance" });
  if (v.basicSalary > 0 && v.hraReceived > 0 && v.rentPaid === 0) s.push({ title: "Claim HRA Exemption", description: "You receive HRA but haven't declared rent paid.", potentialSaving: Math.round(v.hraReceived * 0.3), priority: "high", category: "salary" });
  if (v.homeLoanInterest === 0 && r.grossTotalIncome > 1000000) s.push({ title: "Home Loan Interest (Sec 24b)", description: "Up to ₹2L deductible for self-occupied property.", potentialSaving: Math.round(200000 * 0.3 * 1.04), priority: "medium", category: "property" });
  if (r.recommended === "new" && v.sec80c > 0) s.push({ title: "Consider New Regime", description: `Saves ₹${r.savings.toLocaleString("en-IN")}. Lower slabs outweigh deductions.`, potentialSaving: r.savings, priority: "high", category: "regime" });
  if (r.recommended === "old") s.push({ title: "Old Regime is Better", description: `Saves ₹${r.savings.toLocaleString("en-IN")}. Maximize deductions to widen gap.`, potentialSaving: r.savings, priority: "medium", category: "regime" });
  if (r.grossTotalIncome > 500000 && v.sec80e === 0) s.push({ title: "Education Loan (80E)", description: "Entire interest deductible — no upper limit.", potentialSaving: 0, priority: "low", category: "education" });
  if (v.fy === "2024-25") s.push({ title: "Check FY 2025-26 Slabs", description: "Budget 2025 raised new regime exemptions significantly. Switch FY to compare.", potentialSaving: 0, priority: "low", category: "regime" });
  if (r.oldSurcharge > 0 || r.newSurcharge > 0) s.push({ title: "Surcharge Applicable", description: `Old: ₹${fmt(r.oldSurcharge)}, New: ₹${fmt(r.newSurcharge)}. Consider deferring gains near thresholds.`, potentialSaving: 0, priority: "medium", category: "surcharge" });

  s.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    const d = p[a.priority] - p[b.priority];
    return d !== 0 ? d : b.potentialSaving - a.potentialSaving;
  });
  return s;
}

// ─── Advance Tax ─────────────────────────────────────────────────
export function calcAdvanceTax(totalTax, tdsPaid) {
  const net = Math.max(0, totalTax - tdsPaid);
  if (net < 10000) return { required: false, installments: [], net };
  return {
    required: true, net,
    installments: [
      { due: "June 15", percent: 15, amount: Math.round(net * 0.15), cumulative: 15 },
      { due: "September 15", percent: 30, amount: Math.round(net * 0.30), cumulative: 45 },
      { due: "December 15", percent: 30, amount: Math.round(net * 0.30), cumulative: 75 },
      { due: "March 15", percent: 25, amount: Math.round(net * 0.25), cumulative: 100 },
    ],
  };
}

// ─── TDS Tracker ─────────────────────────────────────────────────
export function calcTDSReconciliation(entries, totalTax) {
  const totalTDS = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const balance = totalTax - totalTDS;
  return { totalTDS: Math.round(totalTDS), totalTax: Math.round(totalTax), balance: Math.round(balance), status: balance > 0 ? "payable" : balance < 0 ? "refund" : "nil" };
}

// ─── EMI Calculator ──────────────────────────────────────────────
export function calcEMISchedule(principal, annualRate, tenureYears) {
  if (principal <= 0 || annualRate <= 0 || tenureYears <= 0) return { emi: 0, schedule: [], totalInterest: 0, totalPrincipal: 0 };
  const mr = annualRate / 12 / 100;
  const months = tenureYears * 12;
  const emi = Math.round((principal * mr * Math.pow(1 + mr, months)) / (Math.pow(1 + mr, months) - 1));
  const schedule = [];
  let bal = principal, totI = 0, totP = 0;
  for (let y = 1; y <= Math.min(tenureYears, 30); y++) {
    let yI = 0, yP = 0;
    for (let m = 0; m < 12; m++) {
      if (bal <= 0) break;
      const ip = bal * mr;
      const pp = Math.min(emi - ip, bal);
      yI += ip; yP += pp; bal -= pp;
    }
    totI += yI; totP += yP;
    schedule.push({ year: y, interest: Math.round(yI), principal: Math.round(yP), balance: Math.round(Math.max(0, bal)), sec80c: Math.min(Math.round(yP), 150000), sec24b: Math.min(Math.round(yI), 200000) });
  }
  return { emi, schedule, totalInterest: Math.round(totI), totalPrincipal: Math.round(totP) };
}

// ─── Capital Gains Calculator ────────────────────────────────────
export function calcCapitalGains(p) {
  const purchase = new Date(p.purchaseDate);
  const sale = new Date(p.saleDate);
  const holdMonths = Math.round((sale - purchase) / (1000 * 60 * 60 * 24 * 30.44));
  let ltThreshold = 36;
  if (p.assetType === "equity" || p.assetType === "equity_mf") ltThreshold = 12;
  else if (p.assetType === "property" || p.assetType === "gold") ltThreshold = 24;
  const isLT = holdMonths >= ltThreshold;
  let indexedCost = p.purchasePrice, indexed = false;
  const preBudget = sale < new Date("2024-07-23");
  if (isLT && (p.assetType === "property" || p.assetType === "gold" || p.assetType === "debt_mf") && preBudget && CII_DATA[p.purchaseFY] && CII_DATA[p.saleFY]) {
    indexedCost = Math.round(p.purchasePrice * (CII_DATA[p.saleFY] / CII_DATA[p.purchaseFY]));
    indexed = true;
  }
  let effPrice = p.purchasePrice, grandfathered = false;
  if ((p.assetType === "equity" || p.assetType === "equity_mf") && p.isListed && isLT && p.jan312018Price > 0 && purchase < new Date("2018-02-01")) {
    effPrice = Math.max(p.purchasePrice, Math.min(p.salePrice, p.jan312018Price));
    grandfathered = true;
  }
  const cost = indexed ? indexedCost : effPrice;
  const gain = p.salePrice - cost;
  let rate;
  if (isLT) { rate = (p.assetType === "equity" || p.assetType === "equity_mf") ? 0.10 : (preBudget ? 0.20 : 0.125); }
  else { rate = (p.assetType === "equity" || p.assetType === "equity_mf") ? 0.15 : -1; }
  const exempt = isLT && (p.assetType === "equity" || p.assetType === "equity_mf") ? 100000 : 0;
  const taxableGain = Math.max(0, gain - exempt);
  const tax = rate >= 0 ? Math.round(taxableGain * rate) : null;
  return { holdingMonths: holdMonths, isLongTerm: isLT, gain: Math.round(gain), taxableGain: Math.round(taxableGain), taxRate: rate, tax, indexedCost: indexed ? indexedCost : null, indexationApplied: indexed, grandfatheringApplied: grandfathered, effectivePurchasePrice: grandfathered ? effPrice : null, exemptLimit: exempt, assetType: p.assetType };
}

// ─── HRA Calculator ──────────────────────────────────────────────
export function calcHRA(basic, hra, rent, isMetro) {
  const a = hra, b = Math.round(rent - 0.1 * basic), c = Math.round((isMetro ? 0.5 : 0.4) * basic);
  const exemption = Math.max(0, Math.min(a, b, c));
  return { actual: a, excess: b, percent: c, exemption: Math.round(exemption), taxable: Math.round(hra - exemption), components: [{ label: "HRA Received", value: a }, { label: "Rent - 10% Basic", value: b }, { label: `${isMetro ? "50" : "40"}% of Basic`, value: c }] };
}

function numberToWords(n) {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function c(num) {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + c(num % 100) : "");
    if (num < 100000) return c(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + c(num % 1000) : "");
    if (num < 10000000) return c(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + c(num % 100000) : "");
    return c(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + c(num % 10000000) : "");
  }
  return c(Math.round(n));
}

export function generateRentReceiptHTML(params) {
  const { tenantName, landlordName, landlordPAN, address, monthlyRent, months, fy } = params;
  const rows = months.map((m) => {
    const d = new Date(2024, m, 1);
    const mn = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    return `<div class="receipt"><h3>Rent Receipt</h3><p>Received <strong>Rs. ${fmt(monthlyRent)}</strong> (Rupees ${numberToWords(monthlyRent)} only) from <strong>${tenantName}</strong> towards rent for <strong>${mn}</strong>.</p><table><tr><td>Address:</td><td>${address}</td></tr><tr><td>Landlord:</td><td>${landlordName}</td></tr>${landlordPAN ? `<tr><td>PAN:</td><td>${landlordPAN}</td></tr>` : ""}<tr><td>Amount:</td><td>Rs. ${fmt(monthlyRent)}</td></tr></table><div class="sig"><div>Date: ${new Date(2024, m + 1, 0).toLocaleDateString("en-IN")}</div><div>Signature<br><br>_______________</div></div></div>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rent Receipts ${fy}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;color:#2b2b2b;padding:30px;max-width:800px;margin:auto}h2{text-align:center;margin-bottom:20px;color:#1a4d2e}.receipt{border:2px solid #1a4d2e;border-radius:8px;padding:24px;margin-bottom:24px;page-break-inside:avoid}.receipt h3{color:#1a4d2e;margin-bottom:12px;text-align:center;border-bottom:1px solid #d4af37;padding-bottom:8px}.receipt p{margin-bottom:12px;line-height:1.6}.receipt table{width:100%;margin-bottom:16px}.receipt td{padding:6px 10px;border-bottom:1px solid #eee;font-size:14px}.receipt td:first-child{font-weight:600;width:35%;color:#666}.sig{display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding-top:12px;border-top:1px solid #eee;font-size:13px;color:#666}@media print{body{padding:10px}}</style></head><body><h2>Rent Receipts — FY ${fy}</h2>${rows}</body></html>`;
}

// ─── URL Share / Auto-Save ───────────────────────────────────────
export function encodeValuesToURL(values) {
  const p = new URLSearchParams();
  for (const [k, val] of Object.entries(values)) {
    if (val !== DEFAULT_VALUES[k] && val !== 0 && val !== false && val !== "") p.set(k, String(val));
  }
  return p.toString();
}

export function decodeValuesFromURL(search) {
  const p = new URLSearchParams(search);
  const v = { ...DEFAULT_VALUES };
  for (const [k, val] of p.entries()) {
    if (k in DEFAULT_VALUES) {
      const d = DEFAULT_VALUES[k];
      if (typeof d === "number") v[k] = parseFloat(val) || 0;
      else if (typeof d === "boolean") v[k] = val === "true";
      else v[k] = val;
    }
  }
  return v;
}

const AUTOSAVE_KEY = "tax-calc-autosave-v2";
export function autoSave(values) { try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(values)); } catch (e) { /* */ } }
export function autoLoad() { try { const r = localStorage.getItem(AUTOSAVE_KEY); return r ? { ...DEFAULT_VALUES, ...JSON.parse(r) } : null; } catch (e) { return null; } }

// ─── Form 16 Parser ──────────────────────────────────────────────
export function parseForm16Text(text) {
  const values = { ...DEFAULT_VALUES };
  const full = text.replace(/\n/g, " ");
  const pats = [
    { f: "basicSalary", p: [/basic\s*(?:salary|pay)[\s:₹]*([0-9,]+)/i] },
    { f: "hraReceived", p: [/(?:house\s+rent|hra)\s*(?:allowance|received)?[\s:₹]*([0-9,]+)/i] },
    { f: "otherAllowances", p: [/(?:other|special)\s*allowance[s]?[\s:₹]*([0-9,]+)/i] },
    { f: "perquisites", p: [/perquisite[s]?[\s:₹]*([0-9,]+)/i] },
    { f: "sec80c", p: [/80\s*C[\s:₹]+([0-9,]+)/i] },
    { f: "sec80ccd1b", p: [/80\s*CCD\s*\(?1B\)?[\s:₹]*([0-9,]+)/i] },
    { f: "sec80d", p: [/80\s*D[\s:₹]*([0-9,]+)/i] },
    { f: "sec80e", p: [/80\s*E[\s:₹]*([0-9,]+)/i] },
    { f: "sec80g", p: [/80\s*G[\s:₹]*([0-9,]+)/i] },
    { f: "sec80tta", p: [/80\s*TTA[\s:₹]*([0-9,]+)/i] },
    { f: "interestIncome", p: [/interest\s*(?:income|on\s*(?:savings|deposits))[\s:₹]*([0-9,]+)/i] },
    { f: "homeLoanInterest", p: [/(?:interest.*?(?:house|home)\s*(?:property|loan)|24\(b\))[\s:₹]*([0-9,]+)/i] },
    { f: "rentalIncome", p: [/(?:income|rent).*?(?:house|property|let\s*out)[\s:₹]*([0-9,]+)/i] },
    { f: "propertyTax", p: [/(?:property|municipal)\s*tax[\s:₹]*([0-9,]+)/i] },
  ];
  for (const { f, p: pp } of pats) { for (const pat of pp) { const m = full.match(pat); if (m) { const v = parseFloat(m[1].replace(/,/g, "")); if (!isNaN(v) && v > 0) { values[f] = v; break; } } } }
  const dobM = full.match(/(?:date\s*of\s*birth|dob)[\s:]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
  if (dobM) { try { const y = parseInt(dobM[1].split(/[\/-]/)[2]); const fy2 = y < 100 ? (y > 50 ? 1900 + y : 2000 + y) : y; const age = 2025 - fy2; if (age >= 80) values.age = "above80"; else if (age >= 60) values.age = "60to80"; } catch (e) { /* */ } }
  return values;
}

// ─── PDF Export ──────────────────────────────────────────────────
export function generatePDFHTML(values, result, suggestions) {
  const date = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const fy = values.fy || "2024-25";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Tax Report FY ${fy}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;color:#2b2b2b;line-height:1.6;padding:40px;max-width:800px;margin:auto}.rh{text-align:center;border-bottom:3px solid #1a4d2e;padding-bottom:24px;margin-bottom:32px}.rh h1{font-size:28px;color:#1a4d2e}.rh p{color:#666;font-size:14px;margin-top:4px}.sec{margin-bottom:28px}.sec h2{font-size:20px;color:#1a4d2e;border-bottom:2px solid #d4af37;padding-bottom:6px;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-bottom:16px}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e5e1da;font-size:14px}th{background:#f5f3ef;font-weight:600;color:#1a4d2e}td:last-child,th:last-child{text-align:right}.hl{background:rgba(26,77,46,.06);border-left:4px solid #d4af37;padding:16px;border-radius:4px;margin:16px 0}.hl strong{color:#1a4d2e}.sc{border:1px solid #e5e1da;border-radius:8px;padding:14px;margin-bottom:10px}.sc h4{color:#1a4d2e;margin-bottom:4px}.sc p{font-size:13px;color:#666}.ft{text-align:center;margin-top:40px;padding-top:16px;border-top:1px solid #e5e1da;color:#999;font-size:12px}@media print{body{padding:20px}}</style></head><body>
<div class="rh"><h1>Income Tax Report</h1><p>FY ${fy} (AY ${fy === "2024-25" ? "2025-26" : "2026-27"})</p><p>${date}</p></div>
<div class="sec"><h2>Income</h2><table><tr><th>Component</th><th>₹</th></tr>
<tr><td>Basic Salary</td><td>${fmt(values.basicSalary)}</td></tr>
<tr><td>HRA</td><td>${fmt(values.hraReceived)}</td></tr>
<tr><td>Allowances</td><td>${fmt(values.otherAllowances)}</td></tr>
${values.freelancerMode ? `<tr><td>Presumptive (${values.profession44ADA ? "44ADA" : "44AD"})</td><td>${fmt(result.presumptiveIncome)}</td></tr>` : `<tr><td>Business</td><td>${fmt(values.businessIncome)}</td></tr>`}
<tr><td>House Property</td><td>${fmt(result.housePropertyIncome)}</td></tr>
<tr><td>Capital Gains</td><td>${fmt(values.stcg + values.ltcg)}</td></tr>
<tr><td>Interest & Other</td><td>${fmt(values.interestIncome + values.otherSources)}</td></tr>
<tr style="font-weight:700;background:#f5f3ef"><td>Gross Total</td><td>${fmt(result.grossTotalIncome)}</td></tr></table></div>
<div class="sec"><h2>Tax Comparison</h2><table><tr><th></th><th>Old</th><th>New</th></tr>
<tr><td>Taxable Income</td><td>₹${fmt(result.taxableIncomeOld)}</td><td>₹${fmt(result.taxableIncomeNew)}</td></tr>
<tr><td>Base Tax</td><td>₹${fmt(result.oldBaseTax)}</td><td>₹${fmt(result.newBaseTax)}</td></tr>
<tr><td>Surcharge</td><td>₹${fmt(result.oldSurcharge)}</td><td>₹${fmt(result.newSurcharge)}</td></tr>
<tr><td>Cess (4%)</td><td>₹${fmt(result.oldCess)}</td><td>₹${fmt(result.newCess)}</td></tr>
<tr style="font-weight:700;background:#f5f3ef"><td>Total Tax</td><td>₹${fmt(result.oldTax)}</td><td>₹${fmt(result.newTax)}</td></tr>
<tr><td>Effective Rate</td><td>${result.oldEffectiveRate}%</td><td>${result.newEffectiveRate}%</td></tr></table>
<div class="hl"><strong>${result.recommended === "old" ? "Old" : result.recommended === "new" ? "New" : "Both"} Regime${result.recommended === "equal" ? "s equal" : " Recommended"}</strong>${result.savings > 0 ? ` — saves ₹${fmt(result.savings)}` : ""}</div></div>
${suggestions.length > 0 ? `<div class="sec"><h2>Suggestions</h2>${suggestions.map(sg => `<div class="sc"><h4>${sg.title}</h4><p>${sg.description}</p>${sg.potentialSaving > 0 ? `<p style="color:#1a4d2e;font-weight:600;margin-top:4px">Potential: ₹${fmt(sg.potentialSaving)}</p>` : ""}</div>`).join("")}</div>` : ""}
<div class="ft"><p>For informational purposes only. Consult a CA for professional advice.</p></div></body></html>`;
}