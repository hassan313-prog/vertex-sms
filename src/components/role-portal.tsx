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
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [language, setLanguage] = useState("English");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [liveStats, setLiveStats] = useState({ availableNumbers: 0, ordersToday: 0, ordersWeek: 0, otpsToday: 0, otpsWeek: 0, transactionsToday: 0, transactionsWeek: 0, platformBalance: 0, loading: true });
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
      } else if (actualRole === "manager" || actualRole === "agent") {
        const { data: childRows } = await supabase
          .from("profiles")
          .select("id,email,display_name,role,company_name,parent_id,created_at")
          .eq("parent_id", currentUser.id)
          .order("created_at", { ascending: false });
        if (alive && childRows) setUsers(childRows as Profile[]);
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

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const refresh = async () => {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStartDate = new Date(now);
      const day = (weekStartDate.getDay() + 6) % 7;
      weekStartDate.setDate(weekStartDate.getDate() - day);
      weekStartDate.setHours(0, 0, 0, 0);
      const weekStart = weekStartDate.toISOString();
      const scoped = (query: any) => expectedRole === "admin" ? query : query.eq("user_id", user.id);
      const [ordersDay, ordersWeek, otpDay, otpWeek, txDay, txWeek, inventory, walletRows] = await Promise.all([
        scoped(supabase.from("number_orders").select("id", { count: "exact", head: true })).gte("created_at", dayStart),
        scoped(supabase.from("number_orders").select("id", { count: "exact", head: true })).gte("created_at", weekStart),
        scoped(supabase.from("otp_messages").select("id", { count: "exact", head: true })).gte("received_at", dayStart),
        scoped(supabase.from("otp_messages").select("id", { count: "exact", head: true })).gte("received_at", weekStart),
        scoped(supabase.from("wallet_transactions").select("id", { count: "exact", head: true })).gte("created_at", dayStart),
        scoped(supabase.from("wallet_transactions").select("id", { count: "exact", head: true })).gte("created_at", weekStart),
        expectedRole === "admin" ? supabase.from("number_inventory").select("id", { count: "exact", head: true }).eq("status", "available") : Promise.resolve({ count: null, error: null }),
        expectedRole === "admin" ? supabase.from("wallets").select("balance") : supabase.from("wallets").select("balance").eq("user_id", user.id)
      ]);
      if (!alive) return;
      const balanceTotal = (walletRows.data || []).reduce((sum: number, row: { balance: number | string }) => sum + Number(row.balance || 0), 0);
      setLiveStats({
        availableNumbers: inventory.count || 0,
        ordersToday: ordersDay.count || 0,
        ordersWeek: ordersWeek.count || 0,
        otpsToday: otpDay.count || 0,
        otpsWeek: otpWeek.count || 0,
        transactionsToday: txDay.count || 0,
        transactionsWeek: txWeek.count || 0,
        platformBalance: balanceTotal,
        loading: false
      });
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30000);
    const channel = supabase.channel("vertex-live-dashboard-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "number_orders" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "otp_messages" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_transactions" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, () => void refresh())
      .subscribe();
    return () => {
      alive = false;
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, expectedRole]);

  const title = roleNames[expectedRole];
  const stats = useMemo(() => {
    const live = (value: number) => liveStats.loading ? "Loading…" : String(value);
    if (expectedRole === "admin") return [
      ["Total Accounts", live(users.filter(x => x.role !== "admin").length), "Live Manager, Agent and Client accounts"],
      ["Platform Wallets", liveStats.loading ? "Loading…" : liveStats.platformBalance.toFixed(2) + " USD", "Combined real wallet balances"],
      ["Available Numbers", live(liveStats.availableNumbers), "Numbers currently marked available"],
      ["Number Orders Today", live(liveStats.ordersToday), "Live orders recorded today"]
    ];
    if (expectedRole === "manager") return [
      ["My Agents", live(users.filter(x => x.role === "agent").length), "Your assigned agent accounts"],
      ["Number Orders", live(liveStats.ordersWeek), "Your orders this week"],
      ["Available Balance", wallet ? Number(wallet.balance).toFixed(2) + " " + wallet.currency : "—", "Your actual wallet balance"],
      ["OTP Received", live(liveStats.otpsWeek), "OTP messages received this week"]
    ];
    if (expectedRole === "agent") return [
      ["My Clients", live(users.filter(x => x.role === "client").length), "Your assigned client accounts"],
      ["Number Orders", live(liveStats.ordersWeek), "Your orders this week"],
      ["Available Balance", wallet ? Number(wallet.balance).toFixed(2) + " " + wallet.currency : "—", "Your actual wallet balance"],
      ["OTP Received", live(liveStats.otpsWeek), "OTP messages received this week"]
    ];
    return [
      ["Available Balance", wallet ? Number(wallet.balance).toFixed(2) + " " + wallet.currency : "—", "Your actual wallet balance"],
      ["Number Orders Today", live(liveStats.ordersToday), "Your orders recorded today"],
      ["OTP Received", live(liveStats.otpsToday), "OTP messages received today"],
      ["Transactions Today", live(liveStats.transactionsToday), "Wallet transactions recorded today"]
    ];
  }, [expectedRole, users, wallet, liveStats]);
