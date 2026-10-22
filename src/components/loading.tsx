export function Loading({
  text = "Carregando..."
}: {
  text?: string;
}) {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <div className="text-sm text-slate-500">{text}</div>
    </div>
  );
}