import RequestForm from "@/components/RequestForm";

export default function NewRequestPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          New Data Science Request
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Submitting this form creates a JIRA ticket assigned to the Data
          Science team lead. Fields marked with{" "}
          <span className="text-red-500">*</span> are required.
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <RequestForm mode="create" />
      </div>
    </div>
  );
}
