# 🚀 Roadmap SaaS — Depósito / Gestão de Bar

Documento vivo. Registra a estratégia para evoluir o sistema de um **app desktop
local** para um **SaaS híbrido (desktop offline-first + sincronização na nuvem)**.

> Direção escolhida: **Desktop offline-first + sync na nuvem**, com acesso web
> complementar. O caixa nunca pode parar por falta de internet — a nuvem é
> espelho e ponto de acesso remoto, não dependência operacional.

---

## 1. Reposicionamento do produto

O sistema deixou de ser "um app de depósito de bebidas" para ser uma **plataforma
de gestão para o varejo de bebidas e hospitalidade** (depósitos, bares,
conveniências, adegas, lanchonetes).

Mudança âncora já aplicada (Fase 1): o módulo **"Copões" virou "Receitas / Fichas
Técnicas"** — o mesmo motor de custo proporcional por insumo agora atende copões,
drinks, doses, combos e porções. Isso multiplica o mercado endereçável sem
reescrever a lógica.

---

## 2. Fases

| Fase | Objetivo | Status |
|------|----------|--------|
| **0** | Desktop local, 1 estabelecimento | ✅ base |
| **1** | Preparar: generalizar módulos, polir UX/visual, lógica pura e sync-ready | ✅ **concluída** |
| **2** | Extrair API: serviços → HTTP, Postgres, camada de sync | ⬜ |
| **3** | SaaS: auth, organizações (tenants), billing, app web | ⬜ |

### Fase 1 — concluída
- [x] `Copões` → `Receitas` com tipos (copão, drink, dose, combo, porção, outro)
- [x] Filtro por tipo, busca e duplicação de receita
- [x] Campo `recipe_type`, `description` e `updated_at` (marca d'água p/ sync)
- [x] Branding: logotipo com gradiente, navegação agrupada, status de dados
- [x] Paleta refinada (tema escuro mais profundo, tokens de marca)
- [x] Componentes reutilizáveis: `EmptyState`, `StatCard`
- [x] Dashboard com saudação e cards de métrica padronizados

### Fase 2 — Extrair a API (quando houver tração)
A arquitetura atual já ajuda: `src/main/services/*` são regras de negócio puras,
e o **IPC tipado (`src/main/ipc.ts`) é a fronteira** que vira HTTP.

- [ ] Transformar cada `*Routes` num controller HTTP (Fastify/Hono).
- [ ] Trocar `better-sqlite3` por **Postgres** no servidor; manter SQLite no desktop.
- [ ] Driver de dados por ambiente (Drizzle já abstrai os dois dialetos).
- [ ] **Camada de sincronização** (ver §3).

### Fase 3 — SaaS multi-tenant
- [ ] Autenticação (e-mail/senha + OAuth) e sessões.
- [ ] **Organização (tenant)**: toda tabela ganha `org_id`; isolamento por linha (RLS no Postgres).
- [ ] Papéis: dono, gerente, caixa, garçom.
- [ ] Billing (Stripe): planos, trial, limites por plano.
- [ ] App web (reusar o renderer React — ele já é web puro sobre a `api`).

---

## 3. Arquitetura de sincronização (offline-first)

Modelo alvo: **o desktop é a fonte de verdade local; a nuvem reconcilia**.

Pré-requisitos no schema (introduzir gradualmente em todas as tabelas):
1. ✅ **`updated_at`** por linha — aplicado em `clients`, `tables`, `products`,
   `table_items`, `expenses` e `copa_recipes`. Os ledgers append-only (`payments`,
   `credit_transactions`, `stock_movements`) usam `created_at` como marca.
   > `updated_at` é **nullable sem default** (SQLite não aceita default de
   > expressão em `ADD COLUMN`). O app grava `nowSql` (`lib/time.ts`) ao alterar;
   > `null` = nunca modificado. Watermark de sync = `coalesce(updated_at, created_at)`.
2. ✅ **Soft-delete** (`active` boolean) em vez de DELETE físico — padronizado em
   `clients`, `expenses`, `products` e `copa_recipes`. Listagens/buscas filtram
   `active = true`; `get` por id não filtra (preserva histórico).
3. ✅ **IDs estáveis entre dispositivos**: cada tabela sincronizável ganhou uma
   coluna **`uuid`** (identidade global) *ao lado* da PK `integer` — padrão
   aditivo. NÃO trocamos a PK (evita reconstruir tabelas/FKs e reescrever o app).
   O `uuid` é gerado por trigger (uuid v4 em SQL puro) e as linhas existentes
   foram backfilladas. Migrations `0004` (colunas + `sync_outbox`) e `0005` (triggers).
4. ✅ **Fila de mudanças** (`sync_outbox`): triggers `AFTER INSERT/UPDATE/DELETE`
   registram cada escrita (`upsert`/`delete`) com o `uuid` da linha — captura
   garantida pelo banco, sem tocar nos serviços. `SyncService.pendingCount()`
   expõe a fila; a sidebar mostra "N p/ sincronizar". Deletes lógicos (`active=0`)
   viram `upsert`; o motor de push/pull para a nuvem é a Fase 2.

Fluxo de sync (last-write-wins por `updated_at`, com fila de conflito para dinheiro):
```
escrita local → grava SQLite + outbox → (online) push p/ API → pull deltas desde
últdima marca → aplica no SQLite → resolve conflitos (valores monetários nunca
são sobrescritos silenciosamente: geram pendência de revisão).
```

> Regra de ouro: operações financeiras (pagamentos, crediário) **não** fazem
> last-write-wins cego — conflito vira item de auditoria.

---

## 4. Decisões de design (visual)

- **Tema escuro como padrão** (ambiente de balcão, baixa luz, menos fadiga).
- **Primária verde** = dinheiro/confirmar; **âmbar** = atenção/crediário;
  **vermelho** = destrutivo. Gradiente de marca verde→esmeralda no logotipo.
- **Números sempre `tabular-nums`** e nunca < 16px (requisito de leitura rápida no caixa).
- Densidade média, cards com elevação sutil, estados vazios sempre com ação.

---

## 5. Próximos passos sugeridos (curto prazo, ainda no desktop)
- [x] Padronizar `updated_at` + soft-delete nas tabelas de entidade (feito — ver §3).
- [x] `uuid` de sincronização + `sync_outbox` por triggers (feito — ver §3).
- [x] **Identidade visual por loja** (nome, slogan, cor da marca) em Configurações,
      aplicada ao vivo e cacheada p/ boot sem flash (`config/brandColors.ts`).
- [ ] **Motor de sync (Fase 2)**: consumir `sync_outbox` (push), aplicar deltas
      da nuvem (pull), resolver conflito financeiro como auditoria (ver §3 regra de ouro).
- [ ] Índice único em `uuid` por tabela (ao ligar o sync, para lookups rápidos).
- [ ] Backup/export do `deposito.db` para arquivo (ponte manual até o sync real).
- [ ] Relatório de receitas mais vendidas (aproveita o novo módulo).
