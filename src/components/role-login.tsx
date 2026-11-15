"use client";
import "./role-login.css";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
);

export default function RoleLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [a, setA] = useState(4);
  const [b, setB] = useState(3);
  const [answer, setAnswer] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (Number(answer) !== a + b) {
      setError("Security check ka jawab ghalat hai.");
      setA(Math.floor(Math.random() * 8) + 2);
      setB(Math.floor(Math.random() * 8) + 1);
      setAnswer("");
      return;
    }
    setBusy(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError || !data.user) {
      setError(authError?.message || "Login nahi ho saka.");
      setBusy(false);
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profileError || !profile?.role || !["admin", "manager", "agent", "client"].includes(profile.role)) {
      await supabase.auth.signOut();
      setError("Account role set nahi hai. Admin se rabta karein.");
      setBusy(false);
      return;
    }
    window.location.replace("/" + profile.role);
  }

  return <main className="roleLoginShell">
    <section className="roleLoginCard">
      <div className="roleLoginBrand"><span>V</span><b>VERTEX <i>SMS</i></b></div>
      <small className="roleLoginEyebrow">PRIVATE SMS PLATFORM</small>
      <h1>Welcome back<span>.</span></h1>
      <p>Sign in to your assigned workspace.</p>
      {error && <div className="roleLoginError">{error}</div>}
      <form onSubmit={submit}>
        <label>Email address</label>
        <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" />
        <div className="roleLoginPassLabel"><label>Password</label><button type="button" onClick={() => setShow(!show)}>{show ? "HIDE" : "SHOW"}</button></div>
        <input type={show ? "text" : "password"} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
        <div className="roleCaptcha"><div><small>SECURITY CHECK</small><b>{a} + {b} = ?</b></div><input inputMode="numeric" aria-label="Security check answer" required value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Answer" /></div>
        <button className="roleLoginSubmit" disabled={busy}>{busy ? "Signing in..." : "Sign in →"}</button>
      </form>
      <footer>Account access is created by your administrator. Public signup is disabled.</footer>
    </section>
  </main>;
}
