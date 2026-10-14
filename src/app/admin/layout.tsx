import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminLogin } from "@/components/admin/login-screen";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Store admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authed = await isAdmin();
  if (!authed) return <AdminLogin />;
  return <AdminShell>{children}</AdminShell>;
}
