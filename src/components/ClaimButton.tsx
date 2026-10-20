"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type ClientError, HttpMethod, requestJson } from "@/client/api";
import { ErrorBox } from "@/components/ErrorBox";
import { schema_PublicTriviaDto } from "@/contract/dto";

export { ClaimButton };

type ClaimState =
  | { readonly type: "idle" }
  | { readonly type: "saving" }
  | { readonly type: "failed"; readonly error: ClientError };

function ClaimButton({ triviaId }: { triviaId: string }) {
  const router = useRouter();
  const [state, setState] = useState<ClaimState>({ type: "idle" });
  const claim = (): void => {
    setState({ type: "saving" });
    void requestJson(
      HttpMethod.Post,
      `/api/trivias/${encodeURIComponent(triviaId)}/claim`,
      null,
      schema_PublicTriviaDto,
    ).match(
      () => {
        setState({ type: "idle" });
        router.refresh();
      },
      (error) => setState({ type: "failed", error }),
    );
  };
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={claim}
        disabled={state.type === "saving"}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {state.type === "saving" ? "Salvando…" : "Salvar na minha conta"}
      </button>
      {state.type === "failed" ? <ErrorBox error={state.error} /> : null}
    </div>
  );
}
