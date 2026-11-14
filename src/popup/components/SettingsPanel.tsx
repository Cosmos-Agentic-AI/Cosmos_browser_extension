import { useEffect, useState } from "react";
import { CosmosSettings, ProviderId } from "@shared/types/settings";
import { MemoryExportBundle } from "@shared/types/memory";
import { sendToRouter } from "@shared/utils/sendToRouter";
import { IconSettings, IconX, IconLink, IconSparkle, IconCheck, IconBrain, IconExport } from "./Icons";

function applyTheme(theme: CosmosSettings["theme"]) {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else if (theme === "system") {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
}

const PROVIDER_IDS: ProviderId[] = ["omniroute", "openrouter", "groq"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-2xs font-semibold uppercase tracking-widest text-cosmos-textSubtle">{children}</span>
      <div className="h-px flex-1 bg-cosmos-border" />
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
        value ? "gradient-bg" : "bg-cosmos-surface3"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function FieldInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-cosmos-border bg-cosmos-surface2 px-3 py-2 text-xs text-cosmos-text placeholder:text-cosmos-textMuted outline-none transition-all focus:border-cosmos-accent focus:shadow-glow ${className}`}
    />
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<CosmosSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    sendToRouter<undefined, CosmosSettings>("SETTINGS_GET_KEYS", undefined, "popup").then(setSettings);
  }, []);

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-cosmos-textMuted">
          <span className="h-1.5 w-1.5 rounded-full bg-cosmos-accent animate-pulse-dot" />
          Loading settings…
        </div>
      </div>
    );
  }

  const flash = (msg: string, ok = true) => {
    setNotice({ msg, ok });
    setTimeout(() => setNotice(null), 2500);
  };

  const saveKey = async (providerId: ProviderId, apiKey: string) => {
    const updated = await sendToRouter<{ providerId: ProviderId; apiKey: string }, CosmosSettings>(
      "SETTINGS_UPDATE_KEYS", { providerId, apiKey }, "popup",
    );
    setSettings(updated);
  };

  const saveBaseUrl = async (providerId: ProviderId, baseUrl: string) => {
    const updated = await sendToRouter<{ providerId: ProviderId; baseUrl: string }, CosmosSettings>(
      "SETTINGS_UPDATE_BASE_URL", { providerId, baseUrl }, "popup",
    );
    setSettings(updated);
  };

  const saveModel = async (model: string) => {
    const updated = await sendToRouter<{ model: string }, CosmosSettings>(
      "SETTINGS_UPDATE_MODEL", { model }, "popup",
    );
    setSettings(updated);
  };

  const saveTheme = async (theme: CosmosSettings["theme"]) => {
    const updated = await sendToRouter<{ theme: CosmosSettings["theme"] }, CosmosSettings>(
      "SETTINGS_UPDATE_THEME", { theme }, "popup",
    );
    setSettings(updated);
    applyTheme(theme);
  };

  const saveMaxSteps = async (value: string) => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    const updated = await sendToRouter<{ maxStepsPerTask: number }, CosmosSettings>(
      "SETTINGS_UPDATE_MAX_STEPS", { maxStepsPerTask: n }, "popup",
    );
    setSettings(updated);
  };

  const saveDryRun = async (dryRun: boolean) => {
    const updated = await sendToRouter<{ dryRun: boolean }, CosmosSettings>(
      "SETTINGS_UPDATE_DRY_RUN", { dryRun }, "popup",
    );
    setSettings(updated);
  };

  const saveNotifyOnComplete = async (notifyOnComplete: boolean) => {
    const updated = await sendToRouter<{ notifyOnComplete: boolean }, CosmosSettings>(
      "SETTINGS_UPDATE_NOTIFY", { notifyOnComplete }, "popup",
    );
    setSettings(updated);
  };

  const saveBlockedDomains = async (raw: string) => {
    const blockedDomains = raw
      .split(/[\n,]+/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);
    const updated = await sendToRouter<{ blockedDomains: string[] }, CosmosSettings>(
      "SETTINGS_UPDATE_BLOCKED_DOMAINS", { blockedDomains }, "popup",
    );
    setSettings(updated);
  };

  const exportMemory = async () => {
    setBusy(true);
    try {
      const bundle = await sendToRouter<undefined, MemoryExportBundle>("MEMORY_EXPORT", undefined, "popup");
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cosmos-memory-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash("Memory exported.");
    } finally {
      setBusy(false);
    }
  };

  const importMemory = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const bundle = JSON.parse(text) as MemoryExportBundle;
      await sendToRouter("MEMORY_IMPORT", bundle, "popup");
      flash("Memory imported.");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Import failed.", false);
    } finally {
      setBusy(false);
    }
  };

  const clearMemory = async () => {
    if (!confirm("Clear all Cosmos memory? This can't be undone (export first if unsure).")) return;
    setBusy(true);
    try {
      await sendToRouter("MEMORY_CLEAR_ALL", undefined, "popup");
      flash("Memory cleared.");
    } finally {
      setBusy(false);
    }
  };

  const BEHAVIOURS = [
    {
      key: "dryRun" as const,
      label: "Dry-run mode",
      desc: "Show the plan without executing any actions",
      value: settings.dryRun,
      save: saveDryRun,
    },
    {
      key: "notifyOnComplete" as const,
      label: "Task notifications",
      desc: "Show a system notification when a task completes",
      value: settings.notifyOnComplete,
      save: saveNotifyOnComplete,
    },
  ];

  return (
    <div className="flex h-full flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cosmos-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl gradient-bg">
            <IconSettings size={13} className="text-white" />
          </div>
          <div>
            <h2 className="text-md font-semibold text-cosmos-text">Settings</h2>
            <p className="text-2xs text-cosmos-textMuted">Configure Cosmos</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-cosmos-textMuted hover:bg-cosmos-surface2 hover:text-cosmos-text transition-colors"
        >
          <IconX size={13} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

        {/* Providers */}
        <section>
          <SectionLabel>AI Providers</SectionLabel>
          <div className="space-y-3">
            {PROVIDER_IDS.map((id) => {
              const p = settings.providers[id];
              return (
                <div key={id} className="rounded-2xl border border-cosmos-border bg-cosmos-surface p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-cosmos-accentDim">
                        <IconLink size={9} className="text-cosmos-accent" />
                      </div>
                      <span className="text-xs font-semibold text-cosmos-text">{p.label}</span>
                    </div>
                    <a
                      href={p.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-2xs text-cosmos-accent hover:text-cosmos-accentMuted transition-colors"
                    >
                      Get key
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 6.5l5-5M6.5 6.5V1.5H1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                  <FieldInput
                    type="password"
                    defaultValue={p.apiKey ?? ""}
                    onBlur={(e) => saveKey(id, e.target.value)}
                    placeholder="API key"
                  />
                  <FieldInput
                    defaultValue={p.baseUrl}
                    onBlur={(e) => saveBaseUrl(id, e.target.value)}
                    placeholder="Base URL"
                    className="text-cosmos-textMuted"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Model */}
        <section>
          <SectionLabel>Model</SectionLabel>
          <div className="rounded-2xl border border-cosmos-border bg-cosmos-surface p-4 space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <IconSparkle size={12} className="text-cosmos-accent" />
              <span className="text-xs font-medium text-cosmos-text">Default model</span>
            </div>
            <FieldInput
              defaultValue={settings.defaultModel ?? ""}
              onBlur={(e) => saveModel(e.target.value)}
              placeholder="e.g. auto, gpt-4o-mini, llama-3.3-70b"
            />
            <p className="text-2xs text-cosmos-textSubtle leading-relaxed">
              Controls which model is used for planning and acting. Leave empty to auto-select the fastest available.
            </p>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <SectionLabel>Appearance</SectionLabel>
          <div className="rounded-2xl border border-cosmos-border bg-cosmos-surface p-4">
            <p className="mb-3 text-xs font-medium text-cosmos-text">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {(["dark", "light", "system"] as const).map((t) => {
                const active = settings.theme === t;
                return (
                  <button
                    key={t}
                    onClick={() => saveTheme(t)}
                    className={`relative flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs capitalize transition-all duration-150 ${
                      active
                        ? "border-cosmos-accent bg-cosmos-accentDim text-cosmos-accent font-medium"
                        : "border-cosmos-border text-cosmos-textMuted hover:border-cosmos-border/80 hover:text-cosmos-text"
                    }`}
                  >
                    {active && (
                      <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full gradient-bg">
                        <IconCheck size={7} className="text-white" />
                      </span>
                    )}
                    {t === "dark" && "🌙"}
                    {t === "light" && "☀️"}
                    {t === "system" && "⚙️"}
                    <span>{t}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Behaviour */}
        <section>
          <SectionLabel>Behaviour</SectionLabel>
          <div className="rounded-2xl border border-cosmos-border bg-cosmos-surface overflow-hidden">
            {BEHAVIOURS.map(({ key, label, desc, value, save }, i) => (
              <div
                key={key}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 ${
                  i < BEHAVIOURS.length - 1 ? "border-b border-cosmos-border" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-cosmos-text">{label}</p>
                  <p className="mt-0.5 text-2xs text-cosmos-textMuted leading-relaxed">{desc}</p>
                </div>
                <Toggle value={value} onChange={save} />
              </div>
            ))}
          </div>
        </section>

        {/* Limits */}
        <section>
          <SectionLabel>Limits</SectionLabel>
          <div className="rounded-2xl border border-cosmos-border bg-cosmos-surface p-4 space-y-3">
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-cosmos-text">
                Max steps per task
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  key={settings.maxStepsPerTask}
                  defaultValue={settings.maxStepsPerTask}
                  min={1}
                  max={50}
                  onBlur={(e) => saveMaxSteps(e.target.value)}
                  className="w-20 rounded-xl border border-cosmos-border bg-cosmos-surface2 px-3 py-2 text-xs text-cosmos-text outline-none transition-all focus:border-cosmos-accent focus:shadow-glow"
                />
                <div className="h-1.5 flex-1 rounded-full bg-cosmos-surface2 overflow-hidden">
                  <div
                    className="h-full rounded-full gradient-bg transition-all duration-300"
                    style={{ width: `${((settings.maxStepsPerTask ?? 10) / 50) * 100}%` }}
                  />
                </div>
              </div>
              <p className="mt-1.5 text-2xs text-cosmos-textSubtle">
                Hard cap on plan steps (1–50). Prevents runaway token spend on ambiguous goals.
              </p>
            </div>
          </div>
        </section>

        {/* Blocked Domains */}
        <section>
          <SectionLabel>Security</SectionLabel>
          <div className="rounded-2xl border border-cosmos-border bg-cosmos-surface p-4">
            <p className="mb-2 text-xs font-medium text-cosmos-text">Blocked domains</p>
            <textarea
              key={settings.blockedDomains.join(",")}
              defaultValue={settings.blockedDomains.join("\n")}
              onBlur={(e) => saveBlockedDomains(e.target.value)}
              rows={3}
              placeholder={"example.com\nbank.example.org"}
              className="w-full resize-none rounded-xl border border-cosmos-border bg-cosmos-surface2 px-3 py-2 font-mono text-xs text-cosmos-text placeholder:text-cosmos-textMuted outline-none transition-all focus:border-cosmos-accent focus:shadow-glow"
            />
            <p className="mt-1.5 text-2xs text-cosmos-textSubtle">
              Cosmos will refuse to act on these domains. One per line or comma-separated.
            </p>
          </div>
        </section>

        {/* Memory */}
        <section>
          <SectionLabel>Memory</SectionLabel>
          <div className="rounded-2xl border border-cosmos-border bg-cosmos-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <IconBrain size={12} className="text-cosmos-accent" />
              <p className="text-xs font-medium text-cosmos-text">Memory management</p>
            </div>
            <p className="mb-3 text-2xs text-cosmos-textSubtle leading-relaxed">
              Cosmos remembers page-specific notes, workflows, and task history. Export before clearing to avoid data loss.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportMemory}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl border border-cosmos-border px-3 py-2 text-xs text-cosmos-text hover:bg-cosmos-surface2 transition-colors disabled:opacity-40"
              >
                <IconExport size={11} />
                Export
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-cosmos-border px-3 py-2 text-xs text-cosmos-text hover:bg-cosmos-surface2 transition-colors">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 1v7M2 5l3.5 3.5L9 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1 10h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Import
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && importMemory(e.target.files[0])}
                />
              </label>
              <button
                onClick={clearMemory}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl border border-cosmos-danger/40 px-3 py-2 text-xs text-cosmos-danger hover:bg-cosmos-dangerDim transition-colors disabled:opacity-40"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1.5 3h8M3.5 3V2h4v1M4.5 5v3.5M6.5 5v3.5M2.5 3l.5 6h5l.5-6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Clear all
              </button>
            </div>
          </div>
        </section>

        <div className="h-2" />
      </div>

      {/* Toast */}
      {notice && (
        <div className={`mx-5 mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs animate-slide-up ${
          notice.ok ? "bg-cosmos-successDim text-cosmos-success" : "bg-cosmos-dangerDim text-cosmos-danger"
        }`}>
          {notice.ok ? <IconCheck size={11} /> : <IconX size={11} />}
          {notice.msg}
        </div>
      )}
    </div>
  );
}
