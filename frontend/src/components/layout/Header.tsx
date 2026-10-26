import React from 'react';
import { Scale, RefreshCw } from 'lucide-react';

export interface PropsCabecalho {
  onReset: () => void;
  aoReiniciar?: () => void;
}

export const Header: React.FC<PropsCabecalho> = ({ onReset, aoReiniciar }) => {
  const executarReiniciar = aoReiniciar || onReset;

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={executarReiniciar}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Scale className="w-5 h-5 text-cyan-400" />
            </div>
          </div>

          <div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Reconcilia<span className="text-cyan-400">IA</span>
            </span>

            <p className="text-xs text-slate-400 hidden sm:block">
              Compare dois relatórios e deixe a IA explicar as diferenças
            </p>
          </div>
        </div>

        <button
          onClick={executarReiniciar}
          title="Nova Reconciliação"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden md:inline">Reiniciar</span>
        </button>
      </div>
    </header>
  );
};