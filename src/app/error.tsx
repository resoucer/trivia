"use client";

export { ErrorPage as default };

function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="text-slate-600">{error.message}</p>
      <button type="button" onClick={reset} className="text-indigo-600 hover:underline">Tentar de novo</button>
    </div>
  );
}
