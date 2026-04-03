# 🎨 DM Calçados — Design System

> Referência de tipologia, cores, componentes e diretrizes visuais.
> Consultar este documento antes de criar ou modificar qualquer componente visual.

---

## 🧭 Diretrizes Gerais

- **Estilo:** Minimalista, sofisticado mas acessível. Não "chique demais", não amador.
- **Tom:** Parceiro de negócio confiável + fornecedor acessível e próximo.
- **Público:** Vendedores e pequenos comerciantes (público simples) + administradores.
- **Tema:** Dark-only (grafite escuro, nunca preto total).
- **Referências:** Sites de distribuidoras/atacadistas modernos — limpo, direto, confiável.

---

## 🔤 Tipografia

### Fonte Principal: **Inter**
- Carregada via Google Fonts (weight 100-900)
- Moderna, legível, profissional sem ser corporativa demais
- Boa leitura em telas pequenas (vendedores no celular)

### Escala Tipográfica
| Uso | Classe Tailwind | Peso |
|---|---|---|
| Hero título (landing) | `text-4xl sm:text-5xl lg:text-6xl` | `font-bold` (700) |
| Subtítulo landing | `text-lg sm:text-xl` | `font-normal` (400) |
| Título de página (app) | `text-xl sm:text-2xl` | `font-semibold` (600) |
| Título de card | `text-base sm:text-lg` | `font-semibold` (600) |
| Corpo de texto | `text-sm sm:text-base` | `font-normal` (400) |
| Labels / captions | `text-xs sm:text-sm` | `font-medium` (500) |
| Botões | `text-sm` | `font-medium` (500) |

### Regras
- Nunca usar `font-black` (900) — pesado demais.
- `font-bold` (700) apenas em títulos hero/destaque.
- Tracking padrão do Inter, sem letter-spacing customizado.

---

## 🎨 Paleta de Cores

### Backgrounds (Grafite — nunca preto total)
| Token | Hex | Tailwind | Uso |
|---|---|---|---|
| `bg-base` | `#1a1a1e` | `bg-[#1a1a1e]` | Fundo principal da aplicação |
| `bg-surface` | `#232328` | `bg-[#232328]` | Cards, sidebar, modais |
| `bg-surface-hover` | `#2c2c33` | `bg-[#2c2c33]` | Hover em cards/itens de lista |
| `bg-elevated` | `#35353d` | `bg-[#35353d]` | Inputs, elementos elevados |

### Bordas
| Token | Hex | Tailwind | Uso |
|---|---|---|---|
| `border-subtle` | `#2e2e36` | `border-[#2e2e36]` | Bordas padrão (cards, dividers) |
| `border-medium` | `#3d3d47` | `border-[#3d3d47]` | Bordas em inputs focados |

### Texto
| Token | Hex | Tailwind | Uso |
|---|---|---|---|
| `content` | `#f0f0f2` | `text-content` | Texto principal |
| `content-secondary` | `#a0a0ab` | `text-content-secondary` | Texto secundário, labels |
| `content-muted` | `#6b6b78` | `text-content-muted` | Texto desabilitado, placeholders |

### Accent Colors (usar com moderação)
| Cor | Hex | Tailwind | Quando usar |
|---|---|---|---|
| Dourado | `#c9a84c` | `text-[#c9a84c]` | Destaques premium, badges, ícones de destaque |
| Dourado hover | `#b8963f` | `bg-[#b8963f]` | Hover em elementos dourados |
| Azul | `#3b82f6` | `text-blue-500` | Links, botões primários de ação no app |
| Azul hover | `#2563eb` | `bg-blue-600` | Hover em botões azuis |
| Verde | `#22c55e` | `text-green-500` | Sucesso, valores positivos, saldo positivo |
| Vermelho | `#ef4444` | `text-red-500` | Erro, exclusão, valores negativos |

### Regras de Accent
- Dourado: apenas na landing page e em badges/destaques especiais.
- Azul: botões de ação principal dentro do app (dashboard, vendas, etc).
- Verde: apenas para feedback de sucesso e valores financeiros positivos.
- Vermelho: apenas para erros, exclusão e valores negativos.
- **Nunca** usar accent colors em backgrounds grandes — apenas em textos, bordas e botões pequenos.

---

## 🧩 Componentes

### Button
```
Variantes:
- primary: bg-blue-600, hover:bg-blue-700, text-white
- secondary: bg-[#35353d], hover:bg-[#3d3d47], text-[#f0f0f2], border border-[#2e2e36]
- danger: bg-red-600/10, hover:bg-red-600/20, text-red-400, border border-red-600/20
- ghost: bg-transparent, hover:bg-[#2c2c33], text-[#a0a0ab]

Formato:
- rounded-lg (não rounded puro — muito genérico)
- px-4 py-2.5
- text-sm font-medium
- transition-colors duration-200
- disabled:opacity-40 disabled:cursor-not-allowed
```

### Card
```
- bg-[#232328]
- border border-[#2e2e36]
- rounded-xl (mais suave que rounded-lg)
- p-4 sm:p-5
- Sem shadow (o contraste de bg já cria hierarquia)
```

### Input
```
- bg-[#35353d]
- border border-[#2e2e36]
- focus:border-[#3d3d47] focus:ring-1 focus:ring-blue-500/30
- rounded-lg
- px-3.5 py-2.5
- text-sm
- placeholder:text-[#6b6b78]
```

### Sidebar (app)
```
- bg-[#232328]
- border-r border-[#2e2e36]
- Item ativo: bg-blue-600/10 text-blue-400 (sutil, não bg-blue-900 inteiro)
- Item hover: bg-[#2c2c33]
```

### Header (app)
```
- bg-[#232328]
- border-b border-[#2e2e36]
```

---

## 📐 Espaçamento

- Padding de página: `p-4 sm:p-6`
- Gap entre cards: `gap-4 sm:gap-6`
- Gap interno de forms: `gap-4`
- Margem entre seções: `mb-6 sm:mb-8`

---

## 🖼️ Landing Page

- Fundo: `bg-[#1a1a1e]`
- Uma seção hero centralizada
- Logo + nome da marca no topo
- Copy: tom profissional mas acessível (fornecedor de sandálias de excelência)
- Botão "Entrar" discreto no header (ghost style, canto superior direito)
- Sem excesso de cores — predominantemente grafite + texto claro + dourado pontual

---

## 📝 Notas

- Logo: `/public/logo-dmcalcados.png`
- Emails fictícios: `{username}@dmcalcados.local`
- Soft deletes em todo o sistema
- Mobile-first sempre
