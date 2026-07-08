import RequestsDashboard from "@/components/RequestsDashboard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const requests = await prisma.request.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates for the client component.
  const serialized = requests.map((r) => ({
    ...r,
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return <RequestsDashboard initialRequests={serialized} />;
}
