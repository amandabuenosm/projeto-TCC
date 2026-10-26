import React from 'react';
import { ItemDivergencia } from '../../types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { Eye, BrainCircuit, CheckCircle2 } from 'lucide-react';

export interface PropsTabelaDivergencias {
  divergences?: ItemDivergencia[];
  divergencias?: ItemDivergencia[];
  identifierLabel?: string;
  rotuloIdentificador?: string;
  onSelectDivergence?: (item: ItemDivergencia) => void;
  aoSelecionarDivergencia?: (item: ItemDivergencia) => void;
}

const formatarValor = (valor: any): string =>
  valor === null || valor === undefined || valor === ''
    ? '-'
    : typeof valor === 'number'
    ? new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 10,
      }).format(valor)
    : String(valor);

export const DivergenceTable: React.FC<PropsTabelaDivergencias> = ({
  divergences,
  divergencias,
  identifierLabel,
  rotuloIdentificador,
  onSelectDivergence,
  aoSelecionarDivergencia,
}) => {
  const lista = divergencias || divergences || [];
  const rotulo = rotuloIdentificador || identifierLabel || 'Documento';
  const selecionar = aoSelecionarDivergencia || onSelectDivergence || (() => {});

  if (!lista.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="text-lg font-bold text-slate-200">
          Nenhuma divergência encontrada
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Não há registros correspondentes aos filtros ou todos os itens foram
          conciliados pelo motor determinístico.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase">
            <tr>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">{rotulo}</th>
              <th className="py-3 px-4">Diferenças</th>
              <th className="py-3 px-4 text-center">Ação</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {lista.map((item) => (
              <tr
                key={item.id}
                onClick={() => selecionar(item)}
                className="hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4">
                  <StatusBadge status={item.status} />
                </td>

                <td className="py-3 px-4 font-mono font-semibold text-slate-100">
                  {item.identifier}
                </td>

                <td className="py-3 px-4 max-w-md text-slate-300">
                  {item.divergentFields.length ? (
                    item.divergentFields.map((campo, i) => (
                      <div key={i} className="truncate">
                        <strong>{campo.fieldName}</strong>:{' '}
                        {formatarValor(campo.valueA)} → {formatarValor(campo.valueB)}
                      </div>
                    ))
                  ) : (
                    '-'
                  )}
                </td>

                <td className="py-3 px-4 text-center">
                  {item.aiAnalyzed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-950 text-purple-300 text-[10px] font-bold">
                      <BrainCircuit className="w-3 h-3" />
                      Analisado IA
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selecionar(item);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 text-[11px] font-semibold hover:bg-cyan-900"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detalhar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};