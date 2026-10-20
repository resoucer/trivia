import Link from "next/link";
import { TriviaEditor } from "@/components/TriviaEditor";
import { emptyQuestionForm } from "@/contract/dto";
import { ANONYMOUS_TTL_DAYS } from "@/domain/trivia/lifecycle";
import { requestContext } from "@/server/context";
import { unwrapForPage } from "@/server/page";

export { CreatePage as default };

async function CreatePage() {
  const { viewer } = await unwrapForPage(requestContext(), "/criar");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nova trivia</h1>
      {viewer.type === "anonymous" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Você está criando sem conta: a trivia fica acessível só pelo link e é apagada após {ANONYMOUS_TTL_DAYS} dias sem
          atividade. <Link href="/entrar?next=/criar" className="font-medium underline">Entre</Link> para salvá-la, editá-la depois
          e aparecer no ranking.
        </p>
      ) : null}
      <TriviaEditor
        mode={{ type: "create", askAuthorName: viewer.type === "anonymous" }}
        initial={{ title: "", description: "", questions: [emptyQuestionForm()] }}
      />
    </div>
  );
}
