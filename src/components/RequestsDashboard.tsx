"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RequestStatus, RequestType } from "@prisma/client";
import {
  REQUEST_STATUS_OPTIONS,
  REQUEST_TYPE_OPTIONS,
  SPORTS,
  STATUS_BADGE_CLASSES,
  requestStatusLabel,
  requestTypeLabel,
} from "@/lib/constants";

export interface SerializedRequest {
  id: string;
  requesterName: string;
  description: string;
  sport: string;
  type: RequestType;
  dataLink: string | null;
  businessCase: string;
  dueDate: string | null;
  status: RequestStatus;
  jiraKey: string | null;
  jiraUrl: string | null;
  attachmentNames: string[];
  createdAt: string;
  updatedAt: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RequestsDashboard({
  initialRequests,
}: {
  initialRequests: SerializedRequest[];
}) {
  const [requests, setRequests] = useState<SerializedRequest[]>(initialRequests);
  const [q, setQ] = useState("");
  const [sport, setSport] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return requests.filter((r) => {
      if (sport && r.sport !== sport) return false;
      if (type && r.type !== type) return false;
      if (status && r.status !== status) return false;
      if (needle) {
        const haystack = [
          r.requesterName,
          r.description,
          r.businessCase,
          r.sport,
          r.jiraKey ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [requests, q, sport, type, status]);

  async function changeStatus(id: string, newStatus: string) {
    setBusyId(id);
    const form = new FormData();
    form.set("statusOnly", "true");
    form.set("status", newStatus);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        body: form,
      });
      if (res.ok) {
        const { request } = await res.json();
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: request.status } : r)),
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this request from the tracker? The JIRA ticket is kept.")) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  }

  const hasActiveFilters = q || sport || type || status;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Requests</h1>
          <p className="mt-1 text-sm text-gray-600">
            {filtered.length} of {requests.length} request
            {requests.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/new" className="btn-primary">
          + New Request
        </Link>
      </div>

      {/* Search + filters */}
      <div className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input
          className="input"
          placeholder="Search requester, description, JIRA key…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input" value={sport} onChange={(e) => setSport(e.target.value)}>
          <option value="">All sports</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {REQUEST_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {REQUEST_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setQ("");
            setSport("");
            setType("");
            setStatus("");
          }}
          disabled={!hasActiveFilters}
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">Sport</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">JIRA</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  {requests.length === 0
                    ? "No requests yet. Submit the first one!"
                    : "No requests match your filters."}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="align-top hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.requesterName}
                  <div className="text-xs font-normal text-gray-400">
                    {formatDate(r.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{r.sport}</td>
                <td className="px-4 py-3 text-gray-700">{requestTypeLabel(r.type)}</td>
                <td className="max-w-xs px-4 py-3 text-gray-600">
                  <span className="line-clamp-2">{r.description}</span>
                </td>
                <td className="px-4 py-3 text-gray-700">{formatDate(r.dueDate)}</td>
                <td className="px-4 py-3">
                  <select
                    className={`rounded-full border-0 px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-brand-500 ${STATUS_BADGE_CLASSES[r.status]}`}
                    value={r.status}
                    disabled={busyId === r.id}
                    onChange={(e) => changeStatus(r.id, e.target.value)}
                    title={`Status: ${requestStatusLabel(r.status)}`}
                  >
                    {REQUEST_STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {r.jiraUrl ? (
                    <a
                      href={r.jiraUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      {r.jiraKey} ↗
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Not linked</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link
                    href={`/requests/${r.id}/edit`}
                    className="text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    disabled={busyId === r.id}
                    className="ml-3 text-gray-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
