# Protótipo de Reconciliação de Relatórios com Inteligência Artificial

O **ReconciliaIA - Protótipo de Reconciliação de Relatórios com Inteligência Artificial** é uma aplicação full-stack desenvolvida em TypeScript, com o objetivo de automatizar a identificação de divergências entre relatórios contábeis, fiscais e financeiros, por meio de um mecanismo determinístico de comparação de dados integrado à inteligência artificial generativa Gemini, utilizada como recurso complementar para interpretar as diferenças identificadas.

## 🚀 Funcionalidades

- **Importação de arquivos:** permite importar relatórios nos formatos CSV, TXT, XLSX, XLS, PDF e DOCX;
- **Mapeamento de campos:** possibilita associar os campos correspondentes entre os relatórios, com sugestões de mapeamento;
- **Reconciliação automatizada:** compara os registros e identifica informações conciliadas, divergentes, ausentes e duplicadas;
- **Análise individual com IA:** utiliza o Gemini para interpretar divergências específicas, apresentando possíveis causas, padrões identificados e recomendações;
- **Análise consolidada com IA:** gera uma análise geral dos resultados da reconciliação, destacando divergências e possíveis pontos de atenção;
- **Exportação de resultados:** permite exportar os dados da reconciliação em formato CSV.

## 🛠️ Tecnologias

- **Linguagem:** TypeScript;
- **Front-end:** React 18, Vite, Tailwind CSS, Axios e Lucide React;
- **Back-end:** Node.js, Express e Multer;
- **Processamento de arquivos:** csv-parse, xlsx, pdf-parse e mammoth;
- **Inteligência Artificial:** Google Gemini API.

## ▶️ Como executar

**Pré-requisitos:** Node.js e npm instalados, além de uma chave de API do Google Gemini.

1. Clone o repositório:

   ```bash
   git clone https://github.com/amandabuenosm/projeto-TCC
   ```

2. Acesse a pasta do projeto:

   ```bash
   cd projeto-TCC
   ```

3. Instale as dependências do front-end e do back-end, executando `npm install` na pasta raíz do projeto (onde tem os arquivos package.json e package-lock.json).

4. Configure a variável de ambiente da chave de API do Gemini no arquivo `.env` do back-end, conforme o nome definido na aplicação. Deve ser gerada a chave de API no site https://aistudio.google.com/app/apikey.

5. Inicie o servidor back-end e a aplicação front-end, executando o comandno `npm run dev` na pasta raíz do projeto.

## 🎯 Objetivo

Este projeto foi desenvolvido como parte de um Trabalho de Conclusão de Curso (TCC), com a finalidade de investigar e avaliar a aplicação da inteligência artificial generativa como recurso complementar à reconciliação automatizada de relatórios contábeis, fiscais e financeiros.

A proposta consiste em combinar um mecanismo determinístico, responsável pela comparação e identificação das divergências, com o Gemini, utilizado para auxiliar na interpretação dos resultados. Dessa forma, busca-se demonstrar as possibilidades e limitações dessa integração no apoio à análise de informações.
