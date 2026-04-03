# 📊 Dashboard

**Rota:** `/dashboard` · **Acesso:** Autenticado · **Arquivo:** `app/routes/dashboard.tsx`

---

## Visão Geral

Painel analítico com gráficos e métricas de vendas e despesas. Dados filtráveis por período.

## Funcionalidades

### Filtro de Período
| Opção | Intervalo |
|---|---|
| Hoje | Desde 00:00 do dia atual |
| 7 dias | Últimos 7 dias |
| 30 dias | Últimos 30 dias (padrão) |
| Ano | Desde 01/01 do ano atual |
| Tudo | Sem filtro de data |

### Cards de Resumo
| Card | Descrição | Cor |
|---|---|---|
| **Vendas** | Total + quantidade + ticket médio | Verde |
| **Despesas** | Total + quantidade | Vermelho |
| **Saldo** | Vendas - Despesas + margem percentual | Azul (lucro) / Laranja (prejuízo) |

- Card de Vendas é clicável → navega para `/vendas`
- Card de Despesas é clicável → navega para `/despesas`

### Gráficos

Layout em 2 colunas no desktop:

#### Coluna Esquerda (Vendas)
1. **Vendas no Período** — Gráfico de área (verde) com evolução diária ou mensal
2. **Por Vendedor** — Gráfico de barras horizontais (verde) — apenas Admin
3. **Top Clientes** — Gráfico de barras horizontais (amarelo) — top 10

#### Coluna Direita (Despesas)
1. **Despesas no Período** — Gráfico de área (vermelho) com evolução diária ou mensal
2. **Por Usuário** — Gráfico de barras horizontais (vermelho) — apenas Admin
3. **Por Tipo** — Gráfico de barras horizontais (vermelho)

### Comportamento dos Gráficos
- Períodos "Hoje", "7 dias", "30 dias" → eixo X por dia (dd/mm)
- Períodos "Ano", "Tudo" → eixo X por mês (Jan, Fev, ...)
- Labels do eixo X com step automático para evitar sobreposição
- Tooltip com `formatCurrency` para valores monetários
- Data labels nos gráficos de barra

## Regras de Acesso
| Role | Dados Visíveis |
|---|---|
| Vendedor | Apenas suas próprias vendas e despesas |
| Admin / Super Admin | Todas as vendas e despesas + gráficos "Por Vendedor" e "Por Usuário" |

## Tema dos Gráficos
- Background: `#232328`
- Texto: `#f0f0f2`
- Grid: `#2e2e36`
- Cores: verde `#10b981`, vermelho `#ef4444`, amarelo `#f59e0b`, azul `#3b82f6`
- Credits desabilitados
