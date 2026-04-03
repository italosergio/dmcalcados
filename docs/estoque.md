# 📦 Estoque (Produtos)

**Arquivos:** `app/routes/estoque.tsx` · `app/routes/produtos.novo.tsx` · `app/routes/produtos.editar.tsx` · `app/components/produtos/ProdutoForm.tsx` · `app/components/produtos/ProdutoCard.tsx`

---

## Listagem de Produtos

**Rota:** `/produtos` · **Acesso:** Admin / Super Admin

### Funcionalidades

#### Cards de Resumo
- **Valor em estoque:** Soma de (valor × estoque) de todos os produtos
- **Pacotes:** Total de pares ÷ 15 (+ pares avulsos)
- **Total de pares:** Soma do estoque de todos os produtos

#### Modos de Visualização
- **Cards:** ProdutoCard com foto, modelo, referência, valor, estoque
- **Tabela:** Colunas: Foto, Modelo, Referência, Valor, Estoque, Total, Atualizado
- Preferência salva no `localStorage` (`produtos-view`)

#### Busca
- Busca por modelo ou referência em tempo real

#### Painel Lateral (Saída / Entrada)
Layout em 2 colunas no desktop:
- **Coluna esquerda:** Lista de produtos (cards ou tabela)
- **Coluna direita:** Painel de análise

O painel tem dois modos:
| Modo | Descrição |
|---|---|
| **Saída** | Produtos vendidos no período (quantidade + valor) |
| **Entrada** | Produtos recebidos no período (quantidade + valor) |

- Filtro de período: 7 dias, 30 dias, 90 dias, 12 meses
- Total no rodapé do painel

#### Gráfico de Evolução
- Gráfico de linhas (Highcharts) mostrando saída ou entrada por modelo ao longo do tempo
- Filtro de modelos: botões para ativar/desativar modelos no gráfico (máximo 8)
- Cores distintas por modelo

#### Migração de Entradas
- Se existem produtos com estoque > 0 mas sem registro de entrada, exibe botão "Importar X produto(s) antigo(s)"
- Cria registros de entrada retroativos para produtos existentes

#### Modal de Detalhes
Ao clicar em um produto:
- Foto em destaque (ou placeholder)
- Valor, Referência, Estoque (unidades + pacotes)
- Valor total em estoque
- Vendido no período (quantidade + valor)
- Entrada no período (quantidade + valor)
- Datas de cadastro e atualização
- Botões: Editar → `/produtos/:id/editar` | Excluir (remove permanentemente)

### Regras
- Zoom de 80% aplicado na página (`style={{ zoom: 0.8 }}`)
- Exclusão de produto é permanente (não é soft delete)
- Apenas admin e superadmin têm acesso às páginas de estoque
- Vendedores são redirecionados para `/vendas` ao tentar acessar qualquer rota de produtos

---

## Novo Produto

**Rota:** `/produtos/novo` · **Acesso:** Admin / Super Admin

### Funcionalidades
- **Modelo:** Nome do modelo (obrigatório, verificação de duplicata em tempo real)
- **Referência:** Código de referência (obrigatório, verificação de duplicata em tempo real)
- **Valor sugerido:** Preço de venda sugerido
- **Estoque:** Entrada em pacotes (×15) ou unidades, com cálculo automático do resto
- **Foto:** Upload via Cloudinary com preview, botão para remover

### Validações
- Modelo não pode ser duplicado (comparação case-insensitive)
- Referência não pode ser duplicada (comparação case-insensitive)
- Indicadores visuais: ✓ "Disponível" (verde) ou ✗ "Já cadastrado" (vermelho)
- Botão de submit desabilitado se houver duplicata

### Regras
- Ao cadastrar com estoque > 0, cria automaticamente um registro de entrada
- Upload de foto é opcional

---

## Editar Produto

**Rota:** `/produtos/:id/editar` · **Acesso:** Admin / Super Admin

### Funcionalidades
- Mesmo formulário do cadastro, pré-preenchido com dados do produto
- Se o estoque aumentar, cria automaticamente um registro de entrada com a diferença

### Regras
- Verificação de duplicata exclui o próprio produto da comparação
- Redireciona para `/produtos` se o ID não for encontrado
