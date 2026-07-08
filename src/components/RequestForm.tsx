"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  REQUEST_STATUS_OPTIONS,
  REQUEST_TYPE_OPTIONS,
  SPORTS,
} from "@/lib/constants";
import RequesterPicker from "./RequesterPicker";

export interface RequestFormValues {
  id?: string;
  requesterName?: string;
  requesterAccountId?: string | null;
  description?: string;
  sport?: string;
  type?: string;
  dataLink?: string | null;
  businessCase?: string;
  dueDate?: string | null; // yyyy-MM-dd
  status?: string;
}

interface Props {
  initial?: RequestFormValues;
  mode: "create" | "edit";
}

export default function RequestForm({ initial, mode }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setWarnings([]);
    setFormError(null);

    const form = new FormData(e.currentTarget);

    const url =
      mode === "create" ? "/api/requests" : `/api/requests/${initial?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, { method, body: form });
      const json = await res.json();

      if (!res.ok) {
        if (json.errors) setErrors(json.errors);
        else setFormError(json.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }

      if (json.warnings?.length) {
        // Show warnings briefly, then navigate to the list.
        setWarnings(json.warnings);
        setTimeout(() => router.push("/"), 2500);
        setSubmitting(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setFormError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Saved with warnings:</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs">Redirecting to the request list…</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="requesterName">
            Requester Name <span className="text-red-500">*</span>
          </label>
          <RequesterPicker
            initialName={initial?.requesterName ?? ""}
            initialAccountId={initial?.requesterAccountId ?? null}
            error={errors.requesterName}
          />
        </div>

        <div>
          <label className="label" htmlFor="sport">
            Sport <span className="text-red-500">*</span>
          </label>
          <select
            id="sport"
            name="sport"
            className="input"
            defaultValue={initial?.sport ?? ""}
            required
          >
            <option value="" disabled>
              Select a sport…
            </option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.sport && <p className="field-error">{errors.sport}</p>}
        </div>

        <div>
          <label className="label" htmlFor="type">
            Type of Request <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            name="type"
            className="input"
            defaultValue={initial?.type ?? ""}
            required
          >
            <option value="" disabled>
              Select a type…
            </option>
            {REQUEST_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {errors.type && <p className="field-error">{errors.type}</p>}
        </div>

        <div>
          <label className="label" htmlFor="dueDate">
            Due Date <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            className="input"
            defaultValue={initial?.dueDate ?? ""}
          />
          {errors.dueDate && <p className="field-error">{errors.dueDate}</p>}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description of Request <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="input"
          defaultValue={initial?.description ?? ""}
          placeholder="What do you need the Data Science team to do?"
          required
        />
        {errors.description && <p className="field-error">{errors.description}</p>}
      </div>

      <div>
        <label className="label" htmlFor="businessCase">
          Business Use Case / Value <span className="text-red-500">*</span>
        </label>
        <textarea
          id="businessCase"
          name="businessCase"
          rows={3}
          className="input"
          defaultValue={initial?.businessCase ?? ""}
          placeholder="Why does this matter? What's the impact or value?"
          required
        />
        {errors.businessCase && <p className="field-error">{errors.businessCase}</p>}
      </div>

      <div>
        <label className="label" htmlFor="dataLink">
          Link to Current Data / Version{" "}
          <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="dataLink"
          name="dataLink"
          type="url"
          className="input"
          defaultValue={initial?.dataLink ?? ""}
          placeholder="https://…"
        />
        {errors.dataLink && <p className="field-error">{errors.dataLink}</p>}
      </div>

      {mode === "create" && (
        <div>
          <label className="label" htmlFor="attachments">
            Attachments <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="attachments"
            name="attachments"
            type="file"
            multiple
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Files are uploaded directly to the JIRA ticket.
          </p>
        </div>
      )}

      {mode === "edit" && (
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="input md:w-64"
            defaultValue={initial?.status ?? "SUBMITTED"}
          >
            {REQUEST_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Submit Request"
              : "Save Changes"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push("/")}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
