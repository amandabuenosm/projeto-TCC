"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const rotasReconciliacao_js_1 = __importDefault(require("./routes/rotasReconciliacao.js"));
const manipuladorErros_js_1 = require("./middleware/manipuladorErros.js");
const servicoAnalisePorIA_js_1 = require("./services/ai/servicoAnalisePorIA.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Rota de verificação de integridade da API (Health Check)
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        service: 'Reconciliação de Relatórios com IA',
        timestamp: new Date().toISOString(),
        aiProvider: servicoAnalisePorIA_js_1.ServicoAnalisePorIA.obterConfigProvedor(),
    });
});
app.use('/api', rotasReconciliacao_js_1.default);
app.use(manipuladorErros_js_1.manipularErros);
app.listen(PORT, () => {
    const provedor = servicoAnalisePorIA_js_1.ServicoAnalisePorIA.obterConfigProvedor();
    console.log(`🚀 SERVIDOR ONLINE NA PORTA ${PORT}`);
    if (provedor) {
        console.log(`🤖 Análise por IA: ATIVA (${provedor})`);
    }
    else {
        console.log('⚠️ Análise por IA: DESATIVADA — configure GEMINI_API_KEY no .env');
    }
});
exports.default = app;
