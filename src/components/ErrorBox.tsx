import { type ClientError, clientErrorMessage, describeIssuePath } from "@/client/api";

export { ErrorBox };

function ErrorBox({ error }: { error: ClientError }) {
  const issues = error.type === "http" ? error.body.error.issues : [];
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <p className="font-medium">{clientErrorMessage(error)}</p>
      {issues.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {issues.map((issue, i) => (
            <li key={i}>
              {describeIssuePath(issue.path) === "" ? "" : `${describeIssuePath(issue.path)}: `}
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
