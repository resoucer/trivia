"use client";

import { useEffect, useState } from "react";

export { ShareBox };

type CopyState = { readonly type: "idle" } | { readonly type: "copied" } | { readonly type: "failed" };

function ShareBox({ path }: { path: string }) {
  const [url, setUrl] = useState(path);
  const [copy, setCopy] = useState<CopyState>({ type: "idle" });
  useEffect(() => setUrl(`${window.location.origin}${path}`), [path]);

  const copyLink = (): void => {
    navigator.clipboard.writeText(url).then(
      () => setCopy({ type: "copied" }),
      () => setCopy({ type: "failed" }),
    );
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input readOnly value={url} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700" onFocus={(e) => e.target.select()} />
      <button type="button" onClick={copyLink} className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
        {copy.type === "copied" ? "Copiado!" : copy.type === "failed" ? "Copie manualmente" : "Copiar link"}
      </button>
    </div>
  );
}
