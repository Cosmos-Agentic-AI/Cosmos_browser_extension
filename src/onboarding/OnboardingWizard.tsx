import { useState } from "react";
import { DEFAULT_PROVIDERS, ProviderId } from "@shared/types/settings";
import { sendToRouter } from "@shared/utils/sendToRouter";
import { StarfieldBackdrop } from "./StarfieldBackdrop";

type StepId = "welcome" | ProviderId | "review" | "done";

const PROVIDER_STEPS: ProviderId[] = ["omniroute", "openrouter", "groq"];
const STEP_ORDER: StepId[] = ["welcome", ...PROVIDER_STEPS, "review", "done"];

export function OnboardingWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [keys, setKeys] = useState<Partial<Record<ProviderId, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEP_ORDER[stepIndex];

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      await sendToRouter("ONBOARDING_SAVE_KEYS", { keys }, "onboarding");
      goNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your keys. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarfieldBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col justify-center px-8 py-16">
        <ProgressDots total={STEP_ORDER.length - 1} current={stepIndex} />

        {step === "welcome" && <WelcomeStep onNext={goNext} />}

        {PROVIDER_STEPS.includes(step as ProviderId) && (
          <ProviderStep
            providerId={step as ProviderId}
            value={keys[step as ProviderId] ?? ""}
            onChange={(v) => setKeys((k) => ({ ...k, [step as ProviderId]: v }))}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === "review" && (
          <ReviewStep
            keys={keys}
            onBack={goBack}
            onConfirm={handleFinish}
            saving={saving}
            error={error}
          />
        )}

        {step === "done" && <DoneStep />}
      </div>
    </div>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  if (current >= total) return null;
  return (
    <div className="mb-10 flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= current ? "bg-cosmos-accent" : "bg-cosmos-border"
          }`}
        />
      ))}
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <div className="mb-3 text-sm uppercase tracking-[0.2em] text-cosmos-accent">Cosmos</div>
      <h1 className="mb-4 text-4xl font-semibold leading-tight">
        Your browser, with a mind of its own.
      </h1>
      <p className="mb-10 text-cosmos-textMuted">
        Cosmos reads pages, plans multi-step tasks, and executes them for you — getting better
        each time it learns how a site actually works. To get started, connect the model
        providers it runs on.
      </p>
      <button
        onClick={onNext}
        className="rounded-lg bg-cosmos-accent px-5 py-2.5 font-medium text-white transition hover:bg-cosmos-accentMuted"
      >
        Set up providers
      </button>
    </div>
  );
}

function ProviderStep({
  providerId,
  value,
  onChange,
  onNext,
  onBack,
}: {
  providerId: ProviderId;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const provider = DEFAULT_PROVIDERS[providerId];

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold">{provider.label}</h2>
      <p className="mb-1 text-sm text-cosmos-textMuted">
        {provider.isLocalGateway
          ? "Runs on your own machine. Install it, then paste the dashboard key from your local instance."
          : "Paste an API key from your account."}
      </p>
      <a
        href={provider.keyUrl}
        target="_blank"
        rel="noreferrer"
        className="mb-6 inline-block text-sm text-cosmos-accent hover:underline"
      >
        {provider.isLocalGateway ? "Get OmniRoute →" : `Get a ${provider.label} key →`}
      </a>

      {provider.isLocalGateway && (
        <div className="mb-4 rounded-lg border border-cosmos-border bg-cosmos-surface p-3 text-xs text-cosmos-textMuted">
          Default endpoint: <code className="text-cosmos-text">{provider.baseUrl}</code>. You can
          change this later in Settings if you run it elsewhere.
        </div>
      )}

      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${provider.label} API key (optional — you can add this later)`}
        className="mb-8 w-full rounded-lg border border-cosmos-border bg-cosmos-surface px-4 py-3 text-sm outline-none focus:border-cosmos-accent"
      />

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-cosmos-border px-5 py-2.5 font-medium text-cosmos-textMuted transition hover:text-cosmos-text"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="rounded-lg bg-cosmos-accent px-5 py-2.5 font-medium text-white transition hover:bg-cosmos-accentMuted"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ReviewStep({
  keys,
  onBack,
  onConfirm,
  saving,
  error,
}: {
  keys: Partial<Record<ProviderId, string>>;
  onBack: () => void;
  onConfirm: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold">Review</h2>
      <ul className="mb-8 space-y-3">
        {PROVIDER_STEPS.map((id) => (
          <li
            key={id}
            className="flex items-center justify-between rounded-lg border border-cosmos-border bg-cosmos-surface px-4 py-3"
          >
            <span>{DEFAULT_PROVIDERS[id].label}</span>
            <span className={keys[id] ? "text-cosmos-success" : "text-cosmos-textMuted"}>
              {keys[id] ? "Connected" : "Skipped"}
            </span>
          </li>
        ))}
      </ul>

      {error && <div className="mb-4 text-sm text-cosmos-danger">{error}</div>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={saving}
          className="rounded-lg border border-cosmos-border px-5 py-2.5 font-medium text-cosmos-textMuted transition hover:text-cosmos-text disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          className="rounded-lg bg-cosmos-accent px-5 py-2.5 font-medium text-white transition hover:bg-cosmos-accentMuted disabled:opacity-50"
        >
          {saving ? "Saving…" : "Finish setup"}
        </button>
      </div>
    </div>
  );
}

function DoneStep() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">You're set up.</h2>
      <p className="text-cosmos-textMuted">
        Close this tab and open Cosmos from your toolbar to start your first task. You can update
        keys anytime from Settings.
      </p>
    </div>
  );
}
