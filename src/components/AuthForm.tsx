"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HttpMethod, requestJson, type ClientError } from "@/client/api";
import { ErrorBox } from "@/components/ErrorBox";
import { schema_ViewerDto } from "@/contract/dto";

export { AuthForm, LogoutButton };

type AuthMode = "login" | "signup";
type FormState = { readonly type: "idle" } | { readonly type: "sending" } | { readonly type: "failed"; readonly error: ClientError };

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

function AuthForm({ mode, next }: { mode: AuthMode; next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [state, setState] = useState<FormState>({ type: "idle" });

  const submit = (): void => {
    setState({ type: "sending" });
    const request =
      mode === "login"
        ? requestJson(HttpMethod.Post, "/api/auth/login", { email, password }, schema_ViewerDto)
        : requestJson(HttpMethod.Post, "/api/auth/signup", { email, password, displayName }, schema_ViewerDto);
    void request.match(
      () => {
        router.push(next);
        router.refresh();
      },
      (error) => setState({ type: "failed", error }),
    );
  };

  return (
    <form
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {mode === "signup" ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Nome público</span>
          <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" />
        </label>
      ) : null}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">E-mail</span>
        <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Senha</span>
        <input
          className={inputClass}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>
      <button
        type="submit"
        disabled={state.type === "sending"}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {state.type === "sending" ? "Enviando…" : mode === "login" ? "Entrar" : "Criar conta"}
      </button>
      {state.type === "failed" ? <ErrorBox error={state.error} /> : null}
      <p className="text-center text-sm text-slate-600">
        {mode === "login" ? (
          <>
            Não tem conta? <Link className="text-indigo-600 hover:underline" href={`/cadastro?next=${encodeURIComponent(next)}`}>Cadastre-se</Link>
          </>
        ) : (
          <>
            Já tem conta? <Link className="text-indigo-600 hover:underline" href={`/entrar?next=${encodeURIComponent(next)}`}>Entrar</Link>
          </>
        )}
      </p>
    </form>
  );
}

function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-slate-600 hover:text-slate-900"
      onClick={() => {
        void requestJson(HttpMethod.Post, "/api/auth/logout", null, schema_ViewerDto).match(
          () => {
            router.push("/");
            router.refresh();
          },
          () => router.refresh(),
        );
      }}
    >
      Sair
    </button>
  );
}
