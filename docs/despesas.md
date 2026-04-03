# 💰 Despesas

**Arquivos:** `app/routes/despesas.tsx` · `app/routes/despesas.nova.tsx` · `app/components/despesas/DespesaForm.tsx`

---

## Listagem de Despesas

**Rota:** `/despesas` · **Acesso:** Autenticado

### Funcionalidades

#### Cards de Resumo
- **Total no período:** Valor total + quantidade de despesas
- **Por tipo:** Cards individuais para Combustível, Alimentação, Hospedagem, Manutenção
  - Cada card só aparece se houver despesas daquele tipo no período
  - Cores e ícones distintos por tipo

#### Filtros
| Filtro | Opções |
|---|---|
| **Período rápido** | Hoje, 7 dias, 30 dias, Ano, Tudo |
| **Data personalizada** | Data início + Data fim |
| **Tipo** | Botões toggle por tipo (cumulativo) |

- Botão "Limpar" aparece quando há filtros de tipo ativos
- Label do período se adapta ao filtro ativo

#### Lista de Despesas
- Cards com: tipo (badge colorido com ícone), valor, usuário, data, data de registro
- Ícone de imagem se houver comprovante anexado
- Clique no card abre modal de detalhes

#### Modal de Detalhes
- Tipo com badge e ícone
- Valor em destaque
- Data + Registrado por
- Imagem do comprovante (se houver), clicável para ampliar
- Data de registro

#### Visualização de Comprovante
- Modal fullscreen com backdrop blur
- Botão de fechar no canto
- Imagem com max-height de 80vh

#### Exclusão
- Sistema de **triple click** (Apagar → Tem certeza? → Confirmar!)
- Soft delete (campo `deletedAt`)

### Regras de Acesso
| Role | Visualização |
|---|---|
| Vendedor | Apenas suas próprias despesas |
| Admin / Super Admin | Todas as despesas |

---

## Nova Despesa

**Rota:** `/despesas/nova` · **Acesso:** Autenticado

### Funcionalidades

#### Seleção de Tipo
- **Tipos dinâmicos:** Carregados do Firebase (`despesas-tipos`)
- **Tipos pré-definidos com ícones:** Combustível, Alimentação, Hospedagem, Manutenção
- **Tipo "Outro":** Campo de texto livre para despesas que não se encaixam
- **Adicionar novo tipo:**
  - Botão "+" abre formulário inline
  - Seletor de ícone (14 ícones disponíveis: Fuel, UtensilsCrossed, BedDouble, Wrench, Zap, Droplets, Wifi, Truck, Home, ShoppingCart, Heart, Briefcase, Star, Tag)
  - Salva no Firebase para uso futuro

#### Gerenciamento de Tipos (context menu)
- **Clique direito** em um tipo existente abre menu com:
  - Editar: renomear o tipo inline
  - Excluir: remove o tipo do Firebase

#### Campos
- **Valor (R$):** Campo numérico obrigatório
- **Data:** Campo de data, padrão: data atual
- **Comprovante:** Upload de imagem opcional via Cloudinary
  - Preview da imagem com botão para remover
  - Salvo na pasta `despesas` no Cloudinary

### Regras
- Tipo é obrigatório (botão submit desabilitado sem tipo)
- Data é salva com horário fixo 12:00 para evitar problemas de timezone
- `usuarioId` e `usuarioNome` são preenchidos automaticamente do usuário logado
- Após cadastro, redireciona para `/despesas`
