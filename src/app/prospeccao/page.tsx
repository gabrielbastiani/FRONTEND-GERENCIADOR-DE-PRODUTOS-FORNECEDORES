"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const ProspectingMap = dynamic(
  () => import("@/components/prospecting/prospecting-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Carregando mapa...
      </div>
    )
  }
);

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333").replace(/\/$/, "");

type Municipality = { code: string; name: string };
type Cnae = { code: string; description: string };
type Company = {
  cnpj: string;
  cnpjBase: string;
  name: string;
  fantasyName: string | null;
  corporateName: string;
  registrationStatus: string;
  registrationStatusDate: string | null;
  activityStartDate: string | null;
  establishmentType: string | null;
  uf: string;
  municipalityCode: string;
  municipality: string;
  address: string;
  street: string;
  postalCode: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  mainCnaeCode: string;
  mainCnaeDescription: string;
  secondaryCnaeCodes: string[];
  companySizeCode: string | null;
  legalNatureCode: string | null;
  latitude: number | null;
  longitude: number | null;
  geocodedAt: string | null;
};
type GeoResult = { label: string; lat: number; lon: number };
type SearchResponse = {
  data: Company[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  competence: string;
  states: string[];
};
type ImportStatus = {
  published: null | {
    competence: string;
    states: string[];
    companiesCount: number;
    establishmentsCount: number;
    meiExcludedCount: number;
    finishedAt: string | null;
  };
  lastRun: null | {
    competence: string;
    states: string[];
    status: string;
    errorMessage: string | null;
    startedAt: string;
    finishedAt: string | null;
  };
};

type ApiError = Error & { payload?: unknown };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {})
    },
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || `Erro HTTP ${response.status}.`) as ApiError;
    error.payload = data;
    throw error;
  }
  return data as T;
}

