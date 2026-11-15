"use client";
import "./role-portal.css";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient, type User } from "@supabase/supabase-js";

type Role = "admin" | "manager" | "agent" | "client";
type Profile = { id: string; email?: string | null; display_name: string | null; role: Role; company_name?: string | null; parent_id?: string | null; created_at?: string };
type Wallet = { user_id: string; balance: number | string; currency: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
);

const roleNames: Record<Role, string> = {
  admin: "Administrator",
  manager: "Manager",
  agent: "Agent",
  client: "Client"
};

const navigation: Record<Role, string[]> = {
  admin: ["Overview", "Managers", "Agents", "Clients", "Wallets & Allocations", "SMS Reports", "SMS CDR", "Settlements", "SMS Rates", "Provider Settings"],
  manager: ["Overview", "My Agents", "Clients", "Allocate Balance", "Commission", "SMS Reports", "Settlements"],
  agent: ["Overview", "My Clients", "Allocate Balance", "Commission", "SMS Reports", "Settlements"],
  client: ["Overview", "Send SMS", "API Integration", "Delivery Reports", "Transactions", "My Account"]
};

const descriptions: Record<Role, string> = {
  admin: "Manage your SMS platform, accounts, balances and settlements.",
  manager: "Manage your agents, client activity and commission.",
  agent: "Manage your clients, balance allocations and commission.",
  client: "Send SMS through your connected website and track delivery."
};

export default function RolePortal({ expectedRole }: { expectedRole: Role }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [active, setActive] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [canListUsers, setCanListUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState<"manager" | "agent" | "client">("manager");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [parentId, setParentId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [allocationNote, setAllocationNote] = useState("");

  async function refreshDirectory() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,display_name,role,company_name,parent_id,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) {
      setUsers(data as Profile[]);
      setCanListUsers(true);
    }
  }

  async function refreshWallet(userId: string) {
    const { data } = await supabase.from("wallets")
      .select("user_id,balance,currency").eq("user_id", userId).maybeSingle();
    setWallet(data as Wallet | null);
  }

  useEffect(() => {
    let alive = true;
    const boot = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user ?? null;
      if (!alive) return;
      if (!currentUser) {
        window.location.replace("/login");
        return;
      }
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("id,email,display_name,role,company_name,parent_id,created_at")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (!alive) return;
      if (error || !profileData) {
        setNotice("Your account profile could not be loaded. Please contact the administrator.");
        setLoading(false);
        return;
      }
      const actualRole = profileData.role as Role;
      if (actualRole !== expectedRole) {
        window.location.replace("/" + actualRole);
        return;
      }
      setUser(currentUser);
      setProfile(profileData as Profile);
      const { data: walletData } = await supabase
        .from("wallets")
        .select("user_id,balance,currency")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (alive) setWallet(walletData as Wallet | null);

      if (actualRole === "admin") {
        const { data: profileRows, error: listError } = await supabase
          .from("profiles")
          .select("id,email,display_name,role,company_name,parent_id,created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        if (alive && !listError && profileRows) {
          setUsers(profileRows as Profile[]);
          setCanListUsers(true);
        }
      }
      if (alive) setLoading(false);
    };
    void boot();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) window.location.replace("/login");
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [expectedRole]);

  const title = roleNames[expectedRole];
  const stats = useMemo(() => {
    if (expectedRole === "admin") return [
      ["Total Accounts", canListUsers ? String(users.filter(x => x.role !== "admin").length) : "—", "Manager, Agent and Client accounts"],
      ["Platform Balance", "—", "Live consolidated wallet reporting is next"],
      ["SMS Today", "—", "Connect an SMS provider to enable live CDR"],
      ["Pending Settlements", "—", "Settlement workflow is next"]
    ];
    if (expectedRole === "manager") return [
      ["My Agents", "—", "Your assigned agent accounts"],
      ["Client SMS", "—", "Live reporting starts after provider setup"],
      ["Available Balance", wallet ? Number(wallet.balance).toFixed(2) + " " + wallet.currency : "—", "Your wallet balance"],
      ["Commission", "—", "Commission rules are next"]
    ];
    if (expectedRole === "agent") return [
      ["My Clients", "—", "Your assigned client accounts"],
      ["SMS Sent", "—", "Live reporting starts after provider setup"],
      ["Available Balance", wallet ? Number(wallet.balance).toFixed(2) + " " + wallet.currency : "—", "Your wallet balance"],
      ["Commission", "—", "Commission rules are next"]
    ];
    return [
      ["Available Balance", wallet ? Number(wallet.balance).toFixed(2) + " " + wallet.currency : "—", "Current wallet balance"],
      ["SMS Today", "—", "No live SMS provider connected"],
      ["Delivered", "—", "Delivery receipts not connected"],
      ["Failed", "—", "Delivery receipts not connected"]
    ];
  }, [expectedRole, canListUsers, users, wallet]);

  const selectedRoleUsers = users.filter(item => item.role === (active === "Managers" ? "manager" : active === "Agents" ? "agent" : "client"));
  const parentOptions = users.filter(item => item.role === (newRole === "agent" ? "manager" : "agent"));
  const allocationTargets = users.filter(item => item.role !== "admin");

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (newRole !== "manager" && !parentId) {
      setNotice(newRole === "agent" ? "Please select the Manager for this Agent." : "Please select the Agent for this Client.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-create-account", {
      body: {
        email: newEmail.trim(),
        password: newPassword,
        display_name: newName.trim(),
        company_name: newCompany.trim(),
        role: newRole,
        parent_id: newRole === "manager" ? null : parentId
      }
    });
    setSaving(false);
    if (error || data?.error) {
      setNotice(data?.error || error?.message || "Account create nahi ho saka.");
      return;
    }
    setNotice(newRole.toUpperCase() + " account successfully create ho gaya.");
    setNewName(""); setNewEmail(""); setNewCompany(""); setNewPassword(""); setParentId("");
    await refreshDirectory();
  }

  async function allocateBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const numericAmount = Number(amount);
    if (!targetId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setNotice("Target account aur valid amount select karein.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("allocate_wallet_balance", {
      p_target_user_id: targetId,
      p_amount: numericAmount,
      p_description: allocationNote.trim() || "Admin balance allocation"
    });
    setSaving(false);
    if (error) {
      setNotice(error.message);
      return;
    }
    setNotice("Balance successfully transfer ho gaya. Reference: " + String(data));
    setAmount(""); setAllocationNote("");
    if (user) await refreshWallet(user.id);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  if (loading) return <main className="portalLoading">Loading your secure workspace…</main>;

  return (
    <main className="portalShell">
      <aside className="portalSidebar">
        <div className="portalBrand"><span>V</span><b>VERTEX <i>SMS</i></b></div>
        <div className="portalIdentity">
          <div className="portalAvatar">{(profile?.display_name || user?.email || "V").slice(0, 1).toUpperCase()}</div>
          <b>{profile?.display_name || user?.email}</b>
          <small>{title}</small>
        </div>
        <nav className="portalNav">
          {navigation[expectedRole].map(item => (
            <button key={item} className={active === item ? "selected" : ""} onClick={() => { setActive(item); setNotice(""); }}>
              <span>{item === "Overview" ? "▦" : "›"}</span>{item}
            </button>
          ))}
        </nav>
        <button className="portalLogout" onClick={logout}>↪ Sign out</button>
      </aside>

      <section className="portalMain">
        <header className="portalTop">
          <div><small>VERTEX SMS / {title.toUpperCase()}</small><h1>{active}</h1></div>
          <div className="portalUser">{profile?.display_name || user?.email}<span>{title}</span></div>
        </header>
        {notice && <div className="portalNotice">{notice}</div>}

        {active === "Overview" ? <>
          <p className="portalIntro">{descriptions[expectedRole]}</p>
          <div className="portalStats">
            {stats.map(([label, value, hint]) => <article className="portalStat" key={label}><small>{label}</small><strong>{value}</strong><span>{hint}</span></article>)}
          </div>
          <section className="portalPanel">
            <div className="portalPanelHead"><div><h2>{expectedRole === "admin" ? "Account Directory" : "Getting Started"}</h2><p>{expectedRole === "admin" ? "All accounts created in your Vertex SMS workspace." : "Your role workspace is ready for the next integration steps."}</p></div></div>
            {expectedRole === "admin" && canListUsers ? (
              <div className="portalTableWrap"><table className="portalTable"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Company</th><th>Parent</th></tr></thead><tbody>
                {users.filter(item => item.role !== "admin").slice(0, 12).map(item => <tr key={item.id}><td>{item.display_name || "—"}</td><td>{item.email || "—"}</td><td><span className="portalRole">{item.role}</span></td><td>{item.company_name || "—"}</td><td>{users.find(p => p.id === item.parent_id)?.display_name || (item.role === "manager" ? "Admin" : "—")}</td></tr>)}
                {users.filter(item => item.role !== "admin").length === 0 && <tr><td colSpan={5}>Abhi koi Manager, Agent ya Client account nahi hai.</td></tr>}
              </tbody></table></div>
            ) : <div className="portalSteps">
              <div><b>01</b><span><strong>Account hierarchy</strong><small>Connect parent-child assignments and permissions.</small></span></div>
              <div><b>02</b><span><strong>Wallet & billing</strong><small>Enable secure balance transfers and transaction history.</small></span></div>
              <div><b>03</b><span><strong>SMS provider</strong><small>Connect an authorized SMS gateway for real sending and delivery receipts.</small></span></div>
            </div>}
          </section>
        </> : expectedRole === "admin" && ["Managers", "Agents", "Clients"].includes(active) ? (
          <div className="portalWorkGrid">
            <section className="portalPanel">
              <div className="portalPanelHead"><div><h2>{active} Directory</h2><p>{selectedRoleUsers.length} account(s) in this category</p></div></div>
              <div className="portalTableWrap"><table className="portalTable"><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Parent</th><th>Created</th></tr></thead><tbody>
                {selectedRoleUsers.map(item => <tr key={item.id}><td>{item.display_name || "—"}</td><td>{item.email || "—"}</td><td>{item.company_name || "—"}</td><td>{users.find(p => p.id === item.parent_id)?.display_name || "—"}</td><td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</td></tr>)}
                {selectedRoleUsers.length === 0 && <tr><td colSpan={5}>No {active.toLowerCase()} created yet.</td></tr>}
              </tbody></table></div>
            </section>
            <section className="portalPanel">
              <h2>Create New Account</h2>
              <p className="portalIntro">Admin-created accounts only. Login details user ko securely share karein.</p>
              <form className="portalForm" onSubmit={createAccount}>
                <label>Account Type<select value={newRole} onChange={e => { setNewRole(e.target.value as "manager" | "agent" | "client"); setParentId(""); }}><option value="manager">Manager</option><option value="agent">Agent</option><option value="client">Client</option></select></label>
                {newRole !== "manager" && <label>{newRole === "agent" ? "Assign Manager" : "Assign Agent"}<select required value={parentId} onChange={e => setParentId(e.target.value)}><option value="">Select {newRole === "agent" ? "Manager" : "Agent"}</option>{parentOptions.map(p => <option key={p.id} value={p.id}>{p.display_name || p.email} ({p.email || p.role})</option>)}</select></label>}
                <label>Full Name<input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Enter full name" /></label>
                <label>Email Address<input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@example.com" /></label>
                <label>Company Name<input value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Company (optional)" /></label>
                <label>Temporary Password<input required minLength={8} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" /></label>
                <button className="portalPrimary" disabled={saving}>{saving ? "Creating account..." : "Create " + newRole}</button>
              </form>
            </section>
          </div>
        ) : expectedRole === "admin" && active === "Wallets & Allocations" ? (
          <div className="portalWorkGrid">
            <section className="portalPanel">
              <h2>Allocate Balance</h2>
              <p className="portalIntro">Transfer funds from your Admin wallet to a Manager, Agent or Client wallet. Both sides are recorded in the ledger.</p>
              <div className="portalBalanceLine"><span>Admin Available Balance</span><strong>{wallet ? Number(wallet.balance).toFixed(2) + " " + wallet.currency : "Wallet not found"}</strong></div>
              <form className="portalForm" onSubmit={allocateBalance}>
                <label>Allocate To<select required value={targetId} onChange={e => setTargetId(e.target.value)}><option value="">Select account</option>{allocationTargets.map(p => <option key={p.id} value={p.id}>{p.display_name || p.email} — {p.role} ({p.email || "no email"})</option>)}</select></label>
                <label>Amount ({wallet?.currency || "USD"})<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></label>
                <label>Note (optional)<input value={allocationNote} onChange={e => setAllocationNote(e.target.value)} placeholder="Payment or allocation note" /></label>
                <button className="portalPrimary" disabled={saving || !allocationTargets.length}>{saving ? "Processing..." : "Transfer Balance"}</button>
              </form>
            </section>
            <section className="portalPanel"><h2>Account Wallets</h2><div className="portalTableWrap"><table className="portalTable"><thead><tr><th>Account</th><th>Role</th><th>Parent</th></tr></thead><tbody>{allocationTargets.map(p => <tr key={p.id}><td>{p.display_name || p.email}</td><td>{p.role}</td><td>{users.find(x => x.id === p.parent_id)?.display_name || "—"}</td></tr>)}{!allocationTargets.length && <tr><td colSpan={3}>Create an account first.</td></tr>}</tbody></table></div></section>
          </div>
        ) : <section className="portalPanel">
          <h2>{active}</h2>
          <p className="portalIntro">{active === "Send SMS" ? "SMS sending will be enabled after an authorized provider API/SMPP connection and billing controls are configured." : "This module is part of the Vertex SMS platform. Its live workflow will be connected in the next implementation step."}</p>
          <div className="portalNotice">No fake SMS, delivery receipts, balances or settlement records are generated.</div>
        </section>}
        <footer className="portalFooter">© 2026 Vertex SMS · Private messaging platform</footer>
      </section>
    </main>
  );
}
