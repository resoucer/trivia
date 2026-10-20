import Link from "next/link";
import type { RankedTriviaDto, TriviaSummaryDto } from "@/contract/dto";

export { RankingList, TriviaList };

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function Meta({ trivia }: { trivia: TriviaSummaryDto }) {
  return (
    <p className="text-sm text-slate-500">
      por {trivia.authorName} · {plural(trivia.questionCount, "pergunta", "perguntas")} ·{" "}
      {plural(trivia.playCount, "partida", "partidas")}
    </p>
  );
}

function TriviaList({ items, empty }: { items: ReadonlyArray<TriviaSummaryDto>; empty: string }) {
  if (items.length === 0) return <p className="text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {items.map((t) => (
        <li key={t.id}>
          <Link href={`/t/${encodeURIComponent(t.id)}`} className="block px-5 py-4 hover:bg-slate-50">
            <p className="font-medium text-slate-900">{t.title}</p>
            <Meta trivia={t} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RankingList({ items }: { items: ReadonlyArray<RankedTriviaDto> }) {
  if (items.length === 0) return <p className="text-slate-500">Nenhuma trivia no ranking ainda.</p>;
  return (
    <ol className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {items.map(({ position, trivia }) => (
        <li key={trivia.id}>
          <Link
            href={`/t/${encodeURIComponent(trivia.id)}`}
            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50"
          >
            <span className="w-8 text-center text-xl font-bold text-indigo-600">{position}º</span>
            <span>
              <span className="block font-medium text-slate-900">{trivia.title}</span>
              <Meta trivia={trivia} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
