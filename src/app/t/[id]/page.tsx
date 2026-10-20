import { okAsync } from "neverthrow";
import type { Metadata } from "next";
import Link from "next/link";
import { loadTrivia } from "@/application/triviaService";
import { ClaimButton } from "@/components/ClaimButton";
import { Player } from "@/components/Player";
import { ShareBox } from "@/components/ShareBox";
import { encodePublicTrivia, sharePath } from "@/contract/dto";
import { ANONYMOUS_TTL_DAYS, canEditTrivia } from "@/domain/trivia/lifecycle";
import { toPublicTrivia } from "@/domain/trivia/trivia";
import { readClaimToken } from "@/infra/auth/cookies";
import { matchMaybe, Nothing } from "@/lib/maybe";
import { requestContext } from "@/server/context";
import { unwrapForPage } from "@/server/page";

export { generateMetadata, TriviaPage as default };

type Props = {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" });

async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return requestContext()
    .andThen((ctx) => loadTrivia(ctx.db, id, ctx.now))
    .match(
      (trivia): Metadata => ({ title: `${trivia.title} — Trivia` }),
      (): Metadata => ({ title: "Trivia não encontrada" }),
    );
}

async function TriviaPage({ params, searchParams }: Props) {
  const { id } = await params;
  const justCreated = (await searchParams)["criada"] === "1";
  const { trivia, viewer, claimToken } = await unwrapForPage(
    requestContext().andThen((ctx) =>
      loadTrivia(ctx.db, id, ctx.now).andThen((trivia) =>
        (trivia.owner.type === "anonymous" ? readClaimToken(trivia.id) : okAsync(Nothing<string>())).map(
          (claimToken) => ({
            trivia,
            viewer: ctx.viewer,
            claimToken,
          }),
        ),
      ),
    ),
    `/t/${id}`,
  );
  const publicTrivia = toPublicTrivia(trivia);
  const canClaim = claimToken.type === "just";
  const path = sharePath(trivia.id);

  return (
    <div className="space-y-6">
      {justCreated ? (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-900">Trivia criada! Compartilhe este link:</p>
          <ShareBox path={path} />
        </div>
      ) : null}

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{trivia.title}</h1>
        {matchMaybe(trivia.description, {
          just: (d) => <p className="text-slate-600">{d}</p>,
          nothing: () => null,
        })}
        <p className="text-sm text-slate-500">
          por {trivia.authorName.value} · {trivia.questions.length} pergunta(s) · jogada {trivia.playCount} vez(es)
        </p>
        {canEditTrivia(trivia, viewer) ? (
          <Link href={`${path}/editar`} className="inline-block text-sm font-medium text-indigo-600 hover:underline">
            Editar trivia
          </Link>
        ) : null}
      </header>

      {matchMaybe(publicTrivia.expiresAt, {
        just: (date) => (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>
              Trivia anônima: acessível só por link, fora do ranking. Será apagada em {dateFormat.format(date)} se ficar{" "}
              {ANONYMOUS_TTL_DAYS} dias sem ser jogada.
            </p>
            {canClaim && viewer.type === "user" ? <ClaimButton triviaId={trivia.id.value} /> : null}
            {canClaim && viewer.type === "anonymous" ? (
              <p>
                Foi você quem criou?{" "}
                <Link href={`/entrar?next=${encodeURIComponent(path)}`} className="font-medium underline">
                  Entre ou crie uma conta
                </Link>{" "}
                para salvá-la de vez.
              </p>
            ) : null}
          </div>
        ),
        nothing: () => null,
      })}

      {justCreated ? null : (
        <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium text-slate-700">Compartilhar</summary>
          <div className="mt-3">
            <ShareBox path={path} />
          </div>
        </details>
      )}

      <Player trivia={encodePublicTrivia(publicTrivia)} />
    </div>
  );
}
