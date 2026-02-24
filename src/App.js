import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  DEFAULT_VALUES, SECTION_80C_ITEMS, CII_DATA, fmt,
  computeTax, generateSuggestions, parseForm16Text, generatePDFHTML,
  calcAdvanceTax, calcTDSReconciliation, calcEMISchedule, calcCapitalGains,
  calcHRA, generateRentReceiptHTML, encodeValuesToURL, decodeValuesFromURL,
  autoSave, autoLoad,
} from "./taxEngine";

const PROFILES_KEY = "tax-profiles-v1";
const loadProfiles = () => { try { const r = localStorage.getItem(PROFILES_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
const saveProfilesLS = (p) => localStorage.setItem(PROFILES_KEY, JSON.stringify(p));

const SunIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const MoonIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

function Collapse({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (<div className="card"><div className="collapsible-header" onClick={() => setOpen(!open)}><h2 className="card-header-inline">{title}</h2><span className={`arrow ${open ? "rotated" : ""}`}>▼</span></div>{open && <div className="collapsible-content">{children}</div>}</div>);
}

function Inp({ label, id, value, onChange, max, readonly, info }) {
  return (<div className="input-group"><label htmlFor={id}>{label}</label><input type="number" id={id} value={value} min="0" max={max} readOnly={readonly} placeholder="₹" onChange={e => onChange(parseFloat(e.target.value) || 0)} />{info && <p className="info-text">{info}</p>}</div>);
}

function Sel({ label, id, value, onChange, options }) {
  return (<div className="input-group"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>);
}

function Chk({ label, checked, onChange }) {
  return (<div className="checkbox-row"><label className="checkbox-label"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span>{label}</span></label></div>);
}

function SuggestionCard({ s }) {
  const c = { high: "#c1121f", medium: "#d4af37", low: "#2d6a4f" };
  return (<div className="suggestion-item"><div className="suggestion-header"><span className="suggestion-title">{s.title}</span><span className="priority-badge" style={{ background: c[s.priority] }}>{s.priority}</span></div><p className="suggestion-desc">{s.description}</p>{s.potentialSaving > 0 && <p className="suggestion-saving">Potential saving: ₹{fmt(s.potentialSaving)}</p>}</div>);
}

function ProfileManager({ values, onLoad }) {
  const [profiles, setProfiles] = useState(loadProfiles);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");
  const save = () => { if (!name.trim()) return; const u = [...profiles, { name: name.trim(), values, savedAt: new Date().toISOString() }]; saveProfilesLS(u); setProfiles(u); setName(""); setShowSave(false); };
  const del = (i) => { const u = profiles.filter((_, idx) => idx !== i); saveProfilesLS(u); setProfiles(u); };
  return (<div className="profile-manager"><div className="profile-actions"><button className="btn-secondary" onClick={() => setShowSave(!showSave)}>{showSave ? "Cancel" : "💾 Save Profile"}</button></div>
    {showSave && <div className="save-form"><input type="text" placeholder="Profile name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key==="Enter"&&save()} className="profile-name-input"/><button className="btn-primary-sm" onClick={save}>Save</button></div>}
    {profiles.length > 0 && <div className="profiles-list"><h4>Saved Profiles</h4>{profiles.map((p,i)=><div key={i} className="profile-item"><div className="profile-info"><span className="profile-name">{p.name}</span><span className="profile-date">{new Date(p.savedAt).toLocaleDateString("en-IN")}</span></div><div className="profile-btns"><button className="btn-load" onClick={()=>onLoad(p.values)}>Load</button><button className="btn-delete" onClick={()=>del(i)}>×</button></div></div>)}</div>}</div>);
}

function Form16Parser({ onParsed }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);
  const parse = () => { if(!text.trim())return; onParsed(parseForm16Text(text)); setStatus("success"); setTimeout(()=>setStatus(null),3000); };
  const handleFile = async(e) => { const f=e.target.files?.[0]; if(!f)return; if(f.name.endsWith(".txt")||f.name.endsWith(".csv")){setText(await f.text());}else{setStatus("error");setTimeout(()=>setStatus(null),3000);} };
  return (<div><p className="parser-info">Paste Form 16 text or upload .txt/.csv to auto-fill all fields.</p><textarea className="form16-textarea" placeholder={"Paste Form 16 here...\n\n• Basic Salary, HRA\n• 80C/D/E/G, 80CCD(1B)\n• House Property, DOB"} value={text} onChange={e=>setText(e.target.value)} rows={8}/><div className="parser-actions"><button className="btn-primary-sm" onClick={parse} disabled={!text.trim()}>Parse & Auto-fill</button><label className="btn-secondary file-label">📄 Upload<input type="file" accept=".txt,.csv" ref={fileRef} onChange={handleFile} style={{display:"none"}}/></label></div>
    {status==="success"&&<div className="parse-status success">✓ Parsed!</div>}{status==="error"&&<div className="parse-status error">Only .txt/.csv supported.</div>}</div>);
}

function AdvanceTaxTab({ result }) {
  const [tdsPaid, setTdsPaid] = useState(0);
  const tax = result.recommended === "old" ? result.oldTax : result.newTax;
  const plan = calcAdvanceTax(tax, tdsPaid);
  return (<div className="tool-page"><div className="card"><h2 className="card-header">Advance Tax Planner</h2><p className="info-text" style={{marginBottom:"1rem"}}>If liability after TDS exceeds ₹10,000, advance tax is required.</p>
    <div className="input-row"><Inp label="Tax Liability" value={tax} readonly/><Inp label="TDS Paid" value={tdsPaid} onChange={setTdsPaid}/></div>
    <div className="breakdown-item total" style={{marginTop:"1rem"}}><span className="breakdown-label">Net Payable</span><span className="breakdown-value">₹{fmt(plan.net)}</span></div>
    {!plan.required?<div className="parse-status success" style={{marginTop:"0.75rem"}}>Not required (&lt; ₹10,000)</div>:
    <table className="data-table" style={{marginTop:"1rem"}}><thead><tr><th>Due Date</th><th>%</th><th>Cumulative</th><th>Amount</th></tr></thead><tbody>{plan.installments.map((inst,i)=><tr key={i}><td>{inst.due}</td><td>{inst.percent}%</td><td>{inst.cumulative}%</td><td>₹{fmt(inst.amount)}</td></tr>)}</tbody></table>}
  </div></div>);
}

function TDSTrackerTab({ result }) {
  const [entries, setEntries] = useState([{source:"Employer",section:"192",amount:0}]);
  const tax = result.recommended==="old"?result.oldTax:result.newTax;
  const add = () => setEntries([...entries,{source:"",section:"",amount:0}]);
  const upd = (i,f,v) => {const u=[...entries];u[i]={...u[i],[f]:v};setEntries(u);};
  const rm = (i) => setEntries(entries.filter((_,idx)=>idx!==i));
  const r = calcTDSReconciliation(entries, tax);
  return (<div className="tool-page"><div className="card"><h2 className="card-header">TDS Tracker</h2><p className="info-text" style={{marginBottom:"1rem"}}>Enter TDS from Form 26AS/AIS to reconcile.</p>
    {entries.map((e,i)=><div key={i} className="tds-entry"><input type="text" placeholder="Source" value={e.source} onChange={ev=>upd(i,"source",ev.target.value)} className="profile-name-input" style={{flex:2}}/><input type="text" placeholder="Section" value={e.section} onChange={ev=>upd(i,"section",ev.target.value)} className="profile-name-input" style={{flex:1}}/><input type="number" placeholder="₹" value={e.amount||""} onChange={ev=>upd(i,"amount",parseFloat(ev.target.value)||0)} className="profile-name-input" style={{flex:1}}/>{entries.length>1&&<button className="btn-delete" onClick={()=>rm(i)}>×</button>}</div>)}
    <button className="btn-secondary" onClick={add} style={{marginTop:"0.5rem"}}>+ Add Entry</button>
    <div className="breakdown" style={{marginTop:"1.25rem"}}><div className="breakdown-item"><span className="breakdown-label">Total TDS</span><span className="breakdown-value">₹{fmt(r.totalTDS)}</span></div><div className="breakdown-item"><span className="breakdown-label">Tax Liability</span><span className="breakdown-value">₹{fmt(r.totalTax)}</span></div><div className="breakdown-item total"><span className="breakdown-label">{r.status==="refund"?"Refund Due":r.status==="payable"?"Tax Payable":"Nil"}</span><span className="breakdown-value" style={{color:r.status==="refund"?"var(--success)":r.status==="payable"?"var(--error)":"var(--text)"}}>₹{fmt(Math.abs(r.balance))}</span></div></div>
  </div></div>);
}

function EMITab() {
  const [p, setP] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [t, setT] = useState(20);
  const r = calcEMISchedule(p, rate, t);
  return (<div className="tool-page"><div className="card"><h2 className="card-header">EMI Calculator</h2><p className="info-text" style={{marginBottom:"1rem"}}>EMI split into principal (80C) and interest (24b) per year.</p>
    <div className="input-row"><Inp label="Loan (₹)" value={p} onChange={setP}/><div className="input-group"><label>Rate (%)</label><input type="number" value={rate} step="0.1" min="0" onChange={e=>setRate(parseFloat(e.target.value)||0)}/></div><Inp label="Tenure (Yrs)" value={t} onChange={setT}/></div>
    {r.emi>0&&<><div className="suggestion-summary" style={{marginTop:"1rem"}}><div className="summary-stat"><span className="stat-value">₹{fmt(r.emi)}</span><span className="stat-label">Monthly EMI</span></div><div className="summary-stat"><span className="stat-value">₹{fmt(r.totalInterest)}</span><span className="stat-label">Total Interest</span></div></div>
    <div style={{maxHeight:350,overflowY:"auto",marginTop:"1rem"}}><table className="data-table"><thead><tr><th>Yr</th><th>Interest</th><th>Principal</th><th>Balance</th><th>80C</th><th>24(b)</th></tr></thead><tbody>{r.schedule.map(s=><tr key={s.year}><td>{s.year}</td><td>₹{fmt(s.interest)}</td><td>₹{fmt(s.principal)}</td><td>₹{fmt(s.balance)}</td><td>₹{fmt(s.sec80c)}</td><td>₹{fmt(s.sec24b)}</td></tr>)}</tbody></table></div></>}
  </div></div>);
}

function CapGainsTab() {
  const [p, setP] = useState({assetType:"equity",purchaseDate:"2020-01-01",saleDate:"2025-01-01",purchasePrice:100000,salePrice:200000,purchaseFY:"2019-20",saleFY:"2024-25",isListed:true,jan312018Price:0});
  const u = (k,v) => setP(prev=>({...prev,[k]:v}));
  const r = calcCapitalGains(p);
  const fyOpts = Object.keys(CII_DATA).map(k=>({value:k,label:k}));
  return (<div className="tool-page"><div className="card"><h2 className="card-header">Capital Gains Calculator</h2>
    <div className="input-row"><Sel label="Asset" id="cga" value={p.assetType} onChange={v=>u("assetType",v)} options={[{value:"equity",label:"Listed Equity"},{value:"equity_mf",label:"Equity MF"},{value:"debt_mf",label:"Debt MF"},{value:"property",label:"Property"},{value:"gold",label:"Gold"}]}/><Chk label="Listed" checked={p.isListed} onChange={v=>u("isListed",v)}/></div>
    <div className="input-row"><div className="input-group"><label>Purchase Date</label><input type="date" value={p.purchaseDate} onChange={e=>u("purchaseDate",e.target.value)}/></div><div className="input-group"><label>Sale Date</label><input type="date" value={p.saleDate} onChange={e=>u("saleDate",e.target.value)}/></div></div>
    <div className="input-row"><Inp label="Purchase Price" value={p.purchasePrice} onChange={v=>u("purchasePrice",v)}/><Inp label="Sale Price" value={p.salePrice} onChange={v=>u("salePrice",v)}/></div>
    <div className="input-row"><Sel label="Purchase FY" id="cgpfy" value={p.purchaseFY} onChange={v=>u("purchaseFY",v)} options={fyOpts}/><Sel label="Sale FY" id="cgsfy" value={p.saleFY} onChange={v=>u("saleFY",v)} options={fyOpts}/></div>
    {(p.assetType==="equity"||p.assetType==="equity_mf")&&<Inp label="FMV Jan 31 2018 (grandfathering)" value={p.jan312018Price} onChange={v=>u("jan312018Price",v)} info="0 if bought after Jan 2018"/>}
    <div className="breakdown" style={{marginTop:"1rem"}}><h3 className="breakdown-title">Result</h3>
      <div className="breakdown-item"><span className="breakdown-label">Holding</span><span className="breakdown-value">{r.holdingMonths}m ({r.isLongTerm?"LTCG":"STCG"})</span></div>
      {r.indexationApplied&&<div className="breakdown-item"><span className="breakdown-label">Indexed Cost</span><span className="breakdown-value">₹{fmt(r.indexedCost)}</span></div>}
      {r.grandfatheringApplied&&<div className="breakdown-item"><span className="breakdown-label">Grandfathered Cost</span><span className="breakdown-value">₹{fmt(r.effectivePurchasePrice)}</span></div>}
      <div className="breakdown-item"><span className="breakdown-label">Gain</span><span className="breakdown-value" style={{color:r.gain>=0?"var(--success)":"var(--error)"}}>₹{fmt(r.gain)}</span></div>
      <div className="breakdown-item total"><span className="breakdown-label">Tax</span><span className="breakdown-value">{r.tax!==null?`₹${fmt(r.tax)} @ ${(r.taxRate*100).toFixed(1)}%`:"Slab rate"}</span></div>
    </div>
  </div></div>);
}

function HRATab({ values }) {
  const [rp, setRp] = useState({tenantName:"",landlordName:"",landlordPAN:"",address:"",monthlyRent:values.rentPaid?Math.round(values.rentPaid/12):0,months:[3,4,5,6,7,8,9,10,11,0,1,2]});
  const hra = calcHRA(values.basicSalary, values.hraReceived, values.rentPaid, values.metro==="metro");
  const gen = () => { const html=generateRentReceiptHTML({...rp,fy:values.fy||"2024-25"}); const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500); };
  return (<div className="tool-page"><div className="card"><h2 className="card-header">HRA Breakdown</h2>
    {values.basicSalary===0?<p className="empty-state">Enter salary in Calculator tab first.</p>:<div className="breakdown">
      {hra.components.map((c,i)=><div key={i} className="breakdown-item"><span className="breakdown-label">{c.label}</span><span className="breakdown-value">₹{fmt(c.value)}</span></div>)}
      <div className="breakdown-item total"><span className="breakdown-label">Exemption (min of above)</span><span className="breakdown-value">₹{fmt(hra.exemption)}</span></div>
      <div className="breakdown-item"><span className="breakdown-label">Taxable HRA</span><span className="breakdown-value">₹{fmt(hra.taxable)}</span></div>
    </div>}</div>
    <div className="card" style={{marginTop:"1.5rem"}}><h2 className="card-header">Rent Receipt Generator</h2>
      <div className="input-row"><div className="input-group"><label>Tenant</label><input type="text" value={rp.tenantName} onChange={e=>setRp(p=>({...p,tenantName:e.target.value}))} className="profile-name-input"/></div><div className="input-group"><label>Landlord</label><input type="text" value={rp.landlordName} onChange={e=>setRp(p=>({...p,landlordName:e.target.value}))} className="profile-name-input"/></div></div>
      <div className="input-row"><div className="input-group"><label>Landlord PAN</label><input type="text" value={rp.landlordPAN} onChange={e=>setRp(p=>({...p,landlordPAN:e.target.value}))} className="profile-name-input" placeholder="Optional"/></div><Inp label="Monthly Rent" value={rp.monthlyRent} onChange={v=>setRp(p=>({...p,monthlyRent:v}))}/></div>
      <div className="input-group"><label>Address</label><input type="text" value={rp.address} onChange={e=>setRp(p=>({...p,address:e.target.value}))} className="profile-name-input"/></div>
      <button className="btn-primary-sm" onClick={gen} disabled={!rp.tenantName||!rp.landlordName} style={{marginTop:"1rem"}}>Generate Receipts (PDF)</button>
    </div></div>);
}

export default function App() {
  const [dark, setDark] = useState(()=>{try{return localStorage.getItem("tax-calc-theme")==="dark";}catch{return false;}});
  const [values, setValues] = useState(()=>{
    if(window.location.search.length>1) return decodeValuesFromURL(window.location.search);
    return autoLoad()||{...DEFAULT_VALUES};
  });
  const [activeTab, setActiveTab] = useState("calculator");
  const [shareMsg, setShareMsg] = useState("");

  useEffect(()=>{document.documentElement.setAttribute("data-theme",dark?"dark":"light");try{localStorage.setItem("tax-calc-theme",dark?"dark":"light");}catch{}},[dark]);
  useEffect(()=>{autoSave(values);},[values]);

  const update = useCallback((f,v)=>setValues(prev=>({...prev,[f]:v})),[]);
  const loadProfile = useCallback((pv)=>{setValues({...DEFAULT_VALUES,...pv});setActiveTab("calculator");},[]);

  const result = computeTax(values);
  const suggestions = generateSuggestions(values, result);

  const handleExportPDF = () => { const h=generatePDFHTML(values,result,suggestions); const w=window.open("","_blank");w.document.write(h);w.document.close();setTimeout(()=>w.print(),500); };
  const handleShare = () => { const url=window.location.origin+window.location.pathname+"?"+encodeValuesToURL(values); navigator.clipboard.writeText(url).then(()=>{setShareMsg("Copied!");setTimeout(()=>setShareMsg(""),2000);}).catch(()=>{setShareMsg("Failed");setTimeout(()=>setShareMsg(""),2000);}); };

  const tabs = [
    {id:"calculator",label:"Calculator"},{id:"suggestions",label:"Tax Planning",badge:suggestions.length||null},
    {id:"form16",label:"Form 16"},{id:"hra",label:"HRA"},{id:"capgains",label:"Cap Gains"},
    {id:"emi",label:"EMI"},{id:"advance",label:"Advance Tax"},{id:"tds",label:"TDS"},
    {id:"profiles",label:"Profiles"},
  ];

  return (
    <div className={`app-root ${dark?"dark":"light"}`}><div className="container">
      <header>
        <div className="header-row">
          <div><h1>Income Tax Calculator</h1><p className="subtitle">FY {values.fy} (AY {values.fy==="2024-25"?"2025-26":"2026-27"}) • Individuals & HUF</p></div>
          <div className="header-actions">
            <button className="btn-export" onClick={handleShare} title="Share">🔗 Share {shareMsg&&<span style={{fontSize:"0.75rem",color:"var(--success)"}}>{shareMsg}</span>}</button>
            <button className="btn-export" onClick={handleExportPDF} title="PDF">📄 PDF</button>
            <button className="theme-toggle" onClick={()=>setDark(!dark)} title={dark?"Light":"Dark"}>{dark?<SunIcon/>:<MoonIcon/>}</button>
          </div>
        </div>
        <nav className="tab-nav">{tabs.map(t=><button key={t.id} className={`tab-btn ${activeTab===t.id?"active":""}`} onClick={()=>setActiveTab(t.id)}>{t.label}{t.badge&&<span className="tab-badge">{t.badge}</span>}</button>)}</nav>
      </header>

      {activeTab==="calculator"&&(
        <div className="main-grid"><div className="input-section">
          <div className="card"><h2 className="card-header">Personal Information</h2>
            <div className="input-row">
              <Sel label="Financial Year" id="fy" value={values.fy} onChange={v=>update("fy",v)} options={[{value:"2024-25",label:"FY 2024-25"},{value:"2025-26",label:"FY 2025-26 (Budget 2025)"}]}/>
              <Sel label="Age" id="age" value={values.age} onChange={v=>update("age",v)} options={[{value:"below60",label:"Below 60"},{value:"60to80",label:"60-80 (Senior)"},{value:"above80",label:"Above 80 (Super Senior)"}]}/>
            </div>
            <div className="input-row">
              <Sel label="Residential Status" id="res" value={values.residential} onChange={v=>update("residential",v)} options={[{value:"resident",label:"Resident"},{value:"nri",label:"NRI"},{value:"rnor",label:"RNOR"}]}/>
              {values.residential==="nri"&&<Sel label="NRI Sub-type" id="ressub" value={values.residentialSubType} onChange={v=>update("residentialSubType",v)} options={[{value:"ordinary",label:"Ordinary NRI"},{value:"deemed",label:"Deemed Resident"}]}/>}
            </div>
            <Chk label="Freelancer / Consultant (Presumptive Taxation)" checked={values.freelancerMode} onChange={v=>update("freelancerMode",v)}/>
          </div>

          {values.freelancerMode&&<div className="card"><h2 className="card-header">Presumptive Taxation</h2>
            <Chk label="Professional (44ADA — 50% deemed profit)" checked={values.profession44ADA} onChange={v=>update("profession44ADA",v)}/>
            {values.profession44ADA?<Inp label="Gross Receipts" id="gr" value={values.grossReceipts} onChange={v=>update("grossReceipts",v)} info="Limit: ₹75L (if 95%+ digital). Deemed profit: 50%"/>
            :<><Inp label="Digital Receipts (6% deemed)" id="dr" value={values.digitalReceipts} onChange={v=>update("digitalReceipts",v)} info="UPI/bank/card receipts — 6% profit"/>
              <Inp label="Cash Receipts (8% deemed)" id="cr" value={values.cashReceipts} onChange={v=>update("cashReceipts",v)} info="Cash receipts — 8% profit. Total limit ₹3Cr"/></>}
            <div className="savings-indicator" style={{marginTop:"0.75rem"}}><div className="savings-text">Deemed Income: ₹{fmt(result.presumptiveIncome)}</div></div>
          </div>}

          <Collapse title="Income from Salary" defaultOpen={!values.freelancerMode}>
            <Inp label="Basic Salary + DA" id="bs" value={values.basicSalary} onChange={v=>update("basicSalary",v)}/>
            <Inp label="HRA Received" id="hra" value={values.hraReceived} onChange={v=>update("hraReceived",v)}/>
            <div className="input-row"><Inp label="Rent Paid" id="rp" value={values.rentPaid} onChange={v=>update("rentPaid",v)}/><Sel label="City" id="metro" value={values.metro} onChange={v=>update("metro",v)} options={[{value:"metro",label:"Metro (50%)"},{value:"non-metro",label:"Non-Metro (40%)"}]}/></div>
            <Inp label="Other Allowances" id="oa" value={values.otherAllowances} onChange={v=>update("otherAllowances",v)}/>
            <Inp label="Perquisites" id="pq" value={values.perquisites} onChange={v=>update("perquisites",v)}/>
            <Inp label="Standard Deduction" value={result.standardDeduction} readonly info={`₹${fmt(result.standardDeduction)} for FY ${values.fy}`}/>
          </Collapse>

          <Collapse title="House Property"><Inp label="Rental Income" id="ri" value={values.rentalIncome} onChange={v=>update("rentalIncome",v)}/><div className="input-row"><Inp label="Home Loan Interest" id="hli" value={values.homeLoanInterest} onChange={v=>update("homeLoanInterest",v)}/><Inp label="Property Tax" id="pt" value={values.propertyTax} onChange={v=>update("propertyTax",v)}/></div></Collapse>

          <Collapse title="Other Income">
            {!values.freelancerMode&&<Inp label="Business Income" id="bi" value={values.businessIncome} onChange={v=>update("businessIncome",v)}/>}
            <div className="input-row"><Inp label="STCG" id="stcg" value={values.stcg} onChange={v=>update("stcg",v)}/><Inp label="LTCG" id="ltcg" value={values.ltcg} onChange={v=>update("ltcg",v)}/></div>
            <Inp label="Interest Income" id="ii" value={values.interestIncome} onChange={v=>update("interestIncome",v)}/>
            <Inp label="Other Sources" id="os" value={values.otherSources} onChange={v=>update("otherSources",v)}/>
          </Collapse>

          <Collapse title="Deductions (Chapter VI-A) — Old Regime">
            <Inp label="80C (PPF, ELSS, LIC)" id="80c" value={values.sec80c} onChange={v=>update("sec80c",v)} max={150000} info="Max ₹1,50,000"/>
            <Inp label="80CCD(1B) — NPS" id="80ccd" value={values.sec80ccd1b} onChange={v=>update("sec80ccd1b",v)} max={50000} info="Max ₹50,000"/>
            <Inp label="80D — Health Insurance" id="80d" value={values.sec80d} onChange={v=>update("sec80d",v)} info="₹25K self + ₹25K parents"/>
            <Inp label="80E — Education Loan" id="80e" value={values.sec80e} onChange={v=>update("sec80e",v)}/>
            <Inp label="80G — Donations" id="80g" value={values.sec80g} onChange={v=>update("sec80g",v)}/>
            <Inp label="80TTA/TTB" id="80tta" value={values.sec80tta} onChange={v=>update("sec80tta",v)} max={10000} info="₹10K (below 60), ₹50K (seniors)"/>
          </Collapse>
        </div>

        <div className="summary-card card"><h2 className="card-header">Tax Summary — FY {values.fy}</h2>
          <div className="tax-comparison">
            <div className={`regime-box ${result.recommended==="old"?"selected":""}`}>{result.recommended==="old"&&<span className="recommended-badge">Recommended</span>}<div className="regime-title">Old Regime</div><div className="tax-amount">₹{fmt(result.oldTax)}</div><div className="tax-details">Rate: {result.oldEffectiveRate}%</div></div>
            <div className={`regime-box ${result.recommended==="new"?"selected":""}`}>{result.recommended==="new"&&<span className="recommended-badge">Recommended</span>}<div className="regime-title">New Regime</div><div className="tax-amount">₹{fmt(result.newTax)}</div><div className="tax-details">Rate: {result.newEffectiveRate}%</div></div>
          </div>
          {result.savings>0&&<div className="savings-indicator"><div className="savings-text">{result.recommended==="old"?"Old":"New"} saves ₹{fmt(result.savings)}</div></div>}
          <div className="breakdown"><h3 className="breakdown-title">Breakdown</h3>
            <div className="breakdown-item"><span className="breakdown-label">Gross Income</span><span className="breakdown-value">₹{fmt(result.grossTotalIncome)}</span></div>
            <div className="breakdown-item"><span className="breakdown-label">Deductions</span><span className="breakdown-value">₹{fmt(result.totalDeductions)}</span></div>
            <div className="breakdown-item"><span className="breakdown-label">HRA Exemption</span><span className="breakdown-value">₹{fmt(result.hraExemption)}</span></div>
            {result.presumptiveIncome>0&&<div className="breakdown-item"><span className="breakdown-label">Presumptive Income</span><span className="breakdown-value">₹{fmt(result.presumptiveIncome)}</span></div>}
            <div className="breakdown-item total"><span className="breakdown-label">Taxable (Old)</span><span className="breakdown-value">₹{fmt(result.taxableIncomeOld)}</span></div>
            <div className="breakdown-item total"><span className="breakdown-label">Taxable (New)</span><span className="breakdown-value">₹{fmt(result.taxableIncomeNew)}</span></div>
          </div>
          {(result.oldSurcharge>0||result.newSurcharge>0)&&<div className="breakdown"><h3 className="breakdown-title">Surcharge & Cess</h3>
            <div className="breakdown-item"><span className="breakdown-label">Surcharge (Old/New)</span><span className="breakdown-value">₹{fmt(result.oldSurcharge)} / ₹{fmt(result.newSurcharge)}</span></div>
            {(result.oldMarginalRelief>0||result.newMarginalRelief>0)&&<div className="breakdown-item"><span className="breakdown-label">Marginal Relief</span><span className="breakdown-value">₹{fmt(result.oldMarginalRelief)} / ₹{fmt(result.newMarginalRelief)}</span></div>}
            <div className="breakdown-item"><span className="breakdown-label">Cess 4% (Old/New)</span><span className="breakdown-value">₹{fmt(result.oldCess)} / ₹{fmt(result.newCess)}</span></div>
          </div>}
          {suggestions.length>0&&<div className="quick-tips"><h3 className="breakdown-title">Tips</h3><p className="quick-tip-text" onClick={()=>setActiveTab("suggestions")} style={{cursor:"pointer"}}>💡 {suggestions.length} suggestion{suggestions.length>1?"s":""} — <u>View</u></p></div>}
        </div></div>
      )}

      {activeTab==="suggestions"&&<div className="suggestions-page"><div className="card"><h2 className="card-header">Tax Planning</h2>
        {result.grossTotalIncome===0?<p className="empty-state">Enter income in Calculator first.</p>:suggestions.length===0?<p className="empty-state">You're maximizing deductions!</p>:<>
          <div className="suggestion-summary"><div className="summary-stat"><span className="stat-value">{suggestions.length}</span><span className="stat-label">Suggestions</span></div><div className="summary-stat"><span className="stat-value">₹{fmt(suggestions.reduce((s,x)=>s+x.potentialSaving,0))}</span><span className="stat-label">Potential Savings</span></div></div>
          <div className="suggestions-list">{suggestions.map((s,i)=><SuggestionCard key={i} s={s}/>)}</div></>}
      </div><div className="card" style={{marginTop:"1.5rem"}}><h2 className="card-header">80C Options</h2><div className="investment-grid">{SECTION_80C_ITEMS.map((item,i)=><div key={i} className="investment-item"><span className="invest-bullet">●</span><span>{item}</span></div>)}</div></div></div>}

      {activeTab==="form16"&&<div className="tool-page"><div className="card"><h2 className="card-header">Form 16 Parser</h2><Form16Parser onParsed={p=>{setValues({...DEFAULT_VALUES,...p});setActiveTab("calculator");}}/></div></div>}
      {activeTab==="hra"&&<HRATab values={values}/>}
      {activeTab==="capgains"&&<CapGainsTab/>}
      {activeTab==="emi"&&<EMITab/>}
      {activeTab==="advance"&&<AdvanceTaxTab result={result}/>}
      {activeTab==="tds"&&<TDSTrackerTab result={result}/>}
      {activeTab==="profiles"&&<div className="tool-page"><div className="card"><h2 className="card-header">Profiles</h2><p className="info-text" style={{marginBottom:"1rem"}}>Save/load tax profiles. Stored in browser. Form auto-saves on every change.</p><ProfileManager values={values} onLoad={loadProfile}/></div></div>}

      <footer className="app-footer"><p>For informational purposes only. Consult a Chartered Accountant for professional advice.</p></footer>
    </div></div>
  );
}