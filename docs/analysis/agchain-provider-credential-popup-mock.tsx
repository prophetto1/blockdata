import { useMemo, useState } from "react";
import type { FormEvent } from "react";

export type CredentialMode = "access_token" | "service_account_key" | "custom";
export type TestResult = "passed" | "failed";
export type PopupStep = 1 | 2 | 3;

export interface CredentialField {
  key: string;
  label: string;
  helper: string;
  inputType: "text" | "password" | "textarea";
  required: boolean;
}

export interface ProviderCredentialSchema {
  providerSlug: string;
  providerName: string;
  docsUrl: string;
  envVarName: string;
  credentialMode: CredentialMode;
  fields: CredentialField[];
}

export interface CredentialPopupProps {
  open: boolean;
  mode: "organization" | "project";
  provider: ProviderCredentialSchema;
  onClose: () => void;
  onTestKey: (
    providerSlug: string,
    payload: Record<string, string>,
  ) => Promise<TestResult>;
  onSaveCredential: (
    providerSlug: string,
    payload: Record<string, string>,
  ) => Promise<void>;
}

const STEP_LABELS: Record<PopupStep, string> = {
  1: "1 of 3",
  2: "2 of 3",
  3: "3 of 3",
};

// Required by source contract: this message remains stable regardless of pass/fail.
const RESULT_MESSAGE =
  "This credential was updated. You can continue using the current credential scope.";

function StepBadge({ step }: { step: PopupStep }) {
  return (
    <div className="agchain-credential-popup__step-badge">
      {STEP_LABELS[step]}
    </div>
  );
}

function FieldSet({
  fields,
  values,
  onChange,
}: {
  fields: CredentialField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="agchain-credential-popup__fields">
      {fields.map((field) => (
        <div key={field.key} className="agchain-credential-popup__field">
          <label htmlFor={field.key}>{field.label}</label>
          {field.inputType === "textarea" ? (
            <textarea
              id={field.key}
              rows={4}
              required={field.required}
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder="Paste key or JSON here"
              className="agchain-credential-popup__textarea"
            />
          ) : (
            <input
              id={field.key}
              type={field.inputType}
              required={field.required}
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="agchain-credential-popup__input"
              autoComplete="off"
            />
          )}
          <div className="agchain-credential-popup__help">{field.helper}</div>
        </div>
      ))}
    </div>
  );
}

export function AgchainProviderCredentialPopupMock({
  open,
  mode,
  provider,
  onClose,
  onTestKey,
  onSaveCredential,
}: CredentialPopupProps) {
  const [step, setStep] = useState<PopupStep>(1);
  const [isBusy, setIsBusy] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [messageCopy, setMessageCopy] = useState(RESULT_MESSAGE);
  const [errorText, setErrorText] = useState<string>("");

  const actionLabel = useMemo(() => {
    if (step === 1 && !isBusy) return "Save";
    if (step === 2) return "Saving the Key";
    return "Done";
  }, [step, isBusy]);

  if (!open) return null;

  const updateField = (key: string, value: string) =>
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));

  const handleTest = async () => {
    setIsBusy(true);
    setErrorText("");
    setStep(2);
    try {
      const result = await onTestKey(provider.providerSlug, values);
      setTestResult(result);
      setMessageCopy(RESULT_MESSAGE);
      setStep(3);
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Test request failed to execute.",
      );
      setTestResult("failed");
      setMessageCopy(RESULT_MESSAGE);
      setStep(3);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setErrorText("");
    setStep(2);
    try {
      await onSaveCredential(provider.providerSlug, values);
      setTestResult(testResult);
      setMessageCopy(RESULT_MESSAGE);
      setStep(3);
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Save request failed to execute.",
      );
      setStep(1);
    } finally {
      setIsBusy(false);
    }
  };

  const title = `${provider.providerName} - Basic “Set API key”`;

  return (
    <div className="agchain-credential-popup__backdrop">
      <div
        className="agchain-credential-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credential-title"
      >
        <header className="agchain-credential-popup__header">
          <h2 id="credential-title">{title}</h2>
          <StepBadge step={step} />
        </header>

        <div className="agchain-credential-popup__meta">
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="agchain-credential-popup__doc-link"
          >
            Docs
          </a>
          <span className="agchain-credential-popup__env-chip">
            {provider.envVarName}
          </span>
          <span className="agchain-credential-popup__scope-chip">
            Scope: {mode}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="agchain-credential-popup__copy">
            {provider.credentialMode === "service_account_key"
              ? "Use service-account format for this provider."
              : "Use access-token format for this provider."}
          </p>

          <FieldSet
            fields={provider.fields}
            values={values}
            onChange={updateField}
          />

          {isBusy && <p className="agchain-credential-popup__state">{actionLabel}</p>}

          <p className="agchain-credential-popup__message">{messageCopy}</p>

          {testResult ? (
            <span
              className={`agchain-credential-popup__status agchain-credential-popup__status--${testResult}`}
            >
              {testResult}
            </span>
          ) : null}

          {errorText ? (
            <p className="agchain-credential-popup__error">{errorText}</p>
          ) : null}

          <footer className="agchain-credential-popup__actions">
            <button
              type="button"
              className="agchain-credential-popup__button agchain-credential-popup__button--secondary"
              onClick={handleTest}
              disabled={isBusy}
            >
              Test key
            </button>
            <button
              type="submit"
              className="agchain-credential-popup__button"
              disabled={isBusy}
            >
              {actionLabel}
            </button>
            <button
              type="button"
              className="agchain-credential-popup__button agchain-credential-popup__button--ghost"
              onClick={onClose}
            >
              Close
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// Example usage (not wired):
export const grokBasicSchema: ProviderCredentialSchema = {
  providerSlug: "grok",
  providerName: "Grok",
  docsUrl: "https://example.com/docs/grok",
  envVarName: "GROK_API_KEY",
  credentialMode: "access_token",
  fields: [
    {
      key: "api_key",
      label: "API Key",
      helper:
        "Will provide credential forms for access token or service account key as required by this provider.",
      inputType: "password",
      required: true,
    },
  ],
};
