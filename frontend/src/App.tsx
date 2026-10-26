import React, { useEffect, useState } from 'react';
import {
  Etapa,
  DadosFonteProcessada,
  MapeamentoCampos,
  ConfigCorrespondencia,
  ResumoConciliacao,
  ItemDivergencia,
  ItemAnomalia,
  ResultadoPadraoLote,
} from './types/index.js';
import { api, extrairMensagemErro } from './services/api.js';
import { Header } from './components/layout/Header.js';
import { Footer } from './components/layout/Footer.js';
import { StepProgress } from './components/layout/StepProgress.js';
import { FileUploader } from './components/import/FileUploader.js';
import { ColumnMapper } from './components/mapping/ColumnMapper.js';
import { MatchingConfigView } from './components/config/MatchingConfigView.js';
import { SummaryCards } from './components/dashboard/SummaryCards.js';
import { FiltersBar } from './components/results/FiltersBar.js';
import { DivergenceTable } from './components/results/DivergenceTable.js';
import { DivergenceDetailModal } from './components/detail/DivergenceDetailModal.js';
import { BatchPatternAnalysis } from './components/patterns/BatchPatternAnalysis.js';
import { ExportReportView } from './components/export/ExportReportView.js';
import { LoadingOverlay } from './components/common/LoadingOverlay.js';
import { BrainCircuit, Table, Download, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const [etapa, setEtapa] = useState<Etapa>('import');
  const [abaAtiva, setAbaAtiva] = useState<'divergences' | 'patterns'>('divergences');
  const [carregando, setCarregando] = useState(false);
  const [mensagemCarregamento, setMensagemCarregamento] = useState('');

  const [iaConfigurada, setIaConfigurada] = useState<boolean | null>(null);
  const [erroAcaoIA, setErroAcaoIA] = useState<string | null>(null);

  const [dadosFonteA, setDadosFonteA] = useState<DadosFonteProcessada | null>(null);
  const [dadosFonteB, setDadosFonteB] = useState<DadosFonteProcessada | null>(null);
  const [mapeamento, setMapeamento] = useState<MapeamentoCampos>();
  const [configCorrespondencia, setConfigCorrespondencia] = useState<ConfigCorrespondencia>();

  const [idSessao, setIdSessao] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoConciliacao | null>(null);
  const [divergencias, setDivergencias] = useState<ItemDivergencia[]>([]);
  const [anomalias, setAnomalias] = useState<ItemAnomalia[]>([]);
  const [analiseLote, setAnaliseLote] = useState<ResultadoPadraoLote>();

  const [itemSelecionado, setItemSelecionado] = useState<ItemDivergencia | null>(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroIA, setFiltroIA] = useState('');
  const [termoBusca, setTermoBusca] = useState('');

  useEffect(() => {
    api.obterStatusIA()
      .then((res) => setIaConfigurada(res.configured))
      .catch(() => setIaConfigurada(false));
  }, []);

  const aoSelecionarArquivos = async (arquivoA?: File, arquivoB?: File) => {
    if (!arquivoA && !arquivoB) return;

    setCarregando(true);
    setMensagemCarregamento('Lendo e extraindo colunas dos arquivos...');

    try {
      const res = await api.enviarArquivos(arquivoA, arquivoB);

      if (res.sourceA) {
        setDadosFonteA({
          filename: res.sourceA.filename,
          name: res.sourceA.filename || 'Fonte de Dados 1',
          headers: res.sourceA.headers,
          totalRecords: res.sourceA.totalRecords,
          preview: res.sourceA.preview,
          rawRecords: res.sourceA.rawRecords,
        });
      }

      if (res.sourceB) {
        setDadosFonteB({
          filename: res.sourceB.filename,
          name: res.sourceB.filename || 'Fonte de Dados 2',
          headers: res.sourceB.headers,
          totalRecords: res.sourceB.totalRecords,
          preview: res.sourceB.preview,
          rawRecords: res.sourceB.rawRecords,
        });
      }
    } catch (err: any) {
      alert(`Erro no upload: ${extrairMensagemErro(err, 'Falha ao processar arquivos')}`);
    } finally {
      setCarregando(false);
    }
  };

  const aoConfirmarMapeamento = (map: MapeamentoCampos) => {
    setMapeamento(map);
    setEtapa('config');
  };

  const aoExecutarConciliacao = async (config: ConfigCorrespondencia) => {
    if (!dadosFonteA || !dadosFonteB || !mapeamento) return;

    setConfigCorrespondencia(config);
    setCarregando(true);
    setMensagemCarregamento('Executando motor determinístico de reconciliação...');
    setEtapa('reconciling');

    try {
      const res = await api.executarConciliacao({
        sourceAName: dadosFonteA.name,
        sourceBName: dadosFonteB.name,
        recordsA: dadosFonteA.rawRecords,
        recordsB: dadosFonteB.rawRecords,
        mapping: mapeamento,
        config,
      });

      setIdSessao(res.sessionId);
      setResumo(res.summary);

      const [resResumo, resDiv] = await Promise.all([
        api.obterResumo(res.sessionId),
        api.obterDivergencias(res.sessionId),
      ]);

      setResumo(resResumo.summary);
      setAnomalias(resResumo.anomalies || []);
      setDivergencias(resDiv.divergences);
      setEtapa('results');
    } catch (err: any) {
      alert(`Erro na reconciliação: ${extrairMensagemErro(err, 'Falha ao executar a reconciliação')}`);
      setEtapa('config');
    } finally {
      setCarregando(false);
    }
  };

  const aoAnalisarIA = async (idDivergencia: string) => {
    if (!idSessao) return;

    setErroAcaoIA(null);

    try {
      const res = await api.analisarDivergencia(idSessao, idDivergencia);

      if (!res.analysis) return;

      setDivergencias((prev) =>
        prev.map((item) =>
          item.id === idDivergencia
            ? { ...item, aiAnalyzed: true, aiAnalysis: res.analysis }
            : item
        )
      );

      if (itemSelecionado?.id === idDivergencia) {
        setItemSelecionado((prev) =>
          prev ? { ...prev, aiAnalyzed: true, aiAnalysis: res.analysis } : null
        );
      }
    } catch (err: any) {
      setErroAcaoIA(
        extrairMensagemErro(err, 'Não foi possível concluir a análise por IA.')
      );
    }
  };

  const aoAnalisarLoteIA = async () => {
    if (!idSessao) return;

    setErroAcaoIA(null);

    try {
      const res = await api.analisarLote(idSessao);
      if (res.batchAnalysis) setAnaliseLote(res.batchAnalysis);
    } catch (err: any) {
      setErroAcaoIA(
        extrairMensagemErro(err, 'Não foi possível concluir a análise agregada por IA.')
      );
    }
  };

  const aoReiniciar = () => {
    setEtapa('import');
    setDadosFonteA(null);
    setDadosFonteB(null);
    setMapeamento(undefined);
    setConfigCorrespondencia(undefined);
    setIdSessao(null);
    setResumo(null);
    setDivergencias([]);
    setAnomalias([]);
    setAnaliseLote(undefined);
    setItemSelecionado(null);
    setFiltroStatus('');
    setFiltroIA('');
    setTermoBusca('');
  };

  const podeNavegar = (alvo: Etapa) => {
    if (alvo === 'import') return true;
    if (alvo === 'mapping') return !!dadosFonteA && !!dadosFonteB;
    if (alvo === 'config') return !!dadosFonteA && !!dadosFonteB && !!mapeamento;
    if (['results', 'export', 'reconciling'].includes(alvo)) return !!resumo;
    return false;
  };

  const divergenciasFiltradas = divergencias.filter((d) => {
    if (filtroStatus && d.status !== filtroStatus) return false;
    if (filtroIA === 'analyzed' && !d.aiAnalyzed) return false;
    if (filtroIA === 'not_analyzed' && d.aiAnalyzed) return false;

    if (termoBusca) {
      const termo = termoBusca.toLowerCase();
      return (
        d.identifier.toLowerCase().includes(termo) ||
        (!!d.recordA && JSON.stringify(d.recordA).toLowerCase().includes(termo)) ||
        (!!d.recordB && JSON.stringify(d.recordB).toLowerCase().includes(termo))
      );
    }

    return true;
  });

  const limparFiltros = () => {
    setFiltroStatus('');
    setFiltroIA('');
    setTermoBusca('');
  };

  const rotuloIdentificador = resumo?.identifierLabel || 'Documento';

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans antialiased selection:bg-cyan-500 selection:text-white">
      <Header onReset={aoReiniciar} />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <StepProgress
          currentStep={etapa}
          etapaAtual={etapa}
          onStepClick={setEtapa}
          canNavigate={podeNavegar}
        />

        {iaConfigurada === false && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-800/50 bg-amber-950/40 px-4 py-3 text-amber-200">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-400" />
            <div className="text-sm">
              <p className="font-semibold">A análise por IA está desativada.</p>
              <p className="text-amber-300/90">
                Nenhuma chave de API (Gemini ou OpenAI) foi configurada no backend.
                A comparação dos relatórios e a detecção de divergências continuam
                funcionando normalmente, mas as causas prováveis e sugestões de solução
                não poderão ser geradas até que uma chave seja adicionada ao arquivo{' '}
                <code className="px-1 rounded bg-amber-900/50">backend/.env</code>.
              </p>
            </div>
          </div>
        )}

        {erroAcaoIA && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-red-200">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-400" />
            <div className="text-sm flex-1">
              <p className="font-semibold">Não foi possível concluir a análise por IA.</p>
              <p className="text-red-300/90">{erroAcaoIA}</p>
            </div>
            <button
              onClick={() => setErroAcaoIA(null)}
              className="text-red-300/70 hover:text-red-200 text-xs font-semibold"
            >
              Fechar
            </button>
          </div>
        )}

        {etapa === 'import' && (
          <FileUploader
            onFilesSelected={aoSelecionarArquivos}
            isLoading={carregando}
            sourceAData={dadosFonteA}
            sourceBData={dadosFonteB}
            onProceedToMapping={() => setEtapa('mapping')}
          />
        )}

        {etapa === 'mapping' && dadosFonteA && dadosFonteB && (
          <ColumnMapper
            sourceA={dadosFonteA}
            sourceB={dadosFonteB}
            initialMapping={mapeamento}
            onConfirmMapping={aoConfirmarMapeamento}
            onBack={() => setEtapa('import')}
          />
        )}

        {etapa === 'config' && dadosFonteA && dadosFonteB && mapeamento && (
          <MatchingConfigView
            sourceA={dadosFonteA}
            sourceB={dadosFonteB}
            mapping={mapeamento}
            onRunReconciliation={aoExecutarConciliacao}
            onBack={() => setEtapa('mapping')}
          />
        )}

        {etapa === 'reconciling' && (
          <div className="py-20 text-center space-y-4">
            <LoadingOverlay
              message="Executando Motor Determinístico..."
              subMessage="Normalizando datas, valores e documentos"
            />
          </div>
        )}

        {etapa === 'results' && resumo && (
          <div className="space-y-6">
            <SummaryCards summary={resumo} />

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAbaAtiva('divergences')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    abaAtiva === 'divergences'
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  <span>Tabela de Divergências ({divergencias.length})</span>
                </button>

                <button
                  onClick={() => setAbaAtiva('patterns')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    abaAtiva === 'patterns'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Análise Agregada de Padrões & IA</span>
                </button>
              </div>

              <button
                onClick={() => setEtapa('export')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Exportar Relatório</span>
              </button>
            </div>

            {abaAtiva === 'divergences' && (
              <div className="space-y-4">
                <FiltersBar
                  statusFilter={filtroStatus}
                  setStatusFilter={setFiltroStatus}
                  aiFilter={filtroIA}
                  setAiFilter={setFiltroIA}
                  searchQuery={termoBusca}
                  setSearchQuery={setTermoBusca}
                  onResetFilters={limparFiltros}
                  totalFiltered={divergenciasFiltradas.length}
                />

                <DivergenceTable
                  divergences={divergenciasFiltradas}
                  identifierLabel={rotuloIdentificador}
                  onSelectDivergence={setItemSelecionado}
                />
              </div>
            )}

            {abaAtiva === 'patterns' && (
              <BatchPatternAnalysis
                batchAnalysis={analiseLote}
                anomalies={anomalias}
                onTriggerBatchAI={aoAnalisarLoteIA}
              />
            )}
          </div>
        )}

        {etapa === 'export' && resumo && (
          <ExportReportView
            summary={resumo}
            divergences={divergencias}
            batchAnalysis={analiseLote}
          />
        )}
      </main>

      {itemSelecionado && (
        <DivergenceDetailModal
          item={itemSelecionado}
          identifierLabel={rotuloIdentificador}
          onClose={() => setItemSelecionado(null)}
          onAnalyzeAI={aoAnalisarIA}
        />
      )}

      {carregando && etapa !== 'reconciling' && (
        <LoadingOverlay
          message="Processando solicitação..."
          subMessage={mensagemCarregamento}
        />
      )}

      <Footer />
    </div>
  );
};