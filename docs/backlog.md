# 📋 Tarefas Pendentes

Backlog de desenvolvimento com status e prioridade.

---

## 🔲 Não iniciado

### - [ ] 1. Clientes — Toggle tabela/cards + modal de estatísticas
- **Página:** `/clientes` e `/meus-clientes`
- **Escopo:**
  - [ ] Adicionar toggle para alternar entre visualização em tabela e cards quadrados
  - [ ] Modal ao clicar no cliente com estatísticas:
    - [ ] Compras por período
    - [ ] Modelo mais comprado
    - [ ] Tendência de volume
    - [ ] Ticket médio
- **Prioridade:** Alta

### - [ ] 2. Meu Estoque — Ciclos fechados com modal
- **Página:** `/meu-estoque`
- **Escopo:**
  - [ ] Vendedor visualiza cards dos ciclos anteriores (já encerrados)
  - [ ] Modal ao clicar no ciclo com estatísticas:
    - [ ] Produtos vendidos vs devolvidos
    - [ ] Valor total vendido
    - [ ] Comissão / performance
- **Prioridade:** Alta

### - [ ] 3. Mapear novos eventos para o histórico
- **Página:** `/historico`
- **Escopo:**
  - [ ] Identificar todas as ações do sistema que ainda não geram registro no histórico
  - [ ] Mapear e implementar logs para: ciclos de estoque, alterações de cliente, entradas de produto, etc.
- **Prioridade:** Média

### - [ ] 4. Definir responsabilidades do role Financeiro
- **Escopo:**
  - [ ] O role `financeiro` já existe no modelo (`UserRole`) e em `userCanAccessAdmin`, mas não tem permissões específicas definidas
  - [ ] Decidir o que o financeiro pode acessar: despesas, dashboard, vendas (somente leitura?), relatórios
  - [ ] Decidir o que NÃO pode: gerenciar produtos, usuários, estoque
  - [ ] Implementar guards nas rotas e visibilidade na sidebar
  - [ ] Documentar a coluna "Financeiro" na tabela de permissões do README
- **Prioridade:** Média

### - [ ] 5. Admins/superadmins que também são vendedores
- **Sidebar / Layout**
- **Escopo:**
  - [ ] O modelo já suporta `roles[]`, mas a sidebar só mostra "Meu Estoque" e "Meus Clientes" para vendedor puro
  - [ ] Um admin com role `vendedor` também precisa ver esses links
  - [ ] Revisar todas as verificações de role na sidebar e nas rotas protegidas
- **Prioridade:** Média

### - [ ] 6. Definir responsabilidades de Vendedor I / II / III + promoção automática + comissão
- **Escopo:**
  - [ ] Definir o que diferencia cada nível (acesso, limites, funcionalidades)
  - [ ] Definir critérios de promoção automática (volume de vendas, valor total, tempo, combinação)
  - [ ] Definir plano de comissão por nível (percentuais, base de cálculo, frequência de pagamento)
  - [ ] Implementar lógica de promoção automática (check periódico ou por evento de venda)
  - [ ] Implementar cálculo e exibição de comissão no dashboard do vendedor
  - [ ] Documentar na tabela de permissões do README
- **Decisões pendentes (responder antes de implementar):**
  - [ ] Como funciona a venda hoje? Vendedor leva produtos (consignação) e vende por conta, ou vende dentro da loja?
  - [ ] Base de cálculo da comissão: sobre valor total da venda, sobre lucro (venda - custo), ou sobre valor recebido (considerando condição de pagamento)?
  - [ ] Vendas a prazo: comissão é paga quando a venda é registrada ou quando o cliente paga as parcelas?
  - [ ] Já existe algum valor de comissão praticado hoje? Ex: "hoje pago 10% sobre o que o vendedor vende"
  - [ ] Diferença entre vendedor1, vendedor2, vendedor3: esses níveis já representam algo no negócio real (experiência, volume) ou foram criados como placeholder?
  - [ ] Despesas do vendedor: combustível, alimentação etc. são descontadas da comissão ou tratadas separadamente?
- **Prioridade:** A definir (depende de decisão de negócio)

### - [ ] 7. Criar documentação para cada página + sitemap
- **Escopo:**
  - Docs existentes:
    - [x] `docs/landing.md` — `/` Landing Page
    - [x] `docs/autenticacao.md` — `/login`, `/register`, `/conta`
    - [x] `docs/vendas.md` — `/vendas`, `/vendas/nova`
    - [x] `docs/estoque.md` — `/estoque`, `/produtos`, `/produtos/novo`, `/produtos/:id/editar`
    - [x] `docs/clientes.md` — `/clientes`, `/clientes/novo`, `/meus-clientes`
    - [x] `docs/despesas.md` — `/despesas`, `/despesas/nova`
    - [x] `docs/dashboard.md` — `/dashboard`
    - [x] `docs/administracao.md` — `/usuarios`, `/historico`
    - [x] `docs/layout.md` — Sidebar, Header, Layout
  - Docs faltando:
    - [ ] `docs/conta.md` — Separar página de conta/perfil do `autenticacao.md` (tem escopo próprio)
    - [ ] `docs/meu-estoque.md` — `/meu-estoque` (visão do vendedor, ciclos)
    - [ ] `docs/manual.md` — `/manual` (página de manual/tutoriais, tarefa #8)
    - [ ] Revisar `docs/estoque.md` para incluir `/estoque/entrada` como seção
    - [ ] Revisar `docs/clientes.md` para detalhar `/meus-clientes` como seção separada
  - [ ] Criar `docs/sitemap.md` com mapa visual de todas as páginas, agrupadas por:
    - Públicas (landing, login, register)
    - Vendedor (vendas, meus-clientes, meu-estoque, despesas, dashboard, conta, manual)
    - Admin (produtos, estoque, clientes, usuários, histórico + tudo do vendedor)
    - Financeiro (a definir após tarefa #4)
  - [ ] Incluir no sitemap: rota, arquivo, doc correspondente, roles com acesso
- **Prioridade:** Média

### - [ ] 8. Página de Pagamentos — Acompanhamento de vendas a prazo
- **Rota:** `/pagamentos`
- **Escopo:**
  - [ ] Listar todas as vendas a prazo com parcelas e datas de vencimento
  - [ ] Classificar status de cada parcela por proximidade/atraso:
    - 🟢 **Em dia** — vencimento ainda distante
    - 🟡 **Próximo** — vencimento nos próximos X dias
    - 🟠 **Vencido recente** — passou pouco do vencimento
    - 🔴 **Atrasado** — atraso significativo
    - ⚫ **Crítico** — atraso muito grande (definir threshold)
  - [ ] Permitir marcar parcela como paga (registrar data de pagamento)
  - [ ] Filtros: por status, por cliente, por vendedor, por período
  - [ ] Cards resumo: total a receber, vencendo em breve, atrasados, críticos
  - [ ] Acesso: admin/superadmin vê tudo, vendedor vê apenas suas vendas
- **Decisões pendentes:**
  - [ ] Definir thresholds de dias para cada faixa de status (ex: próximo = 7 dias, vencido recente = 1-15 dias, atrasado = 16-60 dias, crítico = 60+ dias)
  - [ ] Notificações/alertas automáticos para parcelas próximas do vencimento?
  - [ ] Histórico de pagamentos recebidos?
- **Prioridade:** Alta

### - [ ] 9. Sistema de Notificações
- **Escopo:**
  - [ ] Criar nó `notificacoes/{userId}` no Realtime Database para armazenar notificações por usuário
  - [ ] Modelo: `{ id, tipo, titulo, mensagem, lida, criadoEm, dados? }`
  - [ ] Service `notificacoes.service.ts` com: `getNotificacoes(userId)`, `marcarComoLida(id)`, `marcarTodasComoLidas(userId)`, `criarNotificacao(userId, data)`
  - [ ] Listener realtime no AuthContext ou Layout para contar não-lidas
  - [ ] Ícone de sino no Header com badge de contagem
  - [ ] Dropdown/painel com lista de notificações ao clicar no sino
  - [ ] Marcar como lida ao clicar na notificação
- **Eventos que geram notificação:**
  - [ ] Admin cria/edita/fecha ciclo do vendedor → notifica vendedor
  - [ ] Admin altera role do usuário → notifica usuário
  - [ ] Admin altera status do usuário (suspenso/inativo) → notifica usuário
  - [ ] Admin exclui venda do vendedor → notifica vendedor
  - [ ] Admin exclui despesa do vendedor → notifica vendedor
- **Eventos futuros (avaliar):**
  - [ ] Parcela próxima do vencimento → notifica vendedor (depende da tarefa #8)
  - [ ] Estoque baixo de produto no ciclo → notifica vendedor
  - [ ] Promoção automática de nível → notifica vendedor (depende da tarefa #6)
- **Prioridade:** Alta

### - [ ] 10. Documentação e manual do sistema + tutoriais guiados
- **Escopo:**
  - [ ] Criar página `/manual` acessível por todos os usuários autenticados
  - [ ] Manual do Vendedor:
    - [ ] Como registrar uma venda
    - [ ] Como gerenciar meus clientes
    - [ ] Como visualizar meu estoque / ciclos
    - [ ] Como registrar despesas
    - [ ] Como usar o dashboard (visão vendedor)
    - [ ] Como editar minha conta / trocar senha
  - [ ] Manual do Administrador:
    - [ ] Como gerenciar produtos e estoque (entradas, edição, exclusão)
    - [ ] Como gerenciar usuários (criar, alterar role, desativar)
    - [ ] Como visualizar todas as vendas e despesas
    - [ ] Como usar o dashboard (visão admin)
    - [ ] Como consultar o histórico de atividades
    - [ ] Como gerenciar clientes (todos)
    - [ ] Como gerenciar tipos de despesa
  - [ ] Manual do Financeiro:
    - [ ] Definir após tarefa #4 (responsabilidades do financeiro)
  - [ ] Tutoriais guiados (step-by-step interativo):
    - [ ] Escolher abordagem: tooltip guiado (tipo onboarding), página com screenshots, ou vídeo/GIF
    - [ ] Tutorial vendedor: primeira venda passo a passo
    - [ ] Tutorial vendedor: cadastrar cliente e vincular venda
    - [ ] Tutorial admin: cadastrar produto e registrar entrada
    - [ ] Tutorial admin: criar usuário e definir permissões
    - [ ] Tutorial financeiro: a definir
  - [ ] Adicionar link do manual na sidebar
  - [ ] Conteúdo adaptável por role (vendedor só vê seções de vendedor, etc.)
- **Prioridade:** Média

---

## 🔍 Aguardando validação / teste

### - [ ] 11. Fix layout mobile dvh
- **Arquivo:** `Layout.tsx`
- **Status:** Código aplicado, não testado em dispositivos reais
- [ ] Testar em iOS Safari e Android Chrome, validar que `dvh` resolve o problema de altura

### - [ ] 12. Estoque admin — ciclos antigos agrupados por vendedor
- **Página:** `/produtos` (visão admin dos ciclos)
- **Status:** Provavelmente já funciona, precisa confirmar
- [ ] Verificar se ciclos encerrados aparecem corretamente agrupados por vendedor na interface admin

### - [ ] 13. Fix venda sem vendedor
- **Status:** Código corrigido, não testado em produção
- [ ] Simular cenário onde `vendedorId` poderia ser nulo e confirmar que o fix previne o erro

---

## ✅ Concluído

_Mover itens para cá conforme forem finalizados._
