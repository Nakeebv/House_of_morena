"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BankDetailsForm({
  initialValues,
}: {
  initialValues: { bank_name?: string; account_name?: string; account_number?: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    bank_name: initialValues.bank_name ?? "",
    account_name: initialValues.account_name ?? "",
    account_number: initialValues.account_number ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const complete = Boolean(
    values.bank_name.trim() && values.account_name.trim() && values.account_number.trim(),
  );

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);
    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Could not save.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Bank</span>
          <input
            className="field"
            value={values.bank_name}
            onChange={set("bank_name")}
            placeholder="GTBank"
          />
        </label>
        <label className="block">
          <span className="label">Account name</span>
          <input
            className="field"
            value={values.account_name}
            onChange={set("account_name")}
            placeholder="Morena Collection"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Account number</span>
          <input
            className="field nums"
            value={values.account_number}
            onChange={set("account_number")}
            inputMode="numeric"
            placeholder="0123456789"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-[#fbeaea] px-4 py-3 text-[12.5px] text-[#8c2f2f]">{error}</p>
      ) : null}
      {saved ? (
        <p className="mt-3 rounded-xl bg-[#e9f3ec] px-4 py-3 text-[12.5px] text-[#26603a]">
          Saved — buyers now see these details at checkout.
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save bank details"}
        </button>
        <span className="text-[12px] text-muted">
          {complete ? "Shown on the transfer step of checkout." : "Fill all three fields for transfer payments."}
        </span>
      </div>
    </div>
  );
}
