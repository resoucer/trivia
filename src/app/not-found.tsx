import Link from "next/link";

export { NotFound as default };

function NotFound() {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-2xl font-bold">Trivia não encontrada</h1>
      <p className="text-slate-600">O link pode estar errado, ou a trivia anônima expirou após 30 dias sem atividade.</p>
      <Link href="/" className="text-indigo-600 hover:underline">Voltar ao início</Link>
    </div>
  );
}
