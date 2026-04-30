# Regras de commit

## cdr — Commit Detalhado por Responsabilidade
Quando o usuário digitar `cdr`:
1. Rodar `git status --short` e `git diff --stat` para ver todos os arquivos alterados
2. Agrupar os arquivos por responsabilidade/feature (ex: fix mobile, feat ciclos, refactor vendas)
3. Para cada grupo, fazer um commit separado com:
   - `git add` apenas dos arquivos do grupo
   - Mensagem no formato conventional commits: `tipo(escopo): descrição curta`
   - Body com bullet points explicando cada mudança relevante
4. Executar todos os commits sequencialmente sem pedir confirmação

Formato da mensagem:
```
tipo(escopo): descrição curta

- Detalhe 1
- Detalhe 2
```

Tipos: feat, fix, refactor, style, docs, chore

## cdg — Commit Detalhado Geral
Quando o usuário digitar `cdg`:
1. Rodar `git status --short` e `git diff --stat` para ver todos os arquivos alterados
2. Fazer um único commit com todos os arquivos:
   - `git add -A`
   - Mensagem no formato conventional commits com descrição geral
   - Body com bullet points listando todas as mudanças relevantes agrupadas por área
3. Executar sem pedir confirmação

## Versionamento — Obrigatório em todo commit

Após cada commit (cdr, cdg ou manual), SEMPRE atualizar a versão:

### Quando incrementar
- **Patch (0.0.X):** fix, refactor, style, docs, chore — qualquer mudança que não adiciona funcionalidade nova
- **Minor (0.X.0):** feat — nova funcionalidade, nova página, novo serviço, novo componente significativo
- **Major (X.0.0):** breaking change, redesign completo, migração de stack

### Regra de granularidade
- Cada commit (ou grupo de commits no cdr) gera UMA nova versão patch ou minor
- Se o cdr gerar 5 commits e todos são feat, incrementar 5 patches dentro do mesmo minor (ex: v0.10.1, v0.10.2, v0.10.3...)
- Se houver um feat significativo (nova página, novo módulo), incrementar o minor (ex: v0.10.0 → v0.11.0)

### Passos obrigatórios
1. Determinar a nova versão baseado no tipo de mudança
2. Atualizar `APP_VERSION` em `app/components/layout/ChangelogModal.tsx`
3. Adicionar nova entrada no array `changelog` no TOPO (mais recente primeiro) com:
   - `version`: a nova versão
   - `items`: array de strings descrevendo cada mudança de forma clara e concisa em português
4. Criar a tag git: `git tag vX.X.X`
5. Se for fazer push, incluir `git push --tags`

### Exemplo
```typescript
// Em ChangelogModal.tsx, no topo do array changelog:
{
  version: 'v0.11.0',
  items: [
    'Nova página de relatórios financeiros',
    'Filtro por período customizado',
    'Exportação em PDF',
  ],
},
```

### Descrição dos items
- Escrever em português, sem prefixo de tipo (não usar "feat:", "fix:" etc)
- Ser específico: "Corrige cálculo de estoque ao vender pacote" em vez de "Fix no estoque"
- Agrupar mudanças relacionadas no mesmo item quando fizer sentido
- Cada item deve ser compreensível para o usuário final
