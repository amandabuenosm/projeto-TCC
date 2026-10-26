"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessaoArmazenamento = exports.SessaoArmazenamento = void 0;
class SessaoArmazenamento {
    sessoes = new Map();
    salvarSessao(sessao) {
        this.sessoes.set(sessao.id, sessao);
    }
    obterSessao(id) {
        return this.sessoes.get(id);
    }
    excluirSessao(id) {
        return this.sessoes.delete(id);
    }
    listarSessoes() {
        return [...this.sessoes.values()];
    }
    // Aliases para compatibilidade
    saveSession(session) {
        this.salvarSessao(session);
    }
    getSession(id) {
        return this.obterSessao(id);
    }
    deleteSession(id) {
        return this.excluirSessao(id);
    }
    listSessions() {
        return this.listarSessoes();
    }
}
exports.SessaoArmazenamento = SessaoArmazenamento;
exports.sessaoArmazenamento = new SessaoArmazenamento();
