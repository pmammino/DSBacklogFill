import type { RequestType } from "@prisma/client";
import { REQUEST_TYPE_OPTIONS, SPORTS } from "./constants";

export interface RequestInput {
  requesterName: string;
  requesterAccountId: string | null;
  description: string;
  sport: string;
  type: RequestType;
  dataLink: string | null;
  businessCase: string;
  dueDate: Date | null;
}

export interface ParseResult {
  data?: RequestInput;
  errors: Record<string, string>;
  files: File[];
}

const VALID_TYPES = REQUEST_TYPE_OPTIONS.map((o) => o.value);
const VALID_SPORTS = new Set<string>(SPORTS);

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Parse and validate a multipart form submission into a RequestInput. */
export function parseRequestForm(form: FormData): ParseResult {
  const errors: Record<string, string> = {};

  const requesterName = str(form, "requesterName");
  const requesterAccountId = str(form, "requesterAccountId");
  const description = str(form, "description");
  const sport = str(form, "sport");
  const rawType = str(form, "type");
  const dataLink = str(form, "dataLink");
  const businessCase = str(form, "businessCase");
  const rawDueDate = str(form, "dueDate");

  if (!requesterName) errors.requesterName = "Requester name is required.";
  if (!description) errors.description = "A description of the request is required.";
  if (!sport) errors.sport = "Please choose a sport.";
  else if (!VALID_SPORTS.has(sport)) errors.sport = "Unknown sport.";
  if (!businessCase) errors.businessCase = "A business use case / value description is required.";

  if (!rawType) {
    errors.type = "Please choose a request type.";
  } else if (!VALID_TYPES.includes(rawType as RequestType)) {
    errors.type = "Unknown request type.";
  }

  let dueDate: Date | null = null;
  if (rawDueDate) {
    const parsed = new Date(rawDueDate);
    if (Number.isNaN(parsed.getTime())) {
      errors.dueDate = "Invalid due date.";
    } else {
      dueDate = parsed;
    }
  }

  if (dataLink && !/^https?:\/\//i.test(dataLink)) {
    errors.dataLink = "Link must start with http:// or https://";
  }

  const files = form
    .getAll("attachments")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (Object.keys(errors).length > 0) {
    return { errors, files };
  }

  return {
    errors,
    files,
    data: {
      requesterName,
      requesterAccountId: requesterAccountId || null,
      description,
      sport,
      type: rawType as RequestType,
      dataLink: dataLink || null,
      businessCase,
      dueDate,
    },
  };
}
