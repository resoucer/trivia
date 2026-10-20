import { errAsync, okAsync } from "neverthrow";
import { forbidden, unauthenticated } from "@/application/appError";
import { loadTrivia } from "@/application/triviaService";
import { TriviaEditor } from "@/components/TriviaEditor";
import { encodeTriviaForm } from "@/contract/dto";
import { canEditTrivia } from "@/domain/trivia/lifecycle";
import { requestContext } from "@/server/context";
import { unwrapForPage } from "@/server/page";

export { EditPage as default };

async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trivia = await unwrapForPage(
    requestContext().andThen((ctx) =>
      ctx.viewer.type === "anonymous"
        ? errAsync(unauthenticated())
        : loadTrivia(ctx.db, id, ctx.now).andThen((t) => (canEditTrivia(t, ctx.viewer) ? okAsync(t) : errAsync(forbidden()))),
    ),
    `/t/${id}/editar`,
  );
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar trivia</h1>
      <p className="text-sm text-slate-500">O link de compartilhamento continua o mesmo.</p>
      <TriviaEditor mode={{ type: "edit", triviaId: trivia.id.value }} initial={encodeTriviaForm(trivia)} />
    </div>
  );
}
