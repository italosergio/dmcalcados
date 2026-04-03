# 🧭 Layout e Navegação

**Arquivos:** `app/components/layout/Layout.tsx` · `app/components/layout/Sidebar.tsx` · `app/components/layout/Header.tsx` · `app/components/layout/HeaderTicker.tsx`

---

## Layout Principal

Todas as páginas autenticadas usam o layout com Sidebar + Header + Conteúdo.

### Estrutura
```
┌──────────────────────────────────────────┐
│ [Sidebar]  │  [Header + Ticker]          │
│            │  ┌────────────────────────┐  │
│  Vendas    │  │                        │  │
│  Despesas  │  │     Conteúdo           │  │
│  Estoque   │  │     (Outlet)           │  │
│  Dashboard │  │                        │  │
│  ...       │  └────────────────────────┘  │
│            │                              │
│  [Conta]   │                              │
│  [Sair]    │                              │
└──────────────────────────────────────────┘
```

### Background
- Imagem de fundo (`home-background.png`) com overlay escuro (85% opacidade)
- Aplicado no container principal

### SSR
- Não renderiza loading/redirect no servidor (`isServer` check)
- Redireciona para `/login` se não autenticado (client-side only)

---

## Sidebar

### Desktop (lg+)
- Fixa à esquerda, sempre visível
- Largura: 264px (w-64)
- Borda direita sutil

### Mobile (< lg)
- Drawer da **direita** (slide-in)
- Overlay escuro (60% opacidade) ao abrir
- Fecha ao clicar no overlay ou ao mudar de rota
- Previne scroll do body quando aberta

### Links de Navegação
| Ordem | Link | Ícone | Acesso |
|---|---|---|---|
| 1 | Vendas | ShoppingBag | Todos |
| 2 | Despesas | DollarSign | Todos |
| 3 | Estoque | Warehouse | Admin / Super Admin (badge "ADMIN") |
| 4 | Dashboard | LayoutDashboard | Todos |
| 5 | Meus Clientes | Users | Vendedor |
| 6 | Clientes | Users | Admin / Super Admin (badge "ADMIN") |
| 7 | Usuários | UserCog | Admin / Super Admin (badge "ADMIN") |
| 8 | Histórico | History | Admin / Super Admin (badge "ADMIN") |

### Seção Inferior
- **Toggle "Loop de estatísticas":** Switch para ativar/desativar o HeaderTicker
- **Minha Conta:** Link para `/conta`
- **Sair:** Logout com redirect via `window.location.href = '/'`

### Indicador de Rota Ativa
- Link ativo: fundo azul translúcido + texto azul
- Link inativo: texto cinza + hover com fundo sutil

---

## Header

### Desktop
- Exibe HeaderTicker (se ativado) ocupando o espaço central
- Nome do usuário no canto direito

### Mobile
- Logo + "DM Calçados" + "Painel administrativo" à esquerda
- Botão hamburger à direita (abre sidebar)
- HeaderTicker abaixo do header (se ativado), com borda superior sutil

---

## HeaderTicker

Componente de ticker rotativo com estatísticas em tempo real.

### Estatísticas Exibidas

**Admin / Super Admin:**
1. **Top vendedor:** Nome + valor vendido no mês
2. **Vendas hoje:** Valor + quantidade
3. **Vendas mês:** Valor + quantidade
4. **Vendas ano:** Valor + quantidade
5. **Despesas:** Total geral
6. **Estoque:** Valor total em estoque
7. **Clientes:** Total de clientes ativos
8. **Novos no mês:** Clientes cadastrados no mês

**Vendedor:**
1. **Vendas hoje:** Suas vendas do dia (valor + quantidade)
2. **Vendas mês:** Suas vendas do mês (valor + quantidade)
3. **Vendas ano:** Suas vendas do ano (valor + quantidade)
4. **Ranking mês:** Sua posição entre os vendedores (ex: "2º de 5")
5. **Meus clientes:** Total de clientes únicos que já vendeu
6. **Clientes novos:** Clientes que compraram pela primeira vez no mês
7. **Despesas hoje:** Suas despesas do dia
8. **Despesas mês:** Suas despesas do mês
9. **Despesas ano:** Suas despesas do ano

### Comportamento
- Animação de slide vertical (fade in/out)
- Dados carregados do Firebase ao montar
- Vendedor vê apenas suas próprias estatísticas (vendas, despesas, clientes, ranking)
- Admin/Super Admin vê estatísticas globais
- Pode ser desativado via toggle na Sidebar
