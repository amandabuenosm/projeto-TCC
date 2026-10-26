import React from 'react';
import { ShieldCheck, BookOpen } from 'lucide-react';

export const Footer: React.FC = () => (
  <footer className="bg-slate-950 border-t border-slate-900 py-6 mt-12 text-slate-500 text-xs">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center space-x-2">
        <BookOpen className="w-4 h-4 text-cyan-400" />
        <span>Projeto de Pesquisa Acadêmica TCC - Amanda Gabrieli Bueno</span>
      </div>

      <div className="flex items-center space-x-4">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Processamento em Memória (Zero-DB)
        </span>

        <span>•</span>

        <span>Reconciliação + Análise por IA</span>
      </div>
    </div>
  </footer>
);