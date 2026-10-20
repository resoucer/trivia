import { myTriviasUseCase } from "@/application/triviaService";
import { TriviaList } from "@/components/TriviaList";
import { encodeSummary } from "@/contract/dto";
import { requestContext } from "@/server/context";
import { unwrapForPage } from "@/server/page";

export { MyTriviasPage as default };

async function MyTriviasPage() {
  const list = await unwrapForPage(
    requestContext().andThen((ctx) => myTriviasUseCase(ctx.db, ctx.viewer)),
    "/minhas",
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Minhas trivias</h1>
      <TriviaList items={list.map(encodeSummary)} empty="Você ainda não salvou nenhuma trivia." />
    </div>
  );
}
