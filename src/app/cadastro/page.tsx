import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/server/nextParam";

export { SignupPage as default };

async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext(await searchParams);
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <AuthForm mode="signup" next={next} />
    </div>
  );
}