function formatCnpj(value: string) {
  const cnpj = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

function dateLabel(value: string | null) {
  if (!value || /^0+$/.test(value)) return "—";
  if (/^\d{8}$/.test(value)) return `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}`;
  return value;
}

function companyPhone(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return value;
}

export default function ProspeccaoPage() {
  const [uf, setUf] = useState("");
  const [search, setSearch] = useState("");
  const [onlyWithContact, setOnlyWithContact] = useState(false);
  const [municipalitySearch, setMunicipalitySearch] = useState("");
  const [municipalityOptions, setMunicipalityOptions] = useState<Municipality[]>([]);
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<Municipality[]>([]);
  const [cnaeSearch, setCnaeSearch] = useState("");
  const [cnaeOptions, setCnaeOptions] = useState<Cnae[]>([]);
  const [selectedCnaes, setSelectedCnaes] = useState<Cnae[]>([]);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number; label: string; query: string } | null>(null);
  const [mapCenterLoading, setMapCenterLoading] = useState(false);
  const [mapCenterError, setMapCenterError] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const loadImportStatus = useCallback(async () => {
    try {
      const status = await request<ImportStatus>("/prospecting/import-status");
      setImportStatus(status);
    } catch {
      setImportStatus(null);
    }
  }, []);

  const loadCompanies = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError("");
    setSelected(null);
    setActionMessage(null);
    try {
      const params = new URLSearchParams();
      if (uf) params.set("uf", uf);
      if (selectedMunicipalities.length) params.set("municipalities", selectedMunicipalities.map((item) => item.code).join(","));
      if (selectedCnaes.length) params.set("cnae", selectedCnaes.map((item) => item.code).join(","));
      if (search.trim()) params.set("search", search.trim());
      params.set("onlyWithContact", String(onlyWithContact));
      params.set("page", String(targetPage));
      params.set("limit", "25");
      const payload = await request<SearchResponse>(`/prospecting/companies?${params.toString()}`);
      setResults(payload);
    } catch (err) {
      setResults(null);
      setError(err instanceof Error ? err.message : "Não foi possível pesquisar empresas.");
    } finally {
      setLoading(false);
    }
  }, [uf, selectedMunicipalities, selectedCnaes, search, onlyWithContact]);

  useEffect(() => {
    void loadImportStatus();
  }, [loadImportStatus]);

  useEffect(() => {
    let cancelled = false;
    request<SearchResponse>("/prospecting/companies?page=1&limit=25&onlyWithContact=false")
      .then((payload) => { if (!cancelled) setResults(payload); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível carregar empresas."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMunicipalities() {
      if (municipalitySearch.trim().length < 2) {
        setMunicipalityOptions([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const params = new URLSearchParams({ uf, q: municipalitySearch.trim() });
        const items = await request<Municipality[]>(`/prospecting/municipalities?${params}`);
        if (!cancelled) setMunicipalityOptions(items);
      } catch {
        if (!cancelled) setMunicipalityOptions([]);
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }
    const timer = setTimeout(() => void loadMunicipalities(), 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [uf, municipalitySearch]);

  useEffect(() => {
    let cancelled = false;
    async function loadCnaes() {
      if (cnaeSearch.trim().length < 2) {
        setCnaeOptions([]);
        return;
      }
      try {
        const items = await request<Cnae[]>(`/prospecting/cnaes?q=${encodeURIComponent(cnaeSearch.trim())}`);
        if (!cancelled) setCnaeOptions(items);
      } catch {
        if (!cancelled) setCnaeOptions([]);
      }
    }
    const timer = setTimeout(() => void loadCnaes(), 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cnaeSearch]);

  const geocodedPlaces = useMemo(() => (results?.data || [])
    .filter((item) => typeof item.latitude === "number" && typeof item.longitude === "number")
    .map((item) => ({ id: item.cnpj, name: item.name, lat: item.latitude as number, lon: item.longitude as number })), [results]);

  const mapLocationQuery = useMemo(() => {
    const firstCompany = results?.data?.[0];
    const municipality = selectedMunicipalities[0]?.name || firstCompany?.municipality;
    const state = uf || firstCompany?.uf;
    return municipality && state ? `${municipality}, ${state}, Brasil` : "";
  }, [selectedMunicipalities, uf, results?.data]);

  useEffect(() => {
    if (!showMap || !results?.data?.length || geocodedPlaces.length > 0 || !mapLocationQuery) return;
    if (mapCenter?.query === mapLocationQuery) return;

    let cancelled = false;
    setMapCenterLoading(true);
    setMapCenterError("");

    request<GeoResult[]>(`/prospecting/geocode?q=${encodeURIComponent(mapLocationQuery)}`)
      .then((locations) => {
        if (cancelled) return;
        const first = locations[0];
        if (!first || !Number.isFinite(first.lat) || !Number.isFinite(first.lon)) {
          setMapCenterError("Não foi possível localizar o centro deste município.");
          return;
        }
        setMapCenter({ lat: first.lat, lon: first.lon, label: first.label, query: mapLocationQuery });
      })
      .catch((err) => {
        if (!cancelled) setMapCenterError(err instanceof Error ? err.message : "Não foi possível localizar o município.");
      })
      .finally(() => {
        if (!cancelled) setMapCenterLoading(false);
      });

    return () => { cancelled = true; };
  }, [showMap, results?.data, geocodedPlaces.length, mapLocationQuery, mapCenter?.query]);

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault();
    await loadCompanies(1);
  }

  function addMunicipality(item: Municipality) {
    setSelectedMunicipalities((current) => current.some((entry) => entry.code === item.code) ? current : [...current, item]);
    setMunicipalitySearch("");
    setMunicipalityOptions([]);
  }

  function removeMunicipality(code: string) {
    setSelectedMunicipalities((current) => current.filter((item) => item.code !== code));
  }

  function addCnae(item: Cnae) {
    setSelectedCnaes((current) => current.some((entry) => entry.code === item.code) ? current : [...current, item]);
    setCnaeSearch("");
    setCnaeOptions([]);
  }

  function removeCnae(code: string) {
    setSelectedCnaes((current) => current.filter((item) => item.code !== code));
  }

  async function handleGeocode(company: Company) {
    setGeocoding(true);
    setActionMessage(null);
    try {
      const location = await request<{ latitude: number; longitude: number }>(
        `/prospecting/companies/${encodeURIComponent(company.cnpj)}/geocode`,
        { method: "POST" }
      );
      const updated = { ...company, latitude: location.latitude, longitude: location.longitude };
      setSelected(updated);
      setMapCenter({ lat: location.latitude, lon: location.longitude, label: company.address, query: mapLocationQuery });
      setResults((current) => current ? {
        ...current,
        data: current.data.map((item) => item.cnpj === company.cnpj ? updated : item)
      } : current);
      setShowMap(true);
      setActionMessage({ type: "ok", text: "Endereço localizado e coordenadas salvas para as próximas consultas." });
    } catch (err) {
      setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Não foi possível localizar o endereço." });
    } finally {
      setGeocoding(false);
    }
  }

  async function handleImport(company: Company) {
    setImporting(true);
    setActionMessage(null);
    try {
      await request(`/prospecting/companies/${encodeURIComponent(company.cnpj)}/import`, { method: "POST" });
      setActionMessage({ type: "ok", text: "Empresa cadastrada como fornecedor com sucesso." });
    } catch (err) {
      setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Não foi possível cadastrar o fornecedor." });
    } finally {
      setImporting(false);
    }
  }

  const currentPage = results?.page ?? 1;
  const totalPages = results?.pages ?? 0;
  const pageCompanyCount = results?.data.length ?? 0;
  const geocodedCount = geocodedPlaces.length;
  const pendingGeocodeCount = Math.max(0, pageCompanyCount - geocodedCount);
  const effectiveMapCenter = geocodedPlaces.length === 1
    ? { lat: geocodedPlaces[0].lat, lon: geocodedPlaces[0].lon, label: geocodedPlaces[0].name }
    : mapCenter || (geocodedPlaces[0]
      ? { lat: geocodedPlaces[0].lat, lon: geocodedPlaces[0].lon, label: geocodedPlaces[0].name }
      : null);

  return (
    <main className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Prospecção de fornecedores</h1>
          <p className="mt-1 text-sm text-slate-600">Pesquise estabelecimentos ativos nos dados abertos do CNPJ da Receita Federal.</p>
        </div>
        <button type="button" onClick={() => setShowMap((value) => !value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {showMap ? "Ocultar mapa" : "Mostrar mapa"}
        </button>
      </header>

      {importStatus?.published ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">Base disponível: competência {importStatus.published.competence}</span>
            <span>{importStatus.published.establishmentsCount.toLocaleString("pt-BR")} estabelecimentos · MEIs excluídos: {importStatus.published.meiExcludedCount.toLocaleString("pt-BR")}</span>
          </div>
          <p className="mt-1 text-xs text-emerald-800">UFs importadas: {importStatus.published.states.join(", ")}. A base não é atualizada automaticamente.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A base local da Receita ainda não está publicada. Configure os arquivos mensais e execute o importador indicado na documentação do backend.
        </div>
      )}

      <form onSubmit={handleSearch} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-2">
            <label htmlFor="uf" className="mb-1 block text-xs font-semibold text-slate-600">Estado</label>
            <select id="uf" value={uf} onChange={(event) => { setUf(event.target.value); setSelectedMunicipalities([]); setMapCenter(null); }} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
              <option value="">Todas as UFs importadas</option>
              {(importStatus?.published?.states?.length ? importStatus.published.states : ["RS"]).map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-7">
            <label htmlFor="company-search" className="mb-1 block text-xs font-semibold text-slate-600">Nome da empresa ou CNPJ</label>
            <input id="company-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: distribuidora de utilidades ou 12.ABC.345/01DE-35" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
          <div className="flex items-end md:col-span-3">
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Pesquisando..." : "Pesquisar empresas"}</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <label htmlFor="municipality-search" className="mb-1 block text-xs font-semibold text-slate-600">Municípios (você pode selecionar vários)</label>
            <input id="municipality-search" value={municipalitySearch} onChange={(event) => setMunicipalitySearch(event.target.value)} placeholder="Digite para localizar uma cidade..." className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            {(municipalityOptions.length > 0 || loadingFilters) && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {loadingFilters && <p className="px-3 py-2 text-xs text-slate-500">Buscando municípios...</p>}
                {municipalityOptions.map((item) => <button key={item.code} type="button" onClick={() => addMunicipality(item)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">{item.name}</button>)}
              </div>
            )}
            {selectedMunicipalities.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{selectedMunicipalities.map((item) => <span key={item.code} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800">{item.name}<button type="button" onClick={() => { removeMunicipality(item.code); setMapCenter(null); }} aria-label={`Remover ${item.name}`} className="font-bold">×</button></span>)}</div>}
          </div>
          <div className="relative">
            <label htmlFor="cnae-search" className="mb-1 block text-xs font-semibold text-slate-600">Atividades econômicas (CNAE)</label>
            <input id="cnae-search" value={cnaeSearch} onChange={(event) => setCnaeSearch(event.target.value)} placeholder="Digite código ou descrição, ex.: atacadista" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            {cnaeOptions.length > 0 && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">{cnaeOptions.map((item) => <button key={item.code} type="button" onClick={() => addCnae(item)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"><span className="font-semibold">{item.code}</span><span className="ml-2 text-slate-600">{item.description}</span></button>)}</div>}
            {selectedCnaes.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{selectedCnaes.map((item) => <span key={item.code} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-800">{item.code} · {item.description}<button type="button" onClick={() => removeCnae(item.code)} aria-label={`Remover CNAE ${item.code}`} className="font-bold">×</button></span>)}</div>}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={onlyWithContact} onChange={(event) => setOnlyWithContact(event.target.checked)} className="rounded border-slate-300" />Somente empresas com telefone ou e-mail</label>
          <p className="text-xs text-slate-500">A base exibe estabelecimentos ativos e exclui MEIs optantes na competência importada.</p>
        </div>
      </form>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {results && (
        <div className="grid items-start gap-4 xl:grid-cols-12">
          <section className={showMap ? "space-y-3 xl:col-span-5" : "space-y-3 xl:col-span-7"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-900">Resultados</h2>
                <p className="text-xs text-slate-500">{results.total.toLocaleString("pt-BR")} estabelecimento(s) encontrado(s) · página {currentPage} de {totalPages || 1}</p>
              </div>
              <span className="text-xs text-slate-500">{pageCompanyCount} nesta página</span>
            </div>
            <div className="max-h-[calc(100vh-19rem)] min-h-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-white xl:max-h-[calc(100vh-17rem)]">
              {results.data.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Nenhum estabelecimento corresponde aos filtros selecionados.</p> : results.data.map((company) => (
                <button key={company.cnpj} type="button" onClick={() => { setSelected(company); setActionMessage(null); }} aria-pressed={selected?.cnpj === company.cnpj} className={`block w-full border-b border-slate-100 p-4 text-left last:border-b-0 hover:bg-slate-50 ${selected?.cnpj === company.cnpj ? "bg-blue-50/70 ring-1 ring-inset ring-blue-200" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2"><span className="font-medium text-slate-900">{company.name}</span><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Ativa</span></div>
                  <p className="mt-0.5 text-xs text-slate-500">{formatCnpj(company.cnpj)} · {company.municipality}/{company.uf}</p>
                  <p className="mt-1 text-xs text-slate-600">CNAE {company.mainCnaeCode} — {company.mainCnaeDescription}</p>
                  <p className="mt-1 text-xs text-slate-500">{company.address}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500"><span>{companyPhone(company.phone) || "Sem telefone"}</span><span>{company.email || "Sem e-mail"}</span>{company.latitude !== null && company.longitude !== null && <span className="font-medium text-blue-700">Georreferenciada</span>}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button type="button" disabled={loading || currentPage <= 1} onClick={() => void loadCompanies(currentPage - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40">Página anterior</button>
              <button type="button" disabled={loading || currentPage >= totalPages} onClick={() => void loadCompanies(currentPage + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40">Próxima página</button>
            </div>
          </section>

          <section className={`space-y-3 ${showMap ? "xl:col-span-4" : "xl:col-span-5"}`}>
            <div className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:rounded-xl">
              {selected ? (
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Empresa selecionada</p>
                      <h2 className="mt-1 text-lg font-semibold leading-tight text-slate-900">{selected.name}</h2>
                      <p className="mt-1 break-words text-xs text-slate-500">{selected.corporateName}</p>
                      <p className="mt-1 text-xs text-slate-500">CNPJ {formatCnpj(selected.cnpj)}</p>
                    </div>
                    <button type="button" onClick={() => { setSelected(null); setActionMessage(null); }} className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" aria-label="Fechar detalhes">Fechar</button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3">
                    <div><p className="text-[11px] text-slate-500">Situação cadastral</p><p className="text-sm font-medium text-emerald-700">Ativa ({selected.registrationStatus})</p></div>
                    <div><p className="text-[11px] text-slate-500">Início da atividade</p><p className="text-sm text-slate-800">{dateLabel(selected.activityStartDate)}</p></div>
                    <div><p className="text-[11px] text-slate-500">Porte cadastral</p><p className="text-sm text-slate-800">{selected.companySizeCode || "Não informado"}</p></div>
                    <div><p className="text-[11px] text-slate-500">Natureza jurídica</p><p className="text-sm text-slate-800">{selected.legalNatureCode || "Não informada"}</p></div>
                    <div className="col-span-2"><p className="text-[11px] text-slate-500">Endereço completo</p><p className="text-sm text-slate-800">{selected.address}</p></div>
                    <div><p className="text-[11px] text-slate-500">Telefone</p><p className="text-sm text-slate-800">{companyPhone(selected.phone) || "Não informado"}</p></div>
                    <div className="min-w-0"><p className="text-[11px] text-slate-500">E-mail</p><p className="break-all text-sm text-slate-800">{selected.email || "Não informado"}</p></div>
                    <div className="col-span-2"><p className="text-[11px] text-slate-500">CNAE principal</p><p className="text-sm text-slate-800">{selected.mainCnaeCode} — {selected.mainCnaeDescription}</p></div>
                    <div className="col-span-2"><p className="text-[11px] text-slate-500">CNAEs secundários</p><p className="break-words text-xs leading-relaxed text-slate-700">{selected.secondaryCnaeCodes.length ? selected.secondaryCnaeCodes.join(", ") : "Nenhum informado"}</p></div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Abrir endereço no Google Maps</a>
                    <button type="button" onClick={() => void handleGeocode(selected)} disabled={geocoding} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">{geocoding ? "Localizando..." : selected.latitude !== null ? "Atualizar localização" : "Localizar no mapa"}</button>
                    <button type="button" onClick={() => void handleImport(selected)} disabled={importing} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{importing ? "Cadastrando..." : "Cadastrar como fornecedor"}</button>
                    {actionMessage && <p role="status" className={`text-xs ${actionMessage.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>{actionMessage.text}</p>}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Os dados cadastrais são os divulgados pela Receita Federal. Telefone e e-mail podem estar desatualizados ou pertencer a terceiros que prestam serviços administrativos à empresa.</p>
                </article>
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center xl:min-h-[420px]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>
                  <h2 className="mt-3 text-sm font-semibold text-slate-800">Detalhes da empresa</h2>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">Selecione uma empresa na lista para ver os dados cadastrais e as ações aqui, sem precisar descer a página.</p>
                </div>
              )}
            </div>
          </section>

          {showMap && (
            <section className="space-y-3 xl:col-span-3">
              <div>
                <h2 className="font-semibold text-slate-900">Mapa dos estabelecimentos</h2>
                <p className="text-xs text-slate-500">Mapa da cidade com os pontos já localizados nesta página.</p>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center"><p className="text-lg font-semibold tabular-nums text-slate-900">{pageCompanyCount}</p><p className="text-[10px] leading-tight text-slate-500">Nesta página</p></div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-center"><p className="text-lg font-semibold tabular-nums text-emerald-800">{geocodedCount}</p><p className="text-[10px] leading-tight text-emerald-700">Localizadas</p></div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-center"><p className="text-lg font-semibold tabular-nums text-amber-800">{pendingGeocodeCount}</p><p className="text-[10px] leading-tight text-amber-700">Pendentes</p></div>
              </div>
              <div className="relative h-[440px] min-h-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white xl:h-[calc(100vh-18rem)] xl:min-h-[420px] xl:max-h-[720px]">
                {effectiveMapCenter ? (
                  <ProspectingMap center={{ lat: effectiveMapCenter.lat, lon: effectiveMapCenter.lon }} radiusKm={0} places={geocodedPlaces} selectedId={selected?.cnpj || null} onSelect={(id) => { const item = results.data.find((company) => company.cnpj === id); if (item) { setSelected(item); setActionMessage(null); } }} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-5 text-center"><span className="text-sm font-medium text-slate-700">{mapCenterLoading ? "Localizando o município..." : "Preparando mapa da cidade..."}</span><p className="mt-1 text-xs text-slate-500">{mapCenterError || "O mapa será centralizado no município pesquisado. Os marcadores aparecem conforme os endereços forem localizados."}</p></div>
                )}
                {effectiveMapCenter && geocodedPlaces.length === 0 && (
                  <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-center shadow-sm"><p className="text-xs font-medium text-slate-700">Mapa da cidade disponível</p><p className="text-[11px] text-slate-500">Nenhuma empresa desta página foi georreferenciada ainda.</p></div>
                )}
                {mapCenterLoading && effectiveMapCenter && <div className="absolute right-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[10px] text-slate-500 shadow">Atualizando centro do mapa...</div>}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
