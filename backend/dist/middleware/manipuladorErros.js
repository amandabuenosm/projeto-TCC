"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manipularErros = void 0;
// tratamento global de erros do backend e padroniza a resposta enviada ao frontend
const manipularErros = (err, req, res, next) => {
    console.error('ERRO NÃO TRATADO:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Erro interno no servidor de reconciliação.',
    });
};
exports.manipularErros = manipularErros;
