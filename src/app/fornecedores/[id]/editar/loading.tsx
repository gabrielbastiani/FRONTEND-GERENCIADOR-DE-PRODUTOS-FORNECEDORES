export default function Loading() {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="text-slate-500 animate-pulse">
        Carregando dados do fornecedor...
      </div>
    </div>
  );
}