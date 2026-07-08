"use client";

import { useEffect, useRef, useState } from "react";

interface JiraUser {
  accountId: string;
  displayName: string;
  email?: string;
}

interface Props {
  initialName?: string;
  initialAccountId?: string | null;
  error?: string;
}

/**
 * Type-ahead that searches JIRA users and captures the selected account so the
 * requester can be set as the ticket Reporter. Emits two hidden fields:
 *   - requesterName       (display name / typed text)
 *   - requesterAccountId  (Atlassian accountId, empty if none selected)
 */
export default function RequesterPicker({
  initialName = "",
  initialAccountId = null,
  error,
}: Props) {
  const [text, setText] = useState(initialName);
  const [selected, setSelected] = useState<JiraUser | null>(
    initialAccountId
      ? { accountId: initialAccountId, displayName: initialName }
      : null,
  );
  const [results, setResults] = useState<JiraUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noJira, setNoJira] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search as the user types (unless a selection is already active).
  useEffect(() => {
    if (selected && selected.displayName === text) return;
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jira/users?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (json.configured === false) setNoJira(true);
        setResults(json.users ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [text, selected]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(user: JiraUser) {
    setSelected(user);
    setText(user.displayName);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input type="hidden" name="requesterName" value={text} />
      <input
        type="hidden"
        name="requesterAccountId"
        value={selected && selected.displayName === text ? selected.accountId : ""}
      />
      <input
        className="input"
        placeholder="Start typing a name or email…"
        value={text}
        autoComplete="off"
        onChange={(e) => {
          setText(e.target.value);
          setSelected(null);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        required
      />

      {selected && selected.displayName === text ? (
        <p className="mt-1 text-xs text-green-700">
          ✓ Will be set as the ticket Reporter
        </p>
      ) : text.trim().length > 0 ? (
        <p className="mt-1 text-xs text-amber-600">
          Select a match below to set them as the JIRA Reporter (otherwise the
          name is still recorded on the ticket).
        </p>
      ) : null}

      {open && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
          )}
          {!loading && noJira && (
            <div className="px-3 py-2 text-sm text-gray-500">
              JIRA is not configured — the typed name will be used.
            </div>
          )}
          {!loading && !noJira && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No matching users.
            </div>
          )}
          {!loading &&
            results.map((u) => (
              <button
                key={u.accountId}
                type="button"
                onClick={() => choose(u)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <span className="font-medium text-gray-900">{u.displayName}</span>
                {u.email && (
                  <span className="text-xs text-gray-500">{u.email}</span>
                )}
              </button>
            ))}
        </div>
      )}

      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
