import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  DEFAULT_VALUES,
  SECTION_80C_ITEMS,
  computeTax,
  generateSuggestions,
  parseForm16Text,
  generatePDFHTML,
} from "./taxEngine";

// ─── Helpers ─────────────────────────────────────────────────────
const fmt = (n) => Math.round(n).toLocaleString("en-IN");
const STORAGE_KEY = "tax-profiles-v1";
const loadProfiles = () => {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
};
const saveProfilesLS = (p) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));

// ─── Icons ───────────────────────────────────────────────────────
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// ─── Sub-Components ──────────────────────────────────────────────
function CollapsibleSection({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="card">
      <div className="collapsible-header" onClick={() => setOpen(!open)}>
        <h2 className="card-header-inline">{title}</h2>
        <span className={`arrow ${open ? "rotated" : ""}`}>▼</span>
      </div>
      {open && <div className="collapsible-content">{children}</div>}
    </div>
  );
}

function InputField({ label, id, value, onChange, max, readonly, info, placeholder }) {
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <input
        type="number"
        id={id}
        value={value}
        min="0"
        max={max}
        readOnly={readonly}
        placeholder={placeholder || "₹"}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
      {info && <p className="info-text">{info}</p>}
    </div>
  );
}

function SelectField({ label, id, value, onChange, options }) {
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SuggestionCard({ suggestion }) {
  const colors = { high: "#c1121f", medium: "#d4af37", low: "#2d6a4f" };
  return (
    <div className="suggestion-item">
      <div className="suggestion-header">
        <span className="suggestion-title">{suggestion.title}</span>
        <span
          className="priority-badge"
          style={{ background: colors[suggestion.priority] }}
        >
          {suggestion.priority}
        </span>
      </div>
      <p className="suggestion-desc">{suggestion.description}</p>
      {suggestion.potentialSaving > 0 && (
        <p className="suggestion-saving">
          Potential tax saving: ₹{fmt(suggestion.potentialSaving)}
        </p>
      )}
    </div>
  );
}

function ProfileManager({ values, onLoad }) {
  const [profiles, setProfiles] = useState(loadProfiles);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    const updated = [
      ...profiles,
      { name: name.trim(), values, savedAt: new Date().toISOString() },
    ];
    saveProfilesLS(updated);
    setProfiles(updated);
    setName("");
    setShowSave(false);
  };

  const handleDelete = (i) => {
    const updated = profiles.filter((_, idx) => idx !== i);
    saveProfilesLS(updated);
    setProfiles(updated);
  };

  return (
    <div className="profile-manager">
      <div className="profile-actions">
        <button
          className="btn-secondary"
          onClick={() => setShowSave(!showSave)}
        >
          {showSave ? "Cancel" : "💾 Save Current Profile"}
        </button>
      </div>
      {showSave && (
        <div className="save-form">
          <input
            type="text"
            placeholder="Profile name (e.g. FY 2024-25)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="profile-name-input"
          />
          <button className="btn-primary-sm" onClick={handleSave}>
            Save
          </button>
        </div>
      )}
      {profiles.length > 0 && (
        <div className="profiles-list">
          <h4>Saved Profiles</h4>
          {profiles.map((p, i) => (
            <div key={i} className="profile-item">
              <div className="profile-info">
                <span className="profile-name">{p.name}</span>
                <span className="profile-date">
                  {new Date(p.savedAt).toLocaleDateString("en-IN")}
                </span>
              </div>
              <div className="profile-btns">
                <button className="btn-load" onClick={() => onLoad(p.values)}>
                  Load
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(i)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Form16Parser({ onParsed }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  const handleParse = () => {
    if (!text.trim()) return;
    onParsed(parseForm16Text(text));
    setStatus("success");
    setTimeout(() => setStatus(null), 3000);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      file.type === "text/plain" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".csv")
    ) {
      setText(await file.text());
    } else {
      setStatus("error");
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="form16-parser">
      <p className="parser-info">
        Paste your Form 16 text content below or upload a text file. The parser
        will attempt to extract salary, deductions, and other income details
        automatically.
      </p>
      <textarea
        className="form16-textarea"
        placeholder={
          "Paste Form 16 content here...\n\nThe parser recognizes fields like:\n• Basic Salary / Pay\n• HRA, Allowances, Perquisites\n• Section 80C, 80D, 80CCD(1B), etc.\n• House Property Income, Interest\n• Date of Birth (for age category)"
        }
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
      />
      <div className="parser-actions">
        <button
          className="btn-primary-sm"
          onClick={handleParse}
          disabled={!text.trim()}
        >
          Parse & Auto-fill
        </button>
        <label className="btn-secondary file-label">
          📄 Upload Text File
          <input
            type="file"
            accept=".txt,.csv"
            ref={fileRef}
            onChange={handleFile}
            style={{ display: "none" }}
          />
        </label>
      </div>
      {status === "success" && (
        <div className="parse-status success">
          ✓ Form 16 parsed! Fields have been auto-filled.
        </div>
      )}
      {status === "error" && (
        <div className="parse-status error">
          Only .txt and .csv files are supported. For PDF Form 16, please
          copy-paste the text.
        </div>
      )}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("tax-calc-theme") === "dark";
    } catch {
      return false;
    }
  });
  const [values, setValues] = useState({ ...DEFAULT_VALUES });
  const [activeTab, setActiveTab] = useState("calculator");

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light"
    );
    try {
      localStorage.setItem("tax-calc-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);

  const update = useCallback(
    (field, val) => setValues((prev) => ({ ...prev, [field]: val })),
    []
  );

  const loadProfile = useCallback((pv) => {
    setValues({ ...DEFAULT_VALUES, ...pv });
    setActiveTab("calculator");
  }, []);

  const result = computeTax(values);
  const suggestions = generateSuggestions(values, result);

  const handleExportPDF = () => {
    const html = generatePDFHTML(values, result, suggestions);
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const handleForm16Parsed = (parsed) => {
    setValues({ ...DEFAULT_VALUES, ...parsed });
    setActiveTab("calculator");
  };

  const tabs = [
    { id: "calculator", label: "Calculator" },
    { id: "suggestions", label: "Tax Planning" },
    { id: "form16", label: "Form 16" },
    { id: "profiles", label: "Profiles" },
  ];

  return (
    <div className={`app-root ${dark ? "dark" : "light"}`}>
      <div className="container">
        <header>
          <div className="header-row">
            <div>
              <h1>Income Tax Calculator</h1>
              <p className="subtitle">
                Financial Year 2024-25 (AY 2025-26) • Individuals & HUF
              </p>
            </div>
            <div className="header-actions">
              <button
                className="btn-export"
                onClick={handleExportPDF}
                title="Export as PDF"
              >
                📄 Export PDF
              </button>
              <button
                className="theme-toggle"
                onClick={() => setDark(!dark)}
                title={dark ? "Light mode" : "Dark mode"}
              >
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>
          <nav className="tab-nav">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                {t.id === "suggestions" && suggestions.length > 0 && (
                  <span className="tab-badge">{suggestions.length}</span>
                )}
              </button>
            ))}
          </nav>
        </header>

        {/* ─── Calculator Tab ─────────────────────────────────── */}
        {activeTab === "calculator" && (
          <div className="main-grid">
            <div className="input-section">
              {/* Personal Info */}
              <div className="card">
                <h2 className="card-header">Personal Information</h2>
                <div className="input-row">
                  <SelectField
                    label="Age"
                    id="age"
                    value={values.age}
                    onChange={(v) => update("age", v)}
                    options={[
                      { value: "below60", label: "Below 60 years" },
                      { value: "60to80", label: "60 to 80 (Senior Citizen)" },
                      { value: "above80", label: "Above 80 (Super Senior)" },
                    ]}
                  />
                  <SelectField
                    label="Residential Status"
                    id="residential"
                    value={values.residential}
                    onChange={(v) => update("residential", v)}
                    options={[
                      { value: "resident", label: "Resident" },
                      { value: "nri", label: "Non-Resident Indian (NRI)" },
                    ]}
                  />
                </div>
              </div>

              {/* Salary */}
              <CollapsibleSection
                title="Income from Salary"
                defaultOpen={true}
              >
                <InputField label="Basic Salary + DA" id="basicSalary" value={values.basicSalary} onChange={(v) => update("basicSalary", v)} />
                <InputField label="HRA Received" id="hraReceived" value={values.hraReceived} onChange={(v) => update("hraReceived", v)} />
                <div className="input-row">
                  <InputField label="Rent Paid (for HRA exemption)" id="rentPaid" value={values.rentPaid} onChange={(v) => update("rentPaid", v)} />
                  <SelectField
                    label="City Type"
                    id="metro"
                    value={values.metro}
                    onChange={(v) => update("metro", v)}
                    options={[
                      { value: "metro", label: "Metro (50% exemption)" },
                      { value: "non-metro", label: "Non-Metro (40% exemption)" },
                    ]}
                  />
                </div>
                <InputField label="Other Allowances (Fully Taxable)" id="otherAllowances" value={values.otherAllowances} onChange={(v) => update("otherAllowances", v)} />
                <InputField label="Perquisites (Company Benefits)" id="perquisites" value={values.perquisites} onChange={(v) => update("perquisites", v)} />
                <InputField label="Standard Deduction" id="sd" value={50000} readonly info="Fixed at ₹50,000 for FY 2024-25" />
              </CollapsibleSection>

              {/* House Property */}
              <CollapsibleSection title="Income from House Property">
                <InputField label="Annual Rental Income" id="rentalIncome" value={values.rentalIncome} onChange={(v) => update("rentalIncome", v)} />
                <div className="input-row">
                  <InputField label="Home Loan Interest (Sec 24b)" id="homeLoanInterest" value={values.homeLoanInterest} onChange={(v) => update("homeLoanInterest", v)} />
                  <InputField label="Property Tax Paid" id="propertyTax" value={values.propertyTax} onChange={(v) => update("propertyTax", v)} />
                </div>
              </CollapsibleSection>

              {/* Other Income */}
              <CollapsibleSection title="Other Income Sources">
                <InputField label="Business / Professional Income" id="businessIncome" value={values.businessIncome} onChange={(v) => update("businessIncome", v)} />
                <div className="input-row">
                  <InputField label="Short Term Capital Gains" id="stcg" value={values.stcg} onChange={(v) => update("stcg", v)} />
                  <InputField label="Long Term Capital Gains" id="ltcg" value={values.ltcg} onChange={(v) => update("ltcg", v)} />
                </div>
                <InputField label="Interest Income" id="interestIncome" value={values.interestIncome} onChange={(v) => update("interestIncome", v)} />
                <InputField label="Other Sources" id="otherSources" value={values.otherSources} onChange={(v) => update("otherSources", v)} />
              </CollapsibleSection>

              {/* Deductions */}
              <CollapsibleSection title="Deductions (Chapter VI-A) — Old Regime Only">
                <InputField label="Section 80C (PPF, ELSS, LIC, etc.)" id="sec80c" value={values.sec80c} onChange={(v) => update("sec80c", v)} max={150000} info="Maximum deduction: ₹1,50,000" />
                <InputField label="Section 80CCD(1B) — NPS Additional" id="sec80ccd1b" value={values.sec80ccd1b} onChange={(v) => update("sec80ccd1b", v)} max={50000} info="Maximum: ₹50,000 (over and above 80C)" />
                <InputField label="Section 80D — Health Insurance" id="sec80d" value={values.sec80d} onChange={(v) => update("sec80d", v)} info="Max: ₹25,000 (self) + ₹25,000 (parents), ₹50,000 if senior citizen" />
                <InputField label="Section 80E — Education Loan Interest" id="sec80e" value={values.sec80e} onChange={(v) => update("sec80e", v)} />
                <InputField label="Section 80G — Donations" id="sec80g" value={values.sec80g} onChange={(v) => update("sec80g", v)} />
                <InputField label="Section 80TTA/TTB — Interest on Savings" id="sec80tta" value={values.sec80tta} onChange={(v) => update("sec80tta", v)} max={10000} info="Max: ₹10,000 (below 60), ₹50,000 (senior citizens - 80TTB)" />
              </CollapsibleSection>
            </div>

            {/* Summary Sidebar */}
            <div className="summary-card card">
              <h2 className="card-header">Tax Calculation Summary</h2>
              <div className="tax-comparison">
                <div
                  className={`regime-box ${result.recommended === "old" ? "selected" : ""}`}
                >
                  {result.recommended === "old" && (
                    <span className="recommended-badge">Recommended</span>
                  )}
                  <div className="regime-title">Old Tax Regime</div>
                  <div className="tax-amount">₹{fmt(result.oldTax)}</div>
                  <div className="tax-details">
                    Effective Rate: {result.oldEffectiveRate}%
                  </div>
                </div>
                <div
                  className={`regime-box ${result.recommended === "new" ? "selected" : ""}`}
                >
                  {result.recommended === "new" && (
                    <span className="recommended-badge">Recommended</span>
                  )}
                  <div className="regime-title">New Tax Regime</div>
                  <div className="tax-amount">₹{fmt(result.newTax)}</div>
                  <div className="tax-details">
                    Effective Rate: {result.newEffectiveRate}%
                  </div>
                </div>
              </div>

              {result.savings > 0 && (
                <div className="savings-indicator">
                  <div className="savings-text">
                    {result.recommended === "old" ? "Old" : "New"} Regime saves
                    you ₹{fmt(result.savings)}
                  </div>
                </div>
              )}

              <div className="breakdown">
                <h3 className="breakdown-title">Income Breakdown</h3>
                <div className="breakdown-item">
                  <span className="breakdown-label">Gross Total Income</span>
                  <span className="breakdown-value">
                    ₹{fmt(result.grossTotalIncome)}
                  </span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Total Deductions</span>
                  <span className="breakdown-value">
                    ₹{fmt(result.totalDeductions)}
                  </span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">HRA Exemption</span>
                  <span className="breakdown-value">
                    ₹{fmt(result.hraExemption)}
                  </span>
                </div>
                <div className="breakdown-item total">
                  <span className="breakdown-label">
                    Taxable Income (Old)
                  </span>
                  <span className="breakdown-value">
                    ₹{fmt(result.taxableIncomeOld)}
                  </span>
                </div>
                <div className="breakdown-item total">
                  <span className="breakdown-label">
                    Taxable Income (New)
                  </span>
                  <span className="breakdown-value">
                    ₹{fmt(result.taxableIncomeNew)}
                  </span>
                </div>
              </div>

              {suggestions.length > 0 && (
                <div className="quick-tips">
                  <h3 className="breakdown-title">Quick Tips</h3>
                  <p
                    className="quick-tip-text"
                    onClick={() => setActiveTab("suggestions")}
                  >
                    💡 {suggestions.length} tax saving suggestion
                    {suggestions.length > 1 ? "s" : ""} available —{" "}
                    <u>View Tax Planning</u>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Suggestions Tab ────────────────────────────────── */}
        {activeTab === "suggestions" && (
          <div className="suggestions-page">
            <div className="card">
              <h2 className="card-header">Tax Planning Suggestions</h2>
              {result.grossTotalIncome === 0 ? (
                <p className="empty-state">
                  Enter your income details in the Calculator tab to get
                  personalized tax saving suggestions.
                </p>
              ) : suggestions.length === 0 ? (
                <p className="empty-state">
                  Great job! You're already maximizing your deductions. No
                  additional suggestions at this time.
                </p>
              ) : (
                <>
                  <div className="suggestion-summary">
                    <div className="summary-stat">
                      <span className="stat-value">{suggestions.length}</span>
                      <span className="stat-label">Suggestions</span>
                    </div>
                    <div className="summary-stat">
                      <span className="stat-value">
                        ₹
                        {fmt(
                          suggestions.reduce(
                            (s, x) => s + x.potentialSaving,
                            0
                          )
                        )}
                      </span>
                      <span className="stat-label">
                        Total Potential Savings
                      </span>
                    </div>
                  </div>
                  <div className="suggestions-list">
                    {suggestions.map((s, i) => (
                      <SuggestionCard key={i} suggestion={s} />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="card" style={{ marginTop: "1.5rem" }}>
              <h2 className="card-header">Section 80C Investment Options</h2>
              <p className="info-text" style={{ marginBottom: "1rem" }}>
                Common investments that qualify for deduction under Section 80C
                (up to ₹1,50,000):
              </p>
              <div className="investment-grid">
                {SECTION_80C_ITEMS.map((item, i) => (
                  <div key={i} className="investment-item">
                    <span className="invest-bullet">●</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Form 16 Tab ────────────────────────────────────── */}
        {activeTab === "form16" && (
          <div className="form16-page">
            <div className="card">
              <h2 className="card-header">Form 16 Parser</h2>
              <Form16Parser onParsed={handleForm16Parsed} />
            </div>
          </div>
        )}

        {/* ─── Profiles Tab ───────────────────────────────────── */}
        {activeTab === "profiles" && (
          <div className="profiles-page">
            <div className="card">
              <h2 className="card-header">Tax Profiles</h2>
              <p className="info-text" style={{ marginBottom: "1rem" }}>
                Save your current inputs as a profile to quickly reload them
                later. Profiles are stored locally in your browser.
              </p>
              <ProfileManager values={values} onLoad={loadProfile} />
            </div>
          </div>
        )}

        <footer className="app-footer">
          <p>
            This calculator is for informational purposes only. Consult a
            Chartered Accountant for professional tax advice.
          </p>
        </footer>
      </div>
    </div>
  );
}
