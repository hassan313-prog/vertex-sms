"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient, type User } from "@supabase/supabase-js";

type SmsRow = { id:number; range:string; prefix:string; number:string; myPayout:string; manager:string; payout:string; limits:string; client:string; assigned:boolean };
type Profile = { display_name?: string; role?: string; avatar_url?: string; contact_no?: string; skype_id?: string; company_name?: string; address?: string; country?: string; server_ip?: string };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = url && key ? createClient(url, key) : null;
const demoSmsRows: SmsRow[] = [
  {id:1,range:"USA",prefix:"+1",number:"+1 202-555-0101",myPayout:"$0.025",manager:"—",payout:"$0.020",limits:"1 / 5",client:"Unassigned",assigned:false},
  {id:2,range:"USA",prefix:"+1",number:"+1 202-555-0102",myPayout:"$0.025",manager:"—",payout:"$0.020",limits:"0 / 5",client:"Unassigned",assigned:false},
  {id:3,range:"USA",prefix:"+1",number:"+1 202-555-0103",myPayout:"$0.030",manager:"Manager A",payout:"$0.022",limits:"3 / 5",client:"Client A",assigned:true},
  {id:4,range:"UK",prefix:"+44",number:"+44 7700 900001",myPayout:"$0.035",manager:"Manager B",payout:"$0.028",limits:"2 / 5",client:"Client B",assigned:true},
  {id:5,range:"UK",prefix:"+44",number:"+44 7700 900002",myPayout:"$0.035",manager:"—",payout:"$0.028",limits:"0 / 5",client:"Unassigned",assigned:false},
  {id:6,range:"India",prefix:"+91",number:"+91 XXXXX 10001",myPayout:"$0.018",manager:"Manager A",payout:"$0.014",limits:"1 / 3",client:"Client A",assigned:true},
  {id:7,range:"India",prefix:"+91",number:"+91 XXXXX 10002",myPayout:"$0.018",manager:"—",payout:"$0.014",limits:"0 / 3",client:"Unassigned",assigned:false},
  {id:8,range:"Canada",prefix:"+1",number:"+1 416-555-0101",myPayout:"$0.030",manager:"Manager C",payout:"$0.024",limits:"4 / 5",client:"Client C",assigned:true},
  {id:9,range:"Australia",prefix:"+61",number:"+61 490 000 101",myPayout:"$0.040",manager:"—",payout:"$0.032",limits:"0 / 5",client:"Unassigned",assigned:false},
  {id:10,range:"Germany",prefix:"+49",number:"+49 151 0000 0101",myPayout:"$0.038",manager:"Manager B",payout:"$0.030",limits:"2 / 5",client:"Client B",assigned:true},
  {id:11,range:"France",prefix:"+33",number:"+33 6 00 00 01 01",myPayout:"$0.036",manager:"—",payout:"$0.029",limits:"0 / 5",client:"Unassigned",assigned:false},
  {id:12,range:"Pakistan",prefix:"+92",number:"+92 300 0000101",myPayout:"$0.020",manager:"Manager C",payout:"$0.016",limits:"1 / 4",client:"Client C",assigned:true}
];
const blank: Profile = { display_name: "", contact_no: "", skype_id: "", company_name: "", address: "", country: "", server_ip: "" };
const menus = [
  ["Dashboard", "▦"],
  ["SMS Module", "▣", ["SMS Numbers", "SMS Ratecard", "Bulk Allocation", "Self Allocation"]],
  ["SMS Test Panel", "⌁"],
  ["Managers", "♙"],
  ["SMS Report & Stats", "▤", ["SMS Reports", "SMS Stats", "SMS Range Stats", "SMS Number Stats", "SMS Manager Stats"]],
  ["Payment Requests", "＄"],
  ["Statements", "▥", ["USD Statements", "EUR Statements", "GBP Statement"]],
  ["CLI Search", "⌕"]
] as const;
const words: Record<string, string[]> = {
  English: ["Hi, Welcome back!", "Dashboard", "EXPENSES", "PROFIT", "Today", "This Week", "SMS", "Gen. SMS", "Est. Revenue", "Delivery Rate"],
  Urdu: ["خوش آمدید!", "ڈیش بورڈ", "اخراجات", "منافع", "آج", "اس ہفتے", "ایس ایم ایس", "جنرل ایس ایم ایس", "متوقع آمدنی", "ڈیلیوری ریٹ"],
  Hindi: ["वापसी पर स्वागत है!", "डैशबोर्ड", "खर्च", "लाभ", "आज", "इस सप्ताह", "एसएमएस", "जनरल एसएमएस", "अनुमानित आय", "डिलीवरी दर"]
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>({});
  const [form, setForm] = useState<Profile>(blank);
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [a, setA] = useState(3);
  const [b, setB] = useState(5);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [expanded, setExpanded] = useState("");
  const [page, setPage] = useState("Dashboard");
  const [language, setLanguage] = useState("English");
  const dark = true;
  const [pop, setPop] = useState("");
  const [show, setShow] = useState(false);
  const [smsRows, setSmsRows] = useState<SmsRow[]>(demoSmsRows);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocateManager, setAllocateManager] = useState("");
  const [allocatePayterm, setAllocatePayterm] = useState("Daily");
  const [allocatePayout, setAllocatePayout] = useState("0");
  const [selectedSms, setSelectedSms] = useState<number[]>([]);
  const [smsRange, setSmsRange] = useState("All Ranges");
  const [smsClient, setSmsClient] = useState("All Clients");
  const [smsAssignment, setSmsAssignment] = useState("All Numbers");
  const [appliedRange, setAppliedRange] = useState("All Ranges");
  const [appliedClient, setAppliedClient] = useState("All Clients");
  const [appliedAssignment, setAppliedAssignment] = useState("All Numbers");
  const [smsSearch, setSmsSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);

  const t = words[language] || words.English;
  const filteredSms = smsRows.filter(row =>
    (appliedRange === "All Ranges" || row.range === appliedRange) &&
    (appliedClient === "All Clients" || row.client === appliedClient) &&
    (appliedAssignment === "All Numbers" || (appliedAssignment === "Assigned" ? row.assigned : !row.assigned)) &&
    [row.range,row.prefix,row.number,row.myPayout,row.manager,row.payout,row.limits,row.client].some(v => v.toLowerCase().includes(smsSearch.toLowerCase()))
  );
  const visibleSms = filteredSms.slice(0, pageSize);
  function toggleSms(id:number) { setSelectedSms(old => old.includes(id) ? old.filter(x => x !== id) : [...old,id]); }
  function smsExportRows() { return filteredSms.map(r => [r.range,r.prefix,r.number,r.myPayout,r.manager,r.payout,r.limits]); }
  function downloadSms(name:string, content:string, type:string) {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
  }
  function exportSmsCsv() {
    const rows = [["RANGE","PREFIX","NUMBER","MY PAYOUT","Manager","Payout","Limits"],...smsExportRows()];
    downloadSms("sms-numbers.csv", rows.map(row => row.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(",")).join("\\n"), "text/csv;charset=utf-8");
  }
  function exportSmsExcel() {
    const headers = ["RANGE","PREFIX","NUMBER","MY PAYOUT","Manager","Payout","Limits"];
    const table = "<table><tr>" + headers.map(x=>"<th>"+x+"</th>").join("") + "</tr>" + smsExportRows().map(row=>"<tr>"+row.map(v=>"<td>"+String(v)+"</td>").join("")+"</tr>").join("") + "</table>";
    downloadSms("sms-numbers.xls", "<html><meta charset='utf-8'><body>"+table+"</body></html>", "application/vnd.ms-excel");
  }
  async function copySms() {
    const rows = [["RANGE","PREFIX","NUMBER","MY PAYOUT","Manager","Payout","Limits"],...smsExportRows()];
    await navigator.clipboard.writeText(rows.map(r=>r.join("\\t")).join("\\n"));
    setSuccess("SMS numbers copied to clipboard."); setTimeout(()=>setSuccess(""),2500);
  }
  function printSms() {
    const headers=["RANGE","PREFIX","NUMBER","MY PAYOUT","Manager","Payout","Limits"];
    const w=window.open("","_blank","width=1000,height=700");
    if(!w) return;
    w.document.write("<html><head><title>SMS Numbers</title><style>body{font:12px Arial;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:8px;text-align:left}th{background:#dce8f7}</style></head><body><h2>SMS Numbers</h2><table><tr>"+headers.map(x=>"<th>"+x+"</th>").join("")+"</tr>"+smsExportRows().map(row=>"<tr>"+row.map(v=>"<td>"+String(v)+"</td>").join("")+"</tr>").join("")+"</table></body></html>");
    w.document.close(); w.focus(); w.print();
  }
  const panel = dark ? "#0b1e35" : "#fff";
  const ink = dark ? "#f4f7fc" : "#17263b";
  const border = dark ? "#294363" : "#d9e1ec";

  async function loadProfile(active: User) {
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", active.id).maybeSingle();
    setProfile(data || {});
    setForm({ ...blank, ...(data || {}) });
    setEmail(active.email || "");
  }

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const active = data.session?.user || null;
      setUser(active);
      if (active) loadProfile(active);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const active = session?.user || null;
      setUser(active);
      if (active) loadProfile(active);
      else { setProfile({}); setForm(blank); setPage("Dashboard"); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function newCaptcha() {
    setA(Math.floor(Math.random() * 8) + 2);
    setB(Math.floor(Math.random() * 8) + 1);
    setAnswer("");
  }

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setSuccess("");
    if (Number(answer) !== a + b) { setError("Captcha ka jawab sahi nahi hai."); newCaptcha(); return; }
    if (!supabase) { setError("Supabase configuration missing. Check Vercel environment variables."); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password });
    if (error) setError(error.message);
    else if (data.user) { setUser(data.user); await loadProfile(data.user); }
    setBusy(false);
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase || !user) return;
    setBusy(true); setError(""); setSuccess("");
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) { setError(error.message); setBusy(false); return; }
    if (email.trim() && email.trim() !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
      if (emailError) setError("Profile saved. Email update: " + emailError.message);
    }
    setProfile({ ...profile, ...form }); setSuccess("Profile updated successfully."); setBusy(false);
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase || !user) return;
    setError(""); setSuccess("");
    if (next !== confirm) { setError("New password and confirmation do not match."); return; }
    if (next.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true);
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email || "", password: current });
    if (verifyError) { setError("Current password is incorrect."); setBusy(false); return; }
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) setError(error.message);
    else { setSuccess("Password updated successfully."); setCurrent(""); setNext(""); setConfirm(""); }
    setBusy(false);
  }

  async function logout() { if (supabase) await supabase.auth.signOut(); setPop(""); setDrawer(false); }

  function updateField(name: keyof Profile, value: string) { setForm(old => ({ ...old, [name]: value })); }
  function field(label: string, name: keyof Profile, area = false) {
    return <div className="fieldWrap" key={name}><label>{label}</label>{area
      ? <textarea className="field" rows={4} value={String(form[name] || "")} onChange={e => updateField(name, e.target.value)} />
      : <input className="field" value={String(form[name] || "")} onChange={e => updateField(name, e.target.value)} />}</div>;
  }

  if (!user) return <main className="loginShell">
    <section className="loginCard">
      <div className="brand"><span className="brandMark">V</span><span>VERTEX <b>SMS</b></span></div>
      <small className="eyebrow">SECURE CONTROL PANEL</small>
      <h1>Welcome back<span className="period">.</span></h1>
      <p className="loginSub">Sign in to manage your private numbers and services.</p>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={login}>
        <label>Email address</label><input className="loginInput" type="email" autoComplete="username" placeholder="Enter your email address" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
        <div className="passwordLabel"><label>Password</label><button type="button" className="textButton" onClick={() => setShow(!show)}>{show ? "HIDE" : "SHOW"}</button></div>
        <input className="loginInput" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={e => setPassword(e.target.value)} />
        <div className="captchaBox"><div><small>SECURITY CHECK</small><strong>{a} + {b} = ?</strong></div><input aria-label="Captcha answer" inputMode="numeric" placeholder="Answer" required value={answer} onChange={e => setAnswer(e.target.value)} /></div>
        <button className="signIn" disabled={busy}>{busy ? "Signing in..." : <>Sign in <span>→</span></>}</button>
      </form>
      <footer className="loginFooter"><i /> Protected by Supabase Authentication</footer>
    </section>
    <p className="copyright">© 2026 Vertex SMS. All rights reserved.</p>
  </main>;

  return <main className="appShell" style={{ background: dark ? "#06172b" : "#f2f5fa", color: ink }}>
    <header className="topbar" style={{ background: panel, borderColor: border }}>
      <div className="leftHead"><button className="hamburger" aria-label="Open menu" onClick={() => setDrawer(true)}><span/><span/><span/></button><div className="brand compact"><span className="brandMark">V</span><span><span className="brandVertex">VERTEX</span> <b>SMS</b></span></div></div>
      <div className="rightHead">
        <div className="headControl"><button className="headIcon" title="Language" onClick={() => setPop(pop === "language" ? "" : "language")}>◎</button>{pop === "language" && <div className="popup">{["English","Urdu","Hindi"].map(x => <button key={x} onClick={() => { setLanguage(x); setPop(""); }}>{x}</button>)}</div>}</div>
        <div className="headControl"><button className="headIcon" title="Dark theme" aria-label="Dark theme">☾</button></div>
        <div className="headControl"><button className="avatarButton" title="Profile" onClick={() => setPop(pop === "profile" ? "" : "profile")}>{profile.avatar_url ? <img src={profile.avatar_url} alt="Profile"/> : (profile.display_name || user.email || "V").slice(0,1).toUpperCase()}</button>{pop === "profile" && <div className="popup profilePopup"><b>{profile.display_name || user.email}</b>{["My Profile","Notification","Activity Logs","Logout"].map(x => <button key={x} onClick={() => { setPop(""); if (x === "Logout") logout(); else { setPage(x); setError(""); setSuccess(""); } }}>{x}</button>)}</div>}</div>
      </div>
    </header>

    {drawer && <button className="veil" aria-label="Close menu" onClick={() => setDrawer(false)} />}
    <aside className="sidebar" style={{ display: drawer ? "block" : "none", background: dark ? "#0d1d32" : "#fff", color: ink, borderColor: border }}>
      <div className="userBlock"><div className="bigAvatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="Profile"/> : (profile.display_name || user.email || "V").slice(0,1).toUpperCase()}</div><b>{profile.display_name || user.email}</b><small>{profile.role || "Client"}</small>
        <div className="quick"><button type="button" title="Settings" aria-label="Settings">⚙</button><button type="button" title="Notification" aria-label="Notification">✉</button><button type="button" title="Profile" aria-label="Profile">♙</button><button type="button" title="Logout" aria-label="Logout">↪</button></div>
      </div>
      <nav className="navList">{menus.map(item => <div key={item[0]}><button className={"navItem " + (page === item[0] ? "active" : "")} onClick={() => { if (item[2]) setExpanded(expanded === item[0] ? "" : item[0]); else { setPage(item[0]); setDrawer(false); } }}><span className="navIcon">{item[1]}</span><span className="navText">{item[0]}</span>{item[2] && <span className="chevron">{expanded === item[0] ? "⌄" : "›"}</span>}</button>{item[2] && expanded === item[0] && <div className="subNav">{item[2].map(child => <button key={child} onClick={() => { setPage(child); setDrawer(false); }}>{child}</button>)}</div>}</div>)}</nav>
    </aside>

    <section className="mainContent">
      <div className="pageHeading"><h1>{page === "Dashboard" ? t[1] : page}</h1><div className="breadcrumb">⌂　›　{page === "SMS Numbers" ? <>SMS Module　›　SMS Numbers</> : page === "Dashboard" ? t[1] : page}</div></div>
      {error && <div className="alert error">{error}</div>}{success && <div className="alert success">{success}</div>}
      {page === "My Profile" ? <>
        <p className="muted">Manage your personal information and account security</p>
        <div className="profileGrid">
          <form className="profileCard" onSubmit={saveProfile}><h2>Update Your Profile</h2>
            {field("Your Name","display_name")}
            <div className="fieldWrap"><label>Your Email</label><input className="field" type="email" required value={email} onChange={e => setEmail(e.target.value)}/></div>
            {field("Contact No.","contact_no")}{field("Skype ID","skype_id")}{field("Company Name","company_name")}{field("Address","address",true)}{field("Country","country")}{field("Your Server IP (if any)","server_ip")}
            <button className="blueButton" disabled={busy}>Update</button>
          </form>
          <form className="profileCard" onSubmit={savePassword}><h2>Update Your Password</h2>
            <div className="fieldWrap"><label>Current Password</label><input className="field" type="password" required value={current} onChange={e => setCurrent(e.target.value)}/></div>
            <div className="fieldWrap"><label>New Password</label><input className="field" type="password" required value={next} onChange={e => setNext(e.target.value)}/></div>
            <div className="fieldWrap"><label>Confirm Password</label><input className="field" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}/></div>
            <button className="blueButton" disabled={busy}>Update</button><p className="muted hint">Use at least 8 characters.</p>
          </form>
        </div>
      </> : page === "Dashboard" ? <>
        <p className="welcomeText">{t[0]}</p>
        <div className="totals"><div><span>{t[2]}</span><b>$3.32</b></div><div><span>{t[3]}</span><b>$3.32</b></div></div>
        <div className="metricGrid">
          {[
            { icon:"▤", name:t[6], label:t[4], value:"198", label2:t[5], value2:"2322", color:"#e34b70" },
            { icon:"◷", name:t[7], label:t[4], value:"0 | $ 0", label2:t[5], value2:"0 | $ 0", color:"#20b889" },
            { icon:"＄", name:t[8], label:t[4], value:"$ 3.32", label2:t[5], value2:"$ 39.51", color:"#ed8b24" },
            { icon:"▣", name:t[9], label:"Estimated", value:"99.9467%", color:"#18aa81" }
          ].map(card => <article className="metricCard" key={card.name} style={{ background:panel, borderColor:border }}><div className="metricIcon" style={{ background:card.color }}>{card.icon}</div><div className="metricBody"><b>{card.name}</b><div><span>{card.label}</span><strong>{card.value}</strong></div>{card.value2 && <div><span>{card.label2}</span><strong>{card.value2}</strong></div>}</div></article>)}
        </div>
      </> : page === "SMS Numbers" ? <>
        <div className="smsActionRow">
          <button className="smsSelectAll" onClick={()=>{if(selectedSms.length===0){setError("Pehle numbers select karein.");return;}setAllocateOpen(true);setError("");}}>✓ <span>Allocate</span></button>
          <button className="smsDeselect" onClick={()=>setSelectedSms([])}>✕ <span>Deselect</span></button>
          <span className="smsSelectedCount">{selectedSms.length} selected</span>
        </div>
        <section className="smsFilterCard">
          <div className="smsFilterGrid">
            <label>Select Range<select value={smsRange} onChange={e=>setSmsRange(e.target.value)}><option>All Ranges</option>{Array.from(new Set(smsRows.map(r=>r.range))).map(x=><option key={x}>{x}</option>)}</select></label>
            <label>Select Client<select value={smsClient} onChange={e=>setSmsClient(e.target.value)}><option>All Clients</option><option>Unassigned</option>{Array.from(new Set(smsRows.filter(r=>r.assigned).map(r=>r.client))).map(x=><option key={x}>{x}</option>)}</select></label>
            <label>All Numbers<select value={smsAssignment} onChange={e=>setSmsAssignment(e.target.value)}><option>All Numbers</option><option>Assigned</option><option>Unassigned</option></select></label>
          </div>
          <button className="blueButton" onClick={()=>{setAppliedRange(smsRange);setAppliedClient(smsClient);setAppliedAssignment(smsAssignment);setSelectedSms([]);}}>Filter</button>
        </section>
        <section className="smsTableCard">
          <div className="smsTableTop">
            <label className="smsShowEntries">Show <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select> entries</label>
            <label className="smsSearch">Search: <input value={smsSearch} onChange={e=>setSmsSearch(e.target.value)} placeholder="Search numbers..." /></label>
          </div>
          <div className="smsExportRow">
            <button onClick={copySms}>Copy</button><button onClick={exportSmsCsv}>CSV</button><button onClick={exportSmsExcel}>Excel</button><button onClick={printSms}>PDF</button><button onClick={printSms}>Print</button>
          </div>
          <div className="smsTableScroll"><table className="smsTable"><thead><tr><th><input type="checkbox" aria-label="Select visible rows" checked={visibleSms.length>0 && visibleSms.every(r=>selectedSms.includes(r.id))} onChange={e=>setSelectedSms(e.target.checked ? Array.from(new Set([...selectedSms,...visibleSms.map(r=>r.id)])) : selectedSms.filter(id=>!visibleSms.some(r=>r.id===id)))}/></th><th>RANGE</th><th>PREFIX</th><th>NUMBER</th><th>MY PAYOUT</th><th>Manager</th><th>Payout</th><th>Limits</th></tr></thead>
            <tbody>{visibleSms.map(row=><tr key={row.id}><td><input type="checkbox" aria-label={"Select "+row.number} checked={selectedSms.includes(row.id)} onChange={()=>toggleSms(row.id)}/></td><td>{row.range}</td><td>{row.prefix}</td><td className="smsNumber">{row.number}</td><td>{row.myPayout}</td><td>{row.manager}</td><td>{row.payout}</td><td>{row.limits}</td></tr>)}
              {visibleSms.length===0 && <tr><td colSpan={8} className="smsEmpty">No matching numbers found.</td></tr>}
            </tbody></table></div>
          <div className="smsTableFoot">Showing {visibleSms.length ? 1 : 0} to {visibleSms.length} of {filteredSms.length} entries</div>
          <p className="smsDemoNote">Demo entries shown — live SMS inventory database connection is pending.</p>
        {allocateOpen && <div className="allocateOverlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAllocateOpen(false);}}><section className="allocateModal" role="dialog" aria-modal="true" aria-labelledby="allocateTitle"><h2 id="allocateTitle">Allocate All Numbers</h2><p className="allocateCount">{selectedSms.length} numbers selected</p><label>Select Manager<select value={allocateManager} onChange={e=>setAllocateManager(e.target.value)}><option value="">Please Select</option><option>Manager A</option><option>Manager B</option><option>Manager C</option></select></label><label>Payterm<select value={allocatePayterm} onChange={e=>setAllocatePayterm(e.target.value)}><option>Daily</option><option>Weekly 7</option><option>Monthly 30</option></select></label><label>Payout<input type="number" min="0" step="0.0001" value={allocatePayout} onChange={e=>setAllocatePayout(e.target.value)} /></label><div className="allocateButtons"><button type="button" className="allocateClose" onClick={()=>setAllocateOpen(false)}>Close</button><button type="button" className="allocateSubmit" onClick={()=>{if(!allocateManager){setError("Please select a manager.");return;}if(allocatePayout.trim()==="" || Number(allocatePayout)<0){setError("Please enter a valid payout.");return;}setSmsRows(old=>old.map(row=>selectedSms.includes(row.id)?{...row,manager:allocateManager,client:allocateManager,assigned:true,payout:"$"+Number(allocatePayout).toFixed(4)}:row));setSelectedSms([]);setAllocateOpen(false);setSuccess("Selected demo numbers allocated to "+allocateManager+".");setTimeout(()=>setSuccess(""),3000);}}>Allocate</button></div></section></div>}
        </section>
      </> : <div className="placeholderCard" style={{ background:panel, borderColor:border }}><h2>{page}</h2><p className="muted">Module integration is coming next.</p></div>}
      <footer className="appFooter">Copyright © 2026 VERTEX SMS.</footer>
    </section>
  </main>;
}
