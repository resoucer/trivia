import Link from "next/link";
import { rankingUseCase, recentUseCase } from "@/application/triviaService";
import { RankingList, TriviaList } from "@/components/TriviaList";
import { encodeRanked, encodeSummary } from "@/contract/dto";
import { requestContext } from "@/server/context";
import { unwrapForPage } from "@/server/page";

export { HomePage as default };

async function HomePage() {
  const { top, recent } = await unwrapForPage(
    requestContext().andThen((ctx) =>
      rankingUseCase(ctx.db, 5).andThen((top) => recentUseCase(ctx.db, 10).map((recent) => ({ top, recent }))),
    ),
    "/",
  );
  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white">
        <h1 className="text-3xl font-bold">Crie, compartilhe e jogue trivias</h1>
        <p className="mt-2 max-w-xl text-indigo-100">
          Monte um quiz de múltipla escolha em minutos e mande o link pra quem quiser. Não precisa de conta. Entre só se
          quiser guardar e editar suas trivias e aparecer no ranking.
        </p>
        <Link
          href="/criar"
          className="mt-5 inline-block rounded-lg bg-white px-5 py-2 font-semibold text-indigo-700 hover:bg-indigo-50"
        >
          Criar minha trivia
        </Link>
      </section>
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Mais jogadas</h2>
          <Link href="/ranking" className="text-sm text-indigo-600 hover:underline">
            Ver ranking completo
          </Link>
        </div>
        <RankingList items={top.map(encodeRanked)} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recentes</h2>
        <TriviaList items={recent.map(encodeSummary)} empty="Nenhuma trivia publicada ainda." />
      </section>
    </div>
  );
}
