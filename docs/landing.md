# 🏠 Landing Page

**Rota:** `/` · **Acesso:** Público · **Arquivo:** `app/routes/landing.tsx`

---

## Visão Geral

Página inicial pública da DM Calçados. Apresenta a marca, parceiros e um CTA para contato via WhatsApp.

## Funcionalidades

### Apresentação da Marca
- Logo centralizada com nome "Distribuidora Maranhense de Calçados"
- Título hero: "Sandálias que vendem fácil no seu comércio"
- Subtítulo com proposta de valor
- Botão CTA dourado com efeito shine → abre WhatsApp

### Seção de Parceiros
- Logos das marcas: Rios, Guaranhãs, Jangada
- Efeito hover com scale nas logos

### Menu do Usuário Logado
- Se o usuário já está autenticado, exibe menu dropdown no canto superior direito
- Opções: Vendas, Nova Venda, Conta, Sair
- Dropdown fecha ao clicar fora

### Acesso Oculto ao Login
O login não é visível publicamente. Existem 3 formas de acessar:

| Método | Descrição |
|---|---|
| **Triple click na logo** | Clicar 3x na logo em menos de 800ms redireciona para `/login` |
| **Konami Code (desktop)** | Sequência ↑↑↓↓ no teclado em menos de 2s |
| **Swipe (mobile)** | Sequência swipe ↑↑↓↓ na tela em menos de 2s |

> Se o usuário já está logado, clicar na logo redireciona direto para `/vendas`.

## Regras
- Página totalmente pública, não requer autenticação
- Background image com overlay escuro (60% opacidade)
- CNPJ exibido no footer
- Meta tags de SEO configuradas (title + description)
