"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-mist px-5 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8">
        <Logo />
        <h1 className="mt-7 text-[21px] font-semibold tracking-[-0.02em]">Store management</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Sign in to upload products, review orders and see total sales.
        </p>

        <form
          className="mt-7 flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError(null);
            const response = await fetch("/api/admin/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password }),
            });
            if (!response.ok) {
              const data = (await response.json().catch(() => ({}))) as { error?: string };
              setError(data.error ?? "Could not sign in.");
              setBusy(false);
              return;
            }
            router.refresh();
          }}
        >
          <label className="block">
            <span className="label">Password</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              required
            />
          </label>

          {error ? (
            <p className="rounded-xl bg-[#fbeaea] px-3.5 py-2.5 text-[12.5px] text-[#8c2f2f]">{error}</p>
          ) : null}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-[11.5px] leading-relaxed text-muted">Owner access only.</p>
      </div>
    </div>
  );
}
