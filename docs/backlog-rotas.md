# Backlog — Rotas

## ✅ Etapa 1: Ajustar mapeamentos de waypoints
- [x] `Esporte` → Buraco
- [x] `Aterro` → Buraco
- [x] `Bacia` → Bacia d'água (ícone Droplets, cor azul)
- [x] `Fazenda` → Quebra-mola / Ponte (mapeamento estático)
- [x] `Fazenda` → lógica dinâmica: se 3+ pontos "fazenda" consecutivos em ≤3s de intervalo → "Ponte", senão → "Quebra-mola"

## 🔲 Etapa 2: Velocidade média por ponto da rota
- Ao passar o mouse sobre a rota (polyline), exibir tooltip com velocidade média naquele trecho
- Calcular velocidade entre trackpoints consecutivos (distância / tempo)
- Exibir em km/h

## 🔲 Etapa 3: Tempos estimados parado vs em movimento
- Calcular tempo total parado (velocidade ≈ 0 ou abaixo de threshold)
- Calcular tempo total em movimento
- Exibir na barra de info do mapa (junto com nome, pontos, coords)

## 🔲 Etapa 4: Edição de rota
- Adicionar pontos manualmente no mapa (click para posicionar)
- Remover pontos existentes
- Alterar característica de trecho (asfalto / estrada de chão / areia)
  - Selecionar ponto inicial e ponto final
  - Definir a caracterização do trecho entre eles
- Salvar edições na rota
