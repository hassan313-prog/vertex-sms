"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient, type User } from "@supabase/supabase-js";

type SmsRow = { id:number; range:string; prefix:string; number:string; myPayout:string; manager:string; payout:string; limits:string; client:string; assigned:boolean; managerId:string|null };
type ManagerOption = { id:string; display_name:string };
type RateRow = { id:number; range_name:string; currency:string; payout_1_1:string; payout_7_1:string; payout_7_7:string };
type Profile = { display_name?: string; role?: string; avatar_url?: string; contact_no?: string; skype_id?: string; company_name?: string; address?: string; country?: string; server_ip?: string };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = url && key ? createClient(url, key) : null;
const blank: Profile = { display_name: "", contact_no: "", skype_id: "", company_name: "", address: "", country: "", server_ip: "" };
const menus = [
  ["Dashboard", "▦"],
  ["SMS Module", "▣", ["SMS Numbers", "SMS Ratecard", "Bulk Allocation", "Self Allocation"]],
  ["SMS Test Panel", "⌁"],
  ["Clients", "♙"],
  ["Managers", "♙"],
  ["SMS Report & Stats", "▤", ["SMS Reports", "SMS Stats", "SMS Range Stats", "SMS Number Stats", "SMS Manager Stats"]],
  ["Payment Requests", "＄"],
  ["Statements", "▥", ["USD Statements", "EUR Statements", "GBP Statement"]],
  ["CLI Search", "⌕"],
  ["CR API", "⌘"],
  ["BOT AI/APIs", "◉"],
  ["API Keys", "⌑"],
  ["Support", "?" ]
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
  const [smsRows, setSmsRows] = useState<SmsRow[]>([]);
  const [rateRows, setRateRows] = useState<RateRow[]>([]);
  const [rateSearch, setRateSearch] = useState("");
  const [rateForm, setRateForm] = useState({ range_name:"", currency:"USD", payout_1_1:"NA", payout_7_1:"", payout_7_7:"NA" });
  const [smsManagers, setSmsManagers] = useState<ManagerOption[]>([]);
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
    downloadSms("sms-numbers.csv", rows.map(row => row.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(",")).join("\n"), "text/csv;charset=utf-8");
  }
  function exportSmsExcel() {
    const headers = ["RANGE","PREFIX","NUMBER","MY PAYOUT","Manager","Payout","Limits"];
    const table = "<table><tr>" + headers.map(x=>"<th>"+x+"</th>").join("") + "</tr>" + smsExportRows().map(row=>"<tr>"+row.map(v=>"<td>"+String(v)+"</td>").join("")+"</tr>").join("") + "</table>";
    downloadSms("sms-numbers.xls", "<html><meta charset='utf-8'><body>"+table+"</body></html>", "application/vnd.ms-excel");
  }
  async function copySms() {
    const rows = [["RANGE","PREFIX","NUMBER","MY PAYOUT","Manager","Payout","Limits"],...smsExportRows()];
    await navigator.clipboard.writeText(rows.map(r=>r.join("\t")).join("\n"));
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

  async function loadRatecard() {
    if (!supabase) return;
    const { data, error } = await supabase.from("sms_ratecard").select("id,range_name,currency,payout_1_1,payout_7_1,payout_7_7").order("range_name", { ascending:true });
    if (error) { setError("Could not load SMS RateCard: " + error.message); return; }
    setRateRows((data || []) as RateRow[]);
  }

  async function addRateRange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !user) { setError("Please sign in to add a range."); return; }
    const range = rateForm.range_name.trim();
    if (!range) { setError("Range name is required."); return; }
    setBusy(true); setError(""); setSuccess("");
    const { error } = await supabase.from("sms_ratecard").insert({
      range_name: range,
      currency: rateForm.currency.trim() || "USD",
      payout_1_1: rateForm.payout_1_1.trim() || "NA",
      payout_7_1: rateForm.payout_7_1.trim() || "NA",
      payout_7_7: rateForm.payout_7_7.trim() || "NA",
      created_by: user.id
    });
    if (error) { setError(error.code === "23505" ? "This range already exists in the RateCard." : "Could not add range: " + error.message); setBusy(false); return; }
    setRateForm({ range_name:"", currency:"USD", payout_1_1:"NA", payout_7_1:"", payout_7_7:"NA" });
    await loadRatecard(); setSuccess("New operator range saved successfully."); setBusy(false);
  }

  function exportRatecard() {
    const rows = [["RANGE","CURRENCY","1/1","7/1","7/7"], ...rateRows.filter(r => [r.range_name,r.currency,r.payout_1_1,r.payout_7_1,r.payout_7_7].some(v => String(v).toLowerCase().includes(rateSearch.toLowerCase()))).map(r => [r.range_name,r.currency,r.payout_1_1,r.payout_7_1,r.payout_7_7])];
    downloadSms("vertex-ratecard.csv", rows.map(row => row.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n"), "text/csv;charset=utf-8");
  }

  async function loadSmsInventory(active: User) {
    if (!supabase) return;
    const { data: managerData, error: managerError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("role", "manager")
      .order("display_name", { ascending: true });
    if (managerError) { setError("Could not load managers: " + managerError.message); return; }
    const managers = (managerData || []) as ManagerOption[];
    setSmsManagers(managers);
    const managerNames = new Map(managers.map(item => [item.id, item.display_name || "Manager"]));
    const allRows: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("number_inventory")
        .select("id, range_name, prefix, phone_number, my_payout, payterm, client, client_payout, limits, manager_id")
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (error) { setError("Could not load SMS numbers: " + error.message); return; }
      allRows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    setSmsRows(allRows.map(row => ({
      id: Number(row.id),
      range: row.range_name || "",
      prefix: row.prefix || "—",
      number: row.phone_number || "",
      myPayout: (row.payterm ? row.payterm + " " : "") + "$" + Number(row.my_payout || 0).toFixed(3),
      manager: row.manager_id ? (managerNames.get(row.manager_id) || "Manager") : "—",
      payout: row.client_payout == null ? "—" : "$" + Number(row.client_payout).toFixed(3),
      limits: row.limits || "—",
      client: row.client || "Unassigned",
      assigned: Boolean(row.manager_id || row.client),
      managerId: row.manager_id || null
    })));
  }

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const active = data.session?.user || null;
      setUser(active);
      if (active) { loadProfile(active); loadSmsInventory(active); loadRatecard(); }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const active = session?.user || null;
      setUser(active);
      if (active) { loadProfile(active); loadSmsInventory(active); loadRatecard(); }
      else { setProfile({}); setForm(blank); setSmsRows([]); setSmsManagers([]); setRateRows([]); setPage("Dashboard"); }
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
          <p className="smsDemoNote">Live inventory · {smsRows.length.toLocaleString()} numbers loaded from your Excel file.</p>
        {allocateOpen && <div className="allocateOverlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAllocateOpen(false);}}><section className="allocateModal" role="dialog" aria-modal="true" aria-labelledby="allocateTitle"><h2 id="allocateTitle">Allocate All Numbers</h2><p className="allocateCount">{selectedSms.length} numbers selected</p><label>Select Manager<select value={allocateManager} onChange={e=>setAllocateManager(e.target.value)}><option value="">Please Select</option>{smsManagers.map(manager=><option key={manager.id} value={manager.id}>{manager.display_name || "Manager"}</option>)}</select>{smsManagers.length===0 && <small className="muted">No managers added yet.</small>}</label><label>Payterm<select value={allocatePayterm} onChange={e=>setAllocatePayterm(e.target.value)}><option>Daily</option><option>Weekly 7</option><option>Monthly 30</option></select></label><label>Payout<input type="number" min="0" step="0.0001" value={allocatePayout} onChange={e=>setAllocatePayout(e.target.value)} /></label><div className="allocateButtons"><button type="button" className="allocateClose" onClick={()=>setAllocateOpen(false)}>Close</button><button type="button" className="allocateSubmit" onClick={async()=>{if(!allocateManager){setError("Please select a manager.");return;}if(allocatePayout.trim()==="" || Number(allocatePayout)<0){setError("Please enter a valid payout.");return;}if(!supabase){setError("Database connection is unavailable.");return;}setBusy(true);const manager=smsManagers.find(item=>item.id===allocateManager);const {error:allocationError}=await supabase.from("number_inventory").update({manager_id:allocateManager,client:manager?.display_name || null,payterm:allocatePayterm,client_payout:Number(allocatePayout),sell_price:Number(allocatePayout)}).in("id",selectedSms);if(allocationError){setError("Allocation failed: "+allocationError.message);setBusy(false);return;}if(user) await loadSmsInventory(user);setSelectedSms([]);setAllocateOpen(false);setSuccess("Selected numbers allocated to "+(manager?.display_name || "manager")+".");setTimeout(()=>setSuccess(""),3000);setBusy(false);}}>Allocate</button></div></section></div>}
        </section>
      </> : page === "SMS Ratecard" ? <>
        <div className="rateTop"><div><p className="muted">SMS Module &gt; SMS RateCard</p><span className="rateCount">{rateRows.length} operator ranges</span></div><button className="blueButton" type="button" onClick={exportRatecard}>Export CSV</button></div>
        <section className="smsTableCard">
          <div className="smsTableTop"><label className="smsSearch">Search: <input value={rateSearch} onChange={e=>setRateSearch(e.target.value)} placeholder="Search range..." /></label><div className="rateTools"><button onClick={async()=>{const txt=[["RANGE","CURRENCY","1/1","7/1","7/7"],...rateRows.map(r=>[r.range_name,r.currency,r.payout_1_1,r.payout_7_1,r.payout_7_7])].map(r=>r.join("\t")).join("\n");await navigator.clipboard.writeText(txt);setSuccess("RateCard copied.");}}>Copy</button><button onClick={()=>window.print()}>PDF / Print</button></div></div>
          <div className="smsTableScroll"><table className="smsTable rateTable"><thead><tr><th>RANGE</th><th>CURRENCY</th><th>1/1</th><th>7/1</th><th>7/7</th></tr></thead><tbody>
            {rateRows.filter(r=>[r.range_name,r.currency,r.payout_1_1,r.payout_7_1,r.payout_7_7].some(v=>String(v).toLowerCase().includes(rateSearch.toLowerCase()))).map(r=><tr key={r.id}><td>{r.range_name}</td><td>{r.currency}</td><td className={r.payout_1_1==="NA"?"rateNA":""}>{r.payout_1_1==="NA"?"NA":"$"+r.payout_1_1}</td><td className={r.payout_7_1==="NA"?"rateNA":""}>{r.payout_7_1==="NA"?"NA":"$"+r.payout_7_1}</td><td className={r.payout_7_7==="NA"?"rateNA":""}>{r.payout_7_7==="NA"?"NA":"$"+r.payout_7_7}</td></tr>)}
            {rateRows.length===0 && <tr><td colSpan={5} className="smsEmpty">No operator ranges have been added.</td></tr>}
          </tbody></table></div>
          <div className="smsTableFoot">Showing {rateRows.filter(r=>[r.range_name,r.currency,r.payout_1_1,r.payout_7_1,r.payout_7_7].some(v=>String(v).toLowerCase().includes(rateSearch.toLowerCase()))).length} of {rateRows.length} entries</div>
        </section>
        <section className="rateFormCard"><h2>＋ Add New Range</h2><p className="muted">Operator ki di hui range aur payout yahan save karein.</p>
          <form className="rateForm" onSubmit={addRateRange}>
            <label>Range<input required value={rateForm.range_name} onChange={e=>setRateForm(v=>({...v,range_name:e.target.value}))} placeholder="e.g. Pakistan-WhatsApp-1"/></label>
            <label>Currency<input value={rateForm.currency} onChange={e=>setRateForm(v=>({...v,currency:e.target.value}))} placeholder="USD"/></label>
            <label>Payout 1/1<input value={rateForm.payout_1_1} onChange={e=>setRateForm(v=>({...v,payout_1_1:e.target.value}))} placeholder="NA or 0.020"/></label>
            <label>Payout 7/1<input value={rateForm.payout_7_1} onChange={e=>setRateForm(v=>({...v,payout_7_1:e.target.value}))} placeholder="0.012"/></label>
            <label>Payout 7/7<input value={rateForm.payout_7_7} onChange={e=>setRateForm(v=>({...v,payout_7_7:e.target.value}))} placeholder="NA or 0.010"/></label>
            <button className="blueButton" disabled={busy}>{busy?"Saving...":"+ Add Range"}</button>
          </form>
        </section>
      </> : page === "SMS Test Panel" ? <>
        <section className="rateFormCard"><h2>SMS Test Panel</h2><p className="muted">Provider connection is required before a real number or OTP can be requested.</p><div className="rateForm"><label>Country<select className="field"><option>Pakistan</option><option>Kyrgyzstan</option><option>Burundi</option><option>Zambia</option><option>Bosnia and Herzegovina</option></select></label><label>Service<select className="field"><option>WhatsApp</option><option>Telegram</option><option>Google</option><option>SMS</option></select></label></div><p className="moduleNotice">No test number is issued yet. This panel will use the connected SMS provider API.</p></section>
      </> : page === "Clients" ? <>
        <section className="rateFormCard"><h2>Clients</h2><p className="muted">Client accounts are managed through authenticated profiles.</p><p className="moduleNotice">Client list is being connected to role-based profile management. No sample client records are shown as real accounts.</p></section>
      </> : page === "CR API" ? <>
        <section className="rateFormCard"><h2>CR API</h2><p className="muted">API integration settings</p><p className="moduleNotice">API endpoint and authentication key are not configured yet. A live API key will be generated securely before use.</p></section>
      </> : page === "BOT AI/APIs" ? <>
        <section className="rateFormCard"><h2>BOT AI / APIs</h2><p className="moduleNotice">Telegram bot connection is not configured yet.</p></section>
      </> : page === "API Keys" ? <>
        <section className="rateFormCard"><h2>API Keys</h2><p className="moduleNotice">No API keys have been generated. Do not use demo keys from the sample HTML.</p></section>
      </> : page === "Support" ? <>
        <section className="rateFormCard"><h2>Support</h2><p className="moduleNotice">Support contact details can be added in the panel settings.</p></section>
      </> : <div className="placeholderCard" style={{ background:panel, borderColor:border }}><h2>{page}</h2><p className="muted">Module integration is coming next.</p></div>}
      <footer className="appFooter">Copyright © 2026 VERTEX SMS.</footer>
    </section>
  </main>;
}
