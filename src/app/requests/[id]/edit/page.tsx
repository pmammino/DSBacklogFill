import { notFound } from "next/navigation";
import Link from "next/link";
import RequestForm from "@/components/RequestForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditRequestPage({
  params,
}: {
  params: { id: string };
}) {
  const request = await prisma.request.findUnique({ where: { id: params.id } });
  if (!request) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Edit Request</h1>
          <p className="mt-1 text-sm text-gray-600">
            Changes sync to the linked JIRA ticket where possible.
          </p>
        </div>
        {request.jiraUrl && (
          <a
            href={request.jiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary shrink-0"
          >
            View {request.jiraKey} ↗
          </a>
        )}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <RequestForm
          mode="edit"
          initial={{
            id: request.id,
            requesterName: request.requesterName,
            requesterAccountId: request.requesterAccountId,
            description: request.description,
            sport: request.sport,
            type: request.type,
            dataLink: request.dataLink,
            businessCase: request.businessCase,
            dueDate: request.dueDate
              ? request.dueDate.toISOString().slice(0, 10)
              : null,
            status: request.status,
          }}
        />
      </div>
      <div className="mt-4 text-center">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to all requests
        </Link>
      </div>
    </div>
  );
}
