import { useEffect, useState } from "react";
import { CosmosSettings, ProviderId } from "@shared/types/settings";
import { MemoryExportBundle } from "@shared/types/memory";
import { sendToRouter } from "@shared/utils/sendToRouter";

const PROVIDER_IDS: ProviderId[] = ["omniroute", "openrouter", "groq"];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<CosmosSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    sendToRouter<undefined, CosmosSettings>("SETTINGS_GET_KEYS", undefined, "popup").then(setSettings);
  }, []);

  if (!settings) return <div className="p-4 text-sm text-cosmos-textMuted">Loading…</div>;

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2000);
  };

  const saveKey = async (providerId: ProviderId, apiKey: string) => {
    const updated = await sendToRouter<{ providerId: ProviderId; apiKey: string }, CosmosSettings>(
      "SETTINGS_UPDATE_KEYS",
      { providerId, apiKey },
      "popup",
    );
    setSettings(updated);
  };

  const saveBaseUrl = async (providerId: ProviderId, baseUrl: string) => {
    const updated = await sendToRouter<{ providerId: ProviderId; baseUrl: string }, CosmosSettings>(
      "SETTINGS_UPDATE_BASE_URL",
      { providerId, baseUrl },
      "popup",
    );
    setSettings(updated);
  };

  const saveModel = async (model: string) => {
    const updated = await sendToRouter<{ model: string }, CosmosSettings>(
      "SETTINGS_UPDATE_MODEL",
      { model },
      "popup",
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
      flash(e instanceof Error ? e.message : "Import failed.");
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

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 text-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Settings</h2>
        <button onClick={onClose} className="text-xs text-cosmos-textMuted hover:text-cosmos-text">
          Close
        </button>
      </div>

      <div className="mb-5 space-y-4">
        <div className="text-xs uppercase tracking-wide text-cosmos-textMuted">Providers</div>
        {PROVIDER_IDS.map((id) => {
          const p = settings.providers[id];
          return (
            <div key={id} className="rounded-lg border border-cosmos-border bg-cosmos-surface p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{p.label}</span>
                <a href={p.keyUrl} target="_blank" rel="noreferrer" className="text-xs text-cosmos-accent hover:underline">
                  Get key →
                </a>
              </div>
              <input
                type="password"
                defaultValue={p.apiKey ?? ""}
                onBlur={(e) => saveKey(id, e.target.value)}
                placeholder="API key"
                className="mb-2 w-full rounded border border-cosmos-border bg-cosmos-bg px-2 py-1.5 text-xs outline-none focus:border-cosmos-accent"
              />
              <input
                defaultValue={p.baseUrl}
                onBlur={(e) => saveBaseUrl(id, e.target.value)}
                placeholder="Base URL"
                className="w-full rounded border border-cosmos-border bg-cosmos-bg px-2 py-1.5 text-xs text-cosmos-textMuted outline-none focus:border-cosmos-accent"
              />
            </div>
          );
        })}
      </div>

      <div className="mb-5">
        <div className="mb-2 text-xs uppercase tracking-wide text-cosmos-textMuted">Default model</div>
        <input
          defaultValue={settings.defaultModel ?? ""}
          onBlur={(e) => saveModel(e.target.value)}
          placeholder="e.g. auto, gpt-4o-mini, llama-3.3-70b"
          className="w-full rounded border border-cosmos-border bg-cosmos-surface px-2 py-1.5 text-xs outline-none focus:border-cosmos-accent"
        />
      </div>

      <div className="mb-2">
        <div className="mb-2 text-xs uppercase tracking-wide text-cosmos-textMuted">Memory</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportMemory}
            disabled={busy}
            className="rounded border border-cosmos-border px-3 py-1.5 text-xs text-cosmos-text hover:bg-cosmos-surface disabled:opacity-50"
          >
            Export
          </button>
          <label className="cursor-pointer rounded border border-cosmos-border px-3 py-1.5 text-xs text-cosmos-text hover:bg-cosmos-surface">
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
            className="rounded border border-cosmos-danger px-3 py-1.5 text-xs text-cosmos-danger hover:bg-cosmos-danger/10 disabled:opacity-50"
          >
            Clear all memory
          </button>
        </div>
      </div>

      {notice && <div className="mt-3 text-xs text-cosmos-success">{notice}</div>}
    </div>
  );
}
