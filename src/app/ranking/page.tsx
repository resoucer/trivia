import { rankingUseCase } from "@/application/triviaService";
import { RankingList } from "@/components/TriviaList";
import { encodeRanked } from "@/contract/dto";
import { requestContext } from "@/server/context";
import { unwrapForPage } from "@/server/page";

export { RankingPage as default };

async function RankingPage() {
  const ranking = await unwrapForPage(
    requestContext().andThen((ctx) => rankingUseCase(ctx.db, 50)),
    "/ranking",
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ranking das mais jogadas</h1>
      <p className="text-sm text-slate-500">
        Só entram trivias salvas em uma conta. Trivias anônimas ficam acessíveis apenas pelo link.
      </p>
      <RankingList items={ranking.map(encodeRanked)} />
    </div>
  );
}
