import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

export interface PropsBarraFiltros {
  statusFilter?: string;
  filtroStatus?: string;
  setStatusFilter?: (valor: string) => void;
  aoMudarFiltroStatus?: (valor: string) => void;
  aiFilter?: string;
  filtroIA?: string;
  setAiFilter?: (valor: string) => void;
  aoMudarFiltroIA?: (valor: string) => void;
  searchQuery?: string;
  termoBusca?: string;
  setSearchQuery?: (valor: string) => void;
  aoMudarTermoBusca?: (valor: string) => void;
  onResetFilters?: () => void;
  aoLimparFiltros?: () => void;
  totalFiltered?: number;
  totalFiltrado?: number;
}

export const FiltersBar: React.FC<PropsBarraFiltros> = ({
  statusFilter = '',
  filtroStatus,
  setStatusFilter,
  aoMudarFiltroStatus,
  aiFilter = '',
  filtroIA,
  setAiFilter,
  aoMudarFiltroIA,
  searchQuery = '',
  termoBusca,
  setSearchQuery,
  aoMudarTermoBusca,
  onResetFilters,
  aoLimparFiltros,
  totalFiltered = 0,
  totalFiltrado,
}) => {
  const statusAtual = filtroStatus !== undefined ? filtroStatus : statusFilter;
  const mudarStatus = aoMudarFiltroStatus || setStatusFilter || (() => {});
  const iaAtual = filtroIA !== undefined ? filtroIA : aiFilter;
  const mudarIA = aoMudarFiltroIA || setAiFilter || (() => {});
  const buscaAtual = termoBusca !== undefined ? termoBusca : searchQuery;
  const mudarBusca = aoMudarTermoBusca || setSearchQuery || (() => {});
  const limpar = aoLimparFiltros || onResetFilters || (() => {});
  const total = totalFiltrado !== undefined ? totalFiltrado : totalFiltered;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={buscaAtual}
            onChange={(e) => mudarBusca(e.target.value)}
            placeholder="Buscar por documento, descrição ou valor..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusAtual}
            onChange={(e) => mudarStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Todos os Status</option>
            <option value="DIVERGENTE">Divergente</option>
            <option value="AUSENTE_FONTE_A">Ausente na Fonte A</option>
            <option value="AUSENTE_FONTE_B">Ausente na Fonte B</option>
            <option value="DUPLICADA">Duplicada</option>
          </select>

          <select
            value={iaAtual}
            onChange={(e) => mudarIA(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Status da Análise de IA</option>
            <option value="analyzed">Analisadas pela IA</option>
            <option value="not_analyzed">Não Analisadas</option>
          </select>

          <button
            onClick={limpar}
            title="Limpar Filtros"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-400 pt-1 border-t border-slate-800">
        Exibindo <strong>{total}</strong> divergências filtradas
      </div>
    </div>
  );
};