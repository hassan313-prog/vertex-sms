"use client";
import "./role-portal.css";

import { useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

type Role = "admin" | "manager" | "agent" | "client";
type Profile = { id: string; display_name: string | null; role: Role; company_name?: string | null; created_at?: string };
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
        .select("id,display_name,role,company_name,created_at")
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
          .select("id,display_name,role,company_name,created_at")
          .order("created_at", { ascending: false })
          .limit(100);
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
      ["Total Accounts", canListUsers ? String(users.length) : "—", "Profiles visible to admin"],
      ["Platform Balance", "—", "Wallet totals require secure ledger aggregation"],
      ["SMS Today", "—", "Connect an SMS provider to enable live CDR"],
      ["Pending Settlements", "—", "Settlement workflow not configured yet"]
    ];
    if (expectedRole === "manager") return [
      ["My Agents", "—", "Hierarchical accounts setup pending"],
      ["Client SMS", "—", "Live reporting starts after provider setup"],
      ["Available Balance", wallet ? Number(wallet.balance).toFixed(2) + " " + wallet.currency : "—", "Your wallet balance"],
      ["Commission", "—", "Commission rules pending"]
    ];
    if (expectedRole === "agent") return [
      ["My Clients", "—", "Client assignments setup pending"],
      ["SMS Sent", "—", "Live reporting starts after provider setup"],
      ["Available Balance", wallet ? Number(wallet.balance).toFixed(2) + " " + wallet.currency : "—", "Your wallet balance"],
      ["Commission", "—", "Commission rules pending"]
    ];
    return [
      ["Available Balance", wallet ? Number(wallet.balance).toFixed(2) + " " + wallet.currency : "—", "Current wallet balance"],
      ["SMS Today", "—", "No live SMS provider connected"],
      ["Delivered", "—", "Delivery receipts not connected"],
      ["Failed", "—", "Delivery receipts not connected"]
    ];
  }, [expectedRole, canListUsers, users.length, wallet]);

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
            <button key={item} className={active === item ? "selected" : ""} onClick={() => setActive(item)}>
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
            <div className="portalPanelHead"><div><h2>{expectedRole === "admin" ? "Account Directory" : "Getting Started"}</h2><p>{expectedRole === "admin" ? "Real accounts available under your current database permissions." : "Your role workspace is ready for the next integration steps."}</p></div></div>
            {expectedRole === "admin" && canListUsers ? (
              <div className="portalTableWrap"><table className="portalTable"><thead><tr><th>Name</th><th>Role</th><th>Company</th><th>Created</th></tr></thead><tbody>
                {users.map(item => <tr key={item.id}><td>{item.display_name || "—"}</td><td><span className="portalRole">{item.role}</span></td><td>{item.company_name || "—"}</td><td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</td></tr>)}
                {users.length === 0 && <tr><td colSpan={4}>No accounts found.</td></tr>}
              </tbody></table></div>
            ) : <div className="portalSteps">
              <div><b>01</b><span><strong>Account hierarchy</strong><small>Connect parent-child assignments and permissions.</small></span></div>
              <div><b>02</b><span><strong>Wallet & billing</strong><small>Enable secure balance transfers and transaction history.</small></span></div>
              <div><b>03</b><span><strong>SMS provider</strong><small>Connect an authorized SMS gateway for real sending and delivery receipts.</small></span></div>
            </div>}
          </section>
        </> : <section className="portalPanel">
          <h2>{active}</h2>
          <p className="portalIntro">{active === "Send SMS" ? "SMS sending will be enabled after an authorized provider API/SMPP connection and billing controls are configured." : "This module is part of the role-based portal structure. Its live workflow will be connected in the next implementation step."}</p>
          <div className="portalNotice">Demo structure only — no fake SMS, delivery receipts, balances or settlement records are generated.</div>
        </section>}
        <footer className="portalFooter">© 2026 Vertex SMS · Private messaging platform</footer>
      </section>
    </main>
  );
}
