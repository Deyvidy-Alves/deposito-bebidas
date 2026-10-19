# 🍻 Depósito — Sistema de Gestão

Sistema desktop para gestão de depósito de bebidas: mesas (comandas), clientes,
crediário, estoque, copões, financeiro e módulo fiscal opcional. 100% local, sem
servidor externo.

![Electron](https://img.shields.io/badge/Electron-2C2E3B?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

## 🧱 Stack

- **Electron** (processo principal + renderer isolado via IPC tipado)
- **React + Vite + TypeScript** (strict) no renderer
- **SQLite** via **better-sqlite3** (banco local)
- **Drizzle ORM** (schema tipado + migrations)
- **Zustand** (estado), **zod** (validação de formulários)
- **shadcn/ui + Tailwind CSS**, **Sonner** (toasts), **lucide-react** (ícones)
- Exportação de relatórios em **CSV** e **PDF** (Chromium nativo do Electron)

## 📦 Módulos

1. **Início** — dashboard com mesas abertas, alertas de estoque baixo e resumo do caixa do dia.
2. **Mesas** — comandas de consumo em grupo, itens por busca, rateio igualitário/manual, baixa automática de estoque.
3. **Clientes** — CRUD, saldo devedor calculado, histórico de mesas e pagamentos.
4. **Abatimento inteligente** — distribui o valor pago pelas mesas devedoras (da menor para a maior) até esgotar o crédito.
5. **Pagamentos & Crediário** — pagamento por participante (dinheiro/PIX/cartão/crediário/misto), "todos no crediário", fechamento parcial.
6. **Receitas (Fichas Técnicas)** — copões, drinks, doses, combos e porções com cálculo de custo proporcional por ML, preço por margem ou valor direto, filtro por tipo e duplicação; baixa dos insumos ao vender.
7. **Estoque** — produtos (un/ml/kg), entradas, ajustes com motivo, histórico de movimentações e alertas de mínimo.
8. **Financeiro** (restrito por senha) — faturamento, CMV, lucro bruto/líquido, despesas, relatórios e exportação.
9. **Fiscal** (opcional, desativado por padrão) — estrutura de emissão de nota via API REST e hook para SAT/MFE.

## ⌨️ Atalhos

- `Ctrl + K` — busca global (clientes, produtos, mesas)
- `F2` — nova mesa · `F3` — buscar

## 💻 Desenvolvimento

Pré-requisitos: **Node.js 18+**.

```bash
npm install          # instala dependências e recompila o better-sqlite3 para o Electron
npm run dev          # inicia o app em modo desenvolvimento
npm run build        # build de produção (main + preload + renderer)
npm run typecheck    # checagem de tipos (node + web)
npm run db:generate  # gera uma nova migration a partir do schema
npm run dist         # empacota o instalador (electron-builder)
```

O banco `deposito.db` é criado automaticamente na primeira execução (na raiz em
desenvolvimento; em `userData` quando empacotado) e as migrations são aplicadas no boot.

## 🗂️ Estrutura

```
src/
  main/              # processo principal (Electron)
    database/        # schema Drizzle, conexão e migrations
    services/        # regras de negócio por domínio
    lib/             # utilitários (dinheiro, etc.)
    ipc.ts           # registro dos handlers IPC
  preload/           # ponte segura (contextBridge)
  shared/            # DTOs compartilhados main/renderer
  renderer/src/      # UI React
    components/ui/   # componentes base (shadcn/ui)
    pages/           # uma pasta por módulo
    stores/          # stores Zustand
    lib/             # api tipada + utilitários
```
