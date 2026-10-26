import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rotasReconciliacao from './routes/rotasReconciliacao.js';
import { manipularErros } from './middleware/manipuladorErros.js';
import { ServicoAnalisePorIA } from './services/ai/servicoAnalisePorIA.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rota de verificação de integridade da API (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Reconciliação de Relatórios com IA',
    timestamp: new Date().toISOString(),
    aiProvider: ServicoAnalisePorIA.obterConfigProvedor(),
  });
});

app.use('/api', rotasReconciliacao);
app.use(manipularErros);

app.listen(PORT, () => {
  const provedor = ServicoAnalisePorIA.obterConfigProvedor();

  console.log(`🚀 SERVIDOR ONLINE NA PORTA ${PORT}`);

  if (provedor) {
    console.log(`🤖 Análise por IA: ATIVA (${provedor})`);
  } else {
    console.log('⚠️ Análise por IA: DESATIVADA — configure GEMINI_API_KEY no .env');
  }
});

export default app;