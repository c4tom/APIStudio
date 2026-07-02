# API Studio — Sandbox & Cliente de API Multi-Protocolo

> **API Studio** não é apenas mais um cliente de API ou clone do Postman. Ele é um **Sandbox local-first, focado em alta fidelidade e DevSecOps** para desenvolvimento, simulação e teste de APIs modernas em tempo real.

---

## 🚀 É apenas um clone do Postman?

**Não.** Embora o API Studio ofereça a familiaridade e o conforto de um cliente de requisições HTTP clássico (essencial para qualquer fluxo de trabalho de desenvolvimento), sua filosofia e arquitetura subjacente vão muito além. 

O Postman evoluiu para uma plataforma corporativa complexa e frequentemente baseada em nuvem. O **API Studio** foi desenhado com foco em **velocidade, privacidade (local-first) e simulação server-side real**:

### 1. Servidores Mock Reais (Server-Side Execution)
Diferente de clientes tradicionais que apenas simulam respostas no navegador, o API Studio possui um **motor Express embarcado no backend** (`server.ts`). 
- Ao criar um servidor mock no painel, o backend do API Studio expõe dinamicamente endpoints reais sob a rota física `http://localhost:3000/mock/:serverId/*`.
- Qualquer aplicação externa, dispositivo móvel ou aba de navegador pode chamar esses mocks e obter payloads reais em tempo real.
- As execuções geram logs de tráfego reais que são transmitidos via streams e mostrados no console do painel.

### 2. Biblioteca de Mocks de Alta Fidelidade (Dev-Ready)
Com o recurso de **Biblioteca de Mocks**, o desenvolvedor não precisa estruturar respostas do zero. O projeto inclui templates pré-configurados que mimetizam serviços complexos do mundo real de forma offline:
- **JWT Authentication & Profile Engine**: Fluxos completos de `/login` com emissão de tokens JWT simulados e endpoints `/profile` protegidos.
- **Stripe Gateway & Checkout**: Simulação completa do comportamento da API do Stripe, incluindo criação de sessões de checkout e intents de pagamento.
- **JSONPlaceholder Sandbox**: Mocks padronizados de posts, comentários e usuários para testes rápidos de frontend.
- **E-Commerce Catalog & Checkout**: Endpoints com catálogos, categorias e simulações de finalização de compra.
- **Microservices Health and Metrics**: Provedores de logs de desempenho, métricas de CPU/Memória simuladas e status checkers.

### 3. Modelo Zero-Trust Vault (Segurança e Variáveis)
API Studio foi projetado sob os pilares do **DevSecOps**:
- Possui um painel de **Vault Seguro** dedicado onde chaves de API sensíveis e segredos nunca são persistidos diretamente no código ou expostos de forma insegura no browser.
- Separação estrita de ambientes (Local, Staging, Production) com injeção segura de dados em tempo de execução através do backend.

### 4. Cliente Multi-Protocolo Unificado
Suporte nativo e fluido na mesma interface IDE-style:
- **HTTP/REST**: Envio de headers, query parameters, corpos JSON e validação de tempo de resposta.
- **WebSockets**: Conexões ativas com servidores WS para troca e visualização interativa de mensagens bi-direcionais em tempo real.
- **GraphQL & gRPC**: Estruturas de mapeamento preparadas para integrações modernas.

---

## 🛠️ Arquitetura do Sistema e Qualidade de Código

O projeto segue os mais rigorosos padrões de engenharia de software e práticas arquiteturais:

```
┌────────────────────────────────────────────────────────┐
│                      API Studio UI                     │
│    (SPA React 18 + Vite + Tailwind CSS + Lucide)       │
└───────────────────────────┬────────────────────────────┘
                            │ (Chamadas REST e SSE Logs)
┌───────────────────────────▼────────────────────────────┐
│                    API Studio Backend                  │
│     (Express Engine + Sandbox Router na Porta 3000)     │
└───────────────────────────┬────────────────────────────┘
                            │ (Mocks Dinâmicos)
┌───────────────────────────▼────────────────────────────┐
│         Clientes Externos e Apps de Frontend           │
│       acessando /mock/:serverId/ nas APIs Reais        │
└────────────────────────────────────────────────────────┘
```

### Princípios Aplicados:
* **Princípio da Responsabilidade Única (SOLID)**: Separação rigorosa entre a camada de renderização visual (`src/App.tsx`), definições tipadas estruturais (`src/types.ts`), mocks reutilizáveis (`src/utils/mockTemplates.ts`) e ajudantes de parsing/importações (`src/utils/helpers.ts`).
* **Clean Code & Tipagem Estrita**: Todos os componentes, estados e payloads HTTP/WS são mapeados com interfaces TypeScript explícitas, mitigando falhas e reduzindo a superfície de bugs em produção.
* **DevSecOps Ready**: Isolação de ambientes e chaves privadas por arquivos de ambiente `.env` e sanitização robusta de parâmetros para prevenção de ataques como injeção de rotas ou XSS.

---

## 🚀 Como Iniciar o Desenvolvimento

### Requisitos
- Node.js (v18+)
- npm ou yarn

### Instalação de Dependências
```bash
npm install
```

### Rodar em Desenvolvimento (Vite + Express)
O backend roda na porta **3000** servindo as APIs do Studio, os Mocks e a interface estática do frontend de forma integrada:
```bash
npm run dev
```

### Compilar e Buildar para Produção
O projeto utiliza `esbuild` para empacotar o backend Node de forma ultra-rápida, gerando uma build standalone de alta performance para ambientes Docker/Cloud Run:
```bash
npm run build
```
Inicie o servidor de produção com:
```bash
npm start
```
