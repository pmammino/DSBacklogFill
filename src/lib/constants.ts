import type { RequestType, RequestStatus } from "@prisma/client";

// Sports the intake form offers. Edit this list to match your coverage.
export const SPORTS = [
  "NFL",
  "NBA",
  "MLB",
  "NHL",
  "NCAAF",
  "NCAAB",
  "Soccer",
  "Tennis",
  "Golf",
  "MMA / UFC",
  "Horse Racing",
  "Esports",
  "Multi-sport",
  "Other",
] as const;

export const REQUEST_TYPE_OPTIONS: { value: RequestType; label: string }[] = [
  { value: "RESEARCH", label: "Research" },
  { value: "PROJECTIONS", label: "Projections" },
  { value: "ALGORITHM_UPDATE", label: "Algorithm Update" },
  { value: "OTHER", label: "Other" },
];

export const REQUEST_STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Done" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function requestTypeLabel(type: RequestType): string {
  return REQUEST_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function requestStatusLabel(status: RequestStatus): string {
  return REQUEST_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export const STATUS_BADGE_CLASSES: Record<RequestStatus, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  BLOCKED: "bg-red-100 text-red-800",
  DONE: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-200 text-gray-600",
};
