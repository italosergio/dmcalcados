# Regras de desfazer modificações

## NUNCA usar `git checkout` ou `git restore` para desfazer
- Quando o usuário pedir para "desfazer", "reverter" ou "remover" modificações, **NUNCA** usar `git checkout --`, `git restore` ou qualquer comando git que reverta o arquivo inteiro ao estado do último commit.
- O arquivo pode conter dezenas de modificações feitas ao longo da conversa. Reverter pelo git apaga TUDO, não apenas a última mudança.

## Como desfazer corretamente
- Desfazer **apenas** as modificações feitas no último comando/pedido do chat.
- Usar `str_replace` para restaurar o trecho original, revertendo apenas o que foi alterado na última interação.
- Se a última interação adicionou código novo, remover apenas esse código.
- Se a última interação alterou código existente, restaurar o trecho ao estado anterior à alteração.

## Exceção
- Só usar `git checkout`/`git restore` se o usuário **explicitamente** pedir para reverter TODAS as modificações do arquivo via git (ex: "reverte o arquivo todo pelo git", "git checkout nesse arquivo").
