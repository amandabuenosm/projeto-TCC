import { SessaoConciliacao } from '../models/tipos.js';

export class SessaoArmazenamento {
  private sessoes = new Map<string, SessaoConciliacao>();

  salvarSessao(sessao: SessaoConciliacao): void {
    this.sessoes.set(sessao.id, sessao);
  }

  obterSessao(id: string): SessaoConciliacao | undefined {
    return this.sessoes.get(id);
  }

  excluirSessao(id: string): boolean {
    return this.sessoes.delete(id);
  }

  listarSessoes(): SessaoConciliacao[] {
    return [...this.sessoes.values()];
  }

  // Aliases para compatibilidade
  saveSession(session: SessaoConciliacao): void {
    this.salvarSessao(session);
  }

  getSession(id: string): SessaoConciliacao | undefined {
    return this.obterSessao(id);
  }

  deleteSession(id: string): boolean {
    return this.excluirSessao(id);
  }

  listSessions(): SessaoConciliacao[] {
    return this.listarSessoes();
  }
}

export const sessaoArmazenamento = new SessaoArmazenamento();