// ─── Tax Slab Constants ──────────────────────────────────────────
const TAX_SLABS_OLD = {
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
};

const TAX_SLABS_NEW = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 600000, rate: 0.05 },
  { min: 600000, max: 900000, rate: 0.1 },
  { min: 900000, max: 1200000, rate: 0.15 },
  { min: 1200000, max: 1500000, rate: 0.2 },
  { min: 1500000, max: Infinity, rate: 0.3 },
];

export const DEFAULT_VALUES = {
  age: "below60",
  residential: "resident",
  basicSalary: 0,
  hraReceived: 0,
  rentPaid: 0,
  metro: "metro",
  otherAllowances: 0,
  perquisites: 0,
  standardDeduction: 50000,
  rentalIncome: 0,
  homeLoanInterest: 0,
  propertyTax: 0,
  businessIncome: 0,
  stcg: 0,
  ltcg: 0,
  interestIncome: 0,
  otherSources: 0,
  sec80c: 0,
  sec80ccd1b: 0,
  sec80d: 0,
  sec80e: 0,
  sec80g: 0,
  sec80tta: 0,
};

export const SECTION_80C_ITEMS = [
  "PPF (Public Provident Fund)",
  "ELSS (Equity Linked Savings Scheme)",
  "Life Insurance Premium (LIC)",
  "National Savings Certificate (NSC)",
  "5-Year Fixed Deposit",
  "Sukanya Samriddhi Yojana",
  "Senior Citizens Savings Scheme",
  "Tuition Fees (max 2 children)",
  "Home Loan Principal Repayment",
  "Employee Provident Fund (EPF)",
];

// ─── Tax Calculation Functions ───────────────────────────────────
function calculateOldRegimeTax(taxableIncome, age) {
  const slabs = TAX_SLABS_OLD[age];
  let tax = 0;
  let remaining = taxableIncome;
  for (const slab of slabs) {
    const taxable = Math.min(remaining, slab.max - slab.min);
    if (taxable <= 0) break;
    tax += taxable * slab.rate;
    remaining -= taxable;
  }
  if (taxableIncome <= 500000) tax = Math.max(0, tax - 12500);
  return tax;
}

function calculateNewRegimeTax(taxableIncome) {
  let tax = 0;
  let remaining = taxableIncome;
  for (const slab of TAX_SLABS_NEW) {
    const taxable = Math.min(remaining, slab.max - slab.min);
    if (taxable <= 0) break;
    tax += taxable * slab.rate;
    remaining -= taxable;
  }
  if (taxableIncome <= 700000) tax = Math.max(0, tax - 25000);
  return tax;
}

export function computeTax(v) {
  const isMetro = v.metro === "metro";
  const hraExemption = Math.max(
    0,
    Math.min(
      v.hraReceived,
      v.rentPaid - 0.1 * v.basicSalary,
      (isMetro ? 0.5 : 0.4) * v.basicSalary
    )
  );

  const grossSalary =
    v.basicSalary + v.hraReceived + v.otherAllowances + v.perquisites;
  const netSalary = grossSalary - hraExemption - 50000;

  const nav = v.rentalIncome - v.propertyTax;
  let hpIncome = nav - 0.3 * nav - v.homeLoanInterest;
  if (v.rentalIncome === 0 && v.homeLoanInterest > 0) {
    hpIncome = Math.max(-200000, -v.homeLoanInterest);
  }

  const ltcgTaxable = Math.max(0, v.ltcg - 100000);
  const gti =
    netSalary +
    hpIncome +
    v.businessIncome +
    v.stcg +
    ltcgTaxable +
    v.interestIncome +
    v.otherSources;

  const totalDed =
    Math.min(v.sec80c, 150000) +
    Math.min(v.sec80ccd1b, 50000) +
    v.sec80d +
    v.sec80e +
    v.sec80g +
    v.sec80tta;

  const tiOld = Math.max(0, gti - totalDed);
  const tiNew = Math.max(0, gti);

  let oldTax =
    (calculateOldRegimeTax(tiOld, v.age) + 0.15 * v.stcg + 0.1 * ltcgTaxable) *
    1.04;
  let newTax =
    (calculateNewRegimeTax(tiNew) + 0.15 * v.stcg + 0.1 * ltcgTaxable) * 1.04;

  const savings = Math.round(Math.abs(oldTax - newTax));

  return {
    grossTotalIncome: Math.round(gti),
    totalDeductions: Math.round(totalDed),
    taxableIncomeOld: Math.round(tiOld),
    taxableIncomeNew: Math.round(tiNew),
    oldTax: Math.round(oldTax),
    newTax: Math.round(newTax),
    oldEffectiveRate:
      tiOld > 0 ? ((oldTax / tiOld) * 100).toFixed(2) : "0.00",
    newEffectiveRate:
      tiNew > 0 ? ((newTax / tiNew) * 100).toFixed(2) : "0.00",
    savings,
    recommended:
      oldTax < newTax ? "old" : newTax < oldTax ? "new" : "equal",
    hraExemption: Math.round(hraExemption),
    housePropertyIncome: Math.round(hpIncome),
  };
}

// ─── Tax Planning Suggestions ────────────────────────────────────
export function generateSuggestions(v, r) {
  const s = [];

  if (v.sec80c < 150000) {
    const gap = 150000 - v.sec80c;
    s.push({
      title: "Maximize Section 80C",
      description: `Invest ₹${gap.toLocaleString("en-IN")} more under 80C. Consider ELSS (3-yr lock-in, equity returns), PPF (15-yr, risk-free 7.1%), or NSC.`,
      potentialSaving: Math.round(gap * 0.3 * 1.04),
      priority: "high",
      category: "investment",
    });
  }

  if (v.sec80ccd1b < 50000) {
    const gap = 50000 - v.sec80ccd1b;
    s.push({
      title: "NPS Additional Deduction (80CCD1B)",
      description: `Invest ₹${gap.toLocaleString("en-IN")} more in NPS for additional deduction beyond 80C. Dual benefit: tax savings now + retirement corpus.`,
      potentialSaving: Math.round(gap * 0.3 * 1.04),
      priority: "high",
      category: "investment",
    });
  }

  if (v.sec80d === 0) {
    s.push({
      title: "Get Health Insurance (Section 80D)",
      description:
        "Premiums up to ₹25,000 (₹50,000 for senior citizens) are deductible. Add ₹25,000 for parents' insurance for up to ₹1L total deduction.",
      potentialSaving: Math.round(25000 * 0.3 * 1.04),
      priority: "high",
      category: "insurance",
    });
  }

  if (v.basicSalary > 0 && v.hraReceived > 0 && v.rentPaid === 0) {
    s.push({
      title: "Claim HRA Exemption",
      description:
        "You receive HRA but haven't declared rent. If you pay rent, claim HRA exemption to significantly reduce taxable income.",
      potentialSaving: Math.round(v.hraReceived * 0.3),
      priority: "high",
      category: "salary",
    });
  }

  if (v.homeLoanInterest === 0 && r.grossTotalIncome > 1000000) {
    s.push({
      title: "Home Loan Interest Deduction",
      description:
        "Home loan interest up to ₹2,00,000 is deductible under Section 24(b) for self-occupied property.",
      potentialSaving: Math.round(200000 * 0.3 * 1.04),
      priority: "medium",
      category: "property",
    });
  }

  if (r.recommended === "new" && v.sec80c > 0) {
    s.push({
      title: "Consider New Tax Regime",
      description: `The New Regime is more beneficial. Deductions don't apply but slab rates are lower. You save ₹${r.savings.toLocaleString("en-IN")}.`,
      potentialSaving: r.savings,
      priority: "high",
      category: "regime",
    });
  }

  if (r.recommended === "old") {
    s.push({
      title: "Old Regime is Better for You",
      description: `With your deductions, the Old Regime saves ₹${r.savings.toLocaleString("en-IN")}. Maximize deductions to widen this gap.`,
      potentialSaving: r.savings,
      priority: "medium",
      category: "regime",
    });
  }

  if (r.grossTotalIncome > 500000 && v.sec80e === 0) {
    s.push({
      title: "Education Loan Interest (80E)",
      description:
        "If you or your children have education loans, the entire interest is deductible under Section 80E with no upper limit.",
      potentialSaving: 0,
      priority: "low",
      category: "education",
    });
  }

  s.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    const priorityDiff = p[a.priority] - p[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.potentialSaving - a.potentialSaving;
  });

  return s;
}

// ─── Form 16 Parser ──────────────────────────────────────────────
export function parseForm16Text(text) {
  const values = { ...DEFAULT_VALUES };
  const full = text.replace(/\n/g, " ");

  const patterns = [
    { field: "basicSalary", patterns: [/basic\s*(?:salary|pay)[\s:₹]*([0-9,]+)/i, /salary\s*(?:as per|under).*?([0-9,]+)/i] },
    { field: "hraReceived", patterns: [/(?:house\s+rent|hra)\s*(?:allowance|received)?[\s:₹]*([0-9,]+)/i] },
    { field: "otherAllowances", patterns: [/(?:other|special)\s*allowance[s]?[\s:₹]*([0-9,]+)/i] },
    { field: "perquisites", patterns: [/perquisite[s]?[\s:₹]*([0-9,]+)/i, /value\s+of\s+perquisites.*?([0-9,]+)/i] },
    { field: "sec80c", patterns: [/80\s*C(?![C(D])[\s:₹]*([0-9,]+)/i, /Deduction.*?80C.*?([0-9,]+)/i] },
    { field: "sec80ccd1b", patterns: [/80\s*CCD\s*\(?1B\)?[\s:₹]*([0-9,]+)/i] },
    { field: "sec80d", patterns: [/80\s*D[\s:₹]*([0-9,]+)/i] },
    { field: "sec80e", patterns: [/80\s*E[\s:₹]*([0-9,]+)/i] },
    { field: "sec80g", patterns: [/80\s*G[\s:₹]*([0-9,]+)/i] },
    { field: "sec80tta", patterns: [/80\s*TTA[\s:₹]*([0-9,]+)/i] },
    { field: "interestIncome", patterns: [/interest\s*(?:income|on\s*(?:savings|deposits))[\s:₹]*([0-9,]+)/i] },
    { field: "homeLoanInterest", patterns: [/(?:interest.*?(?:house|home)\s*(?:property|loan)|24\(b\))[\s:₹]*([0-9,]+)/i] },
    { field: "rentalIncome", patterns: [/(?:income|rent).*?(?:house|property|let\s*out)[\s:₹]*([0-9,]+)/i] },
    { field: "propertyTax", patterns: [/(?:property|municipal)\s*tax[\s:₹]*([0-9,]+)/i] },
  ];

  for (const { field, patterns: pats } of patterns) {
    for (const pat of pats) {
      const match = full.match(pat);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(val) && val > 0) {
          values[field] = val;
          break;
        }
      }
    }
  }

  // Detect age from DOB
  const dobMatch = full.match(
    /(?:date\s*of\s*birth|dob)[\s:]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i
  );
  if (dobMatch) {
    try {
      const y = parseInt(dobMatch[1].split(/[\/-]/)[2]);
      const fy = y < 100 ? (y > 50 ? 1900 + y : 2000 + y) : y;
      const age = 2025 - fy;
      if (age >= 80) values.age = "above80";
      else if (age >= 60) values.age = "60to80";
    } catch (e) {
      /* ignore */
    }
  }

  return values;
}

// ─── PDF Export ──────────────────────────────────────────────────
export function generatePDFHTML(values, result, suggestions) {
  const fmt = (n) => Math.round(n).toLocaleString("en-IN");
  const date = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Tax Calculation Report - FY 2024-25</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;color:#2b2b2b;line-height:1.6;padding:40px;max-width:800px;margin:auto}
.rh{text-align:center;border-bottom:3px solid #1a4d2e;padding-bottom:24px;margin-bottom:32px}
.rh h1{font-family:'Crimson Pro',serif;font-size:28px;color:#1a4d2e}
.rh p{color:#666;font-size:14px;margin-top:4px}
.sec{margin-bottom:28px}
.sec h2{font-family:'Crimson Pro',serif;font-size:20px;color:#1a4d2e;border-bottom:2px solid #d4af37;padding-bottom:6px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e5e1da;font-size:14px}
th{background:#f5f3ef;font-weight:600;color:#1a4d2e}
td:last-child{text-align:right}
.hl{background:linear-gradient(135deg,rgba(26,77,46,.06),rgba(212,175,55,.06));border-left:4px solid #d4af37;padding:16px;border-radius:4px;margin:16px 0}
.hl strong{color:#1a4d2e}
.sc{border:1px solid #e5e1da;border-radius:8px;padding:14px;margin-bottom:10px}
.sc h4{color:#1a4d2e;margin-bottom:4px}
.sc p{font-size:13px;color:#666}
.ft{text-align:center;margin-top:40px;padding-top:16px;border-top:1px solid #e5e1da;color:#999;font-size:12px}
@media print{body{padding:20px}}
</style></head><body>
<div class="rh"><h1>Income Tax Calculation Report</h1><p>Financial Year 2024-25 (AY 2025-26)</p><p>Generated on ${date}</p></div>
<div class="sec"><h2>Income Summary</h2><table>
<tr><th>Component</th><th>Amount (₹)</th></tr>
<tr><td>Basic Salary + DA</td><td>${fmt(values.basicSalary)}</td></tr>
<tr><td>HRA Received</td><td>${fmt(values.hraReceived)}</td></tr>
<tr><td>Other Allowances</td><td>${fmt(values.otherAllowances)}</td></tr>
<tr><td>Perquisites</td><td>${fmt(values.perquisites)}</td></tr>
<tr><td>House Property Income</td><td>${fmt(result.housePropertyIncome)}</td></tr>
<tr><td>Business Income</td><td>${fmt(values.businessIncome)}</td></tr>
<tr><td>STCG</td><td>${fmt(values.stcg)}</td></tr>
<tr><td>LTCG</td><td>${fmt(values.ltcg)}</td></tr>
<tr><td>Interest Income</td><td>${fmt(values.interestIncome)}</td></tr>
<tr><td>Other Sources</td><td>${fmt(values.otherSources)}</td></tr>
<tr style="font-weight:700;background:#f5f3ef"><td>Gross Total Income</td><td>${fmt(result.grossTotalIncome)}</td></tr>
</table></div>
<div class="sec"><h2>Deductions (Old Regime)</h2><table>
<tr><th>Section</th><th>Amount (₹)</th></tr>
<tr><td>Section 80C</td><td>${fmt(Math.min(values.sec80c, 150000))}</td></tr>
<tr><td>Section 80CCD(1B) - NPS</td><td>${fmt(Math.min(values.sec80ccd1b, 50000))}</td></tr>
<tr><td>Section 80D - Health Insurance</td><td>${fmt(values.sec80d)}</td></tr>
<tr><td>Section 80E - Education Loan</td><td>${fmt(values.sec80e)}</td></tr>
<tr><td>Section 80G - Donations</td><td>${fmt(values.sec80g)}</td></tr>
<tr><td>Section 80TTA/TTB</td><td>${fmt(values.sec80tta)}</td></tr>
<tr style="font-weight:700;background:#f5f3ef"><td>Total Deductions</td><td>${fmt(result.totalDeductions)}</td></tr>
</table></div>
<div class="sec"><h2>Tax Comparison</h2><table>
<tr><th></th><th>Old Regime</th><th>New Regime</th></tr>
<tr><td>Taxable Income</td><td style="text-align:right">₹${fmt(result.taxableIncomeOld)}</td><td style="text-align:right">₹${fmt(result.taxableIncomeNew)}</td></tr>
<tr><td>Tax Payable (incl. cess)</td><td style="text-align:right">₹${fmt(result.oldTax)}</td><td style="text-align:right">₹${fmt(result.newTax)}</td></tr>
<tr><td>Effective Rate</td><td style="text-align:right">${result.oldEffectiveRate}%</td><td style="text-align:right">${result.newEffectiveRate}%</td></tr>
</table>
<div class="hl"><strong>${result.recommended === "old" ? "Old" : result.recommended === "new" ? "New" : "Both"} Tax Regime${result.recommended === "equal" ? "s are equal" : " is Recommended"}</strong>${result.savings > 0 ? `<br>You save ₹${fmt(result.savings)} with the ${result.recommended === "old" ? "Old" : "New"} Regime.` : ""}</div></div>
${
  suggestions.length > 0
    ? `<div class="sec"><h2>Tax Planning Suggestions</h2>${suggestions
        .map(
          (sg) =>
            `<div class="sc"><h4>${sg.title}</h4><p>${sg.description}</p>${sg.potentialSaving > 0 ? `<p style="color:#1a4d2e;font-weight:600;margin-top:4px">Potential saving: ₹${fmt(sg.potentialSaving)}</p>` : ""}</div>`
        )
        .join("")}</div>`
    : ""
}
<div class="ft"><p>This is a computer-generated report for informational purposes only.</p><p>Consult a Chartered Accountant for professional tax advice.</p></div>
</body></html>`;
}
