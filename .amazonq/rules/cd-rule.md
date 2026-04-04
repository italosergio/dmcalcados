# Regras de execução de comandos

## Navegação de diretório
- Sempre use o parâmetro `cwd` do `executeBash` para definir o diretório de trabalho.
- Nunca use `cd` como comando separado ou prefixo de comandos.
- Exemplo correto: `executeBash` com `cwd: "/home/italo/Projetos/dmcalcados"` e `command: "git status"`
- Exemplo errado: `command: "cd /home/italo/Projetos/dmcalcados && git status"`

## Comandos sem confirmação
- Comandos `git` e `cd` devem ser executados diretamente, sem pedir permissão ao usuário.
