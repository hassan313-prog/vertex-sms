import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Vertex SMS", description: "Vertex SMS OTP operations portal" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
