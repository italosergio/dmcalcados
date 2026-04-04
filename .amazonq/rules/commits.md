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
