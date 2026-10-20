import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/server/nextParam";

export { LoginPage as default };

async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | Array<string> | undefined>>;
}) {
  const next = safeNext(await searchParams);
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <AuthForm mode="login" next={next} />
    </div>
  );
}
