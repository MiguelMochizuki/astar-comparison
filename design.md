# A* no quebra-cabeça de 8 peças — Design

Data: 2026-10-18 · Disciplina: Introdução à IA · Grupo 2

## 1. Intenção

Enunciado (única descrição dada pela professora):

> Como organizar as peças numeradas utilizando o menor custo de movimentos? Aplicar A* comparando duas heurísticas: peças fora do lugar e distância de Manhattan. Demonstrar qual orientou melhor a busca.

O "demonstrar" fica por nossa conta. Tese a demonstrar:

- h1 (peças fora do lugar) e h2 (Manhattan) são admissíveis, então A* acha o **mesmo custo ótimo** com as duas.
- h2 domina h1 (h2(n) ≥ h1(n) para todo n), então **expande menos nós**. A diferença cresce exponencialmente com a profundidade.
- Conclusão: mesma qualidade de solução, esforço muito menor com h2.

Prova = experimento em lote (estatística). Exemplo interativo = ilustração.

## 2. Objetivos

1. Núcleo Python: A* genérico com heurística plugável; h0, h1, h2.
2. Baseline: **A* com h0 ≡ 0 (≡ Dijkstra/UCS)**. Mesmo algoritmo, só h muda → única variável do experimento é h. (BFS rejeitada: testa objetivo ao gerar, distorce contagem por detalhe de implementação.)
3. Experimento em lote: instâncias agrupadas por profundidade ótima d ∈ {2, 4, …, 24}; métricas por heurística; tabela + gráfico + CSV/JSON. Modelo: tabela de Russell & Norvig (AIMA, cap. 3).
4. Front JS: modo interativo (três painéis lado a lado h0/h1/h2, métricas, animação da solução) e modo experimento (tabela + gráfico log).
5. Testes pytest no núcleo.

## 3. Não-objetivos

15-puzzle, IDA*, outras heurísticas (linear conflict, pattern DB), deploy, autenticação, relatório escrito (o experimento gera os dados para ele, mas o texto não faz parte deste trabalho).

## 4. Anti-objetivos (falha mesmo funcionando)

- Heurística inadmissível por contar o espaço vazio (quebra a tese).
- Métricas contadas diferente entre heurísticas.
- Gerar estado insolúvel (A* explora 181 440 estados e falha).
- Experimento rodando ao vivo na apresentação (lento, não reproduzível).
- Front que "parece bonito" mas não deixa a comparação óbvia em 5 segundos.

## 5. Decisões

### 5.1 Fixadas
- Backend Python, front JavaScript.
- Baseline = A* com h = 0 (Dijkstra/UCS).
- Escopo das seções 2–4.
- Prazo: o quanto antes.

### 5.2 Decisões de implementação (revisáveis)
- **Stack:** FastAPI + uvicorn; front JS puro + Chart.js (CDN), servido como estático pelo FastAPI. Sem build step, sem React.
- **Estado:** `tuple[int, ...]` de 9 posições, linha a linha, `0` = vazio.
- **Objetivo:** `(1,2,3,4,5,6,7,8,0)`.
- **h1:** nº de peças ≠ objetivo, **excluindo o 0**.
- **h2:** soma das distâncias de Manhattan de cada peça à sua posição-alvo, **excluindo o 0**. Posições-alvo pré-computadas.
- **Solvabilidade:** paridade de inversões (ignorando 0); par = solúvel (grade 3×3).
- **A\*:** busca em grafo; `heapq` com chave `(f, -g, contador)` (desempate por g maior, depois FIFO); dict `best_g`; deleção preguiçosa de entradas obsoletas. Heurísticas consistentes → sem reabertura.
- **Métricas (definição única para todas as h):**
  - `expanded`: nós retirados da fila e expandidos (entradas obsoletas não contam; o nó-objetivo retirado conta como expandido mas não gera filhos).
  - `generated`: sucessores inseridos na fila.
  - `max_frontier`: tamanho máximo da fila.
  - `time_ms`: `time.perf_counter`.
  - `cost`: comprimento do caminho.
- **b\*:** resolver `N + 1 = Σ_{i=0..d} (b*)^i` com N = `generated` (convenção AIMA), por bisseção em [1, N]. d = 0 → indefinido.
- **Geração de instâncias:** sementes fixas. Profundidades rasas por caminhada aleatória a partir do objetivo (sem desfazer o último movimento); profundas por permutação aleatória solúvel. Profundidade real medida com A*+h2; instância vai para o balde d se d par em [2, 24]. Meta: 100 instâncias por balde (cap de tentativas; registrar quantas obtidas).
- **Experimento offline:** script CLI → `results/experiment.json` + `results/experiment.csv`. API só lê o JSON.
- **API:**
  - `POST /api/solve` corpo `{"state": [9 ints], "heuristic": "h0"|"h1"|"h2"}` → `{"path": [[9 ints], …], "moves": ["U","D","L","R", …], "metrics": {...}}`. 422 se inválido ou insolúvel.
  - `GET /api/experiment` → conteúdo do JSON; 404 se ainda não gerado.
  - `GET /` → front estático.
- **Front interativo:** tabuleiro editável + "embaralhar" (pede estado solúvel: gera no cliente por caminhada aleatória ou valida paridade no cliente); "resolver" dispara 3 chamadas em paralelo; três painéis com métricas e destaque do vencedor em `expanded`; player da solução (play/pause/passo) compartilhado.
- **Front experimento:** tabela por d (nós expandidos médios e b* por h) + gráfico de linhas, eixo y log.

### 5.3 Deixado ao construtor
Layout visual, cores, estrutura de pastas exata, gerenciador de dependências, granularidade de commits, número exato de tentativas no gerador.

## 6. Estrutura sugerida

```
puzzle8/
  core/puzzle.py        # estado, vizinhos, solvabilidade, objetivo
  core/heuristics.py    # h0, h1, h2
  core/astar.py         # astar(start, h) -> Result(path, moves, metrics)
  core/branching.py     # b*
  experiment/run.py     # CLI: gera instâncias, roda, exporta
  api/main.py           # FastAPI
  web/index.html, app.js, style.css
  tests/
  results/
```

Regra: `core/` não importa nada de `api/`, `web/` ou `experiment/`.

## 7. Testes obrigatórios

- Vizinhos corretos nos cantos, bordas e centro.
- Solvabilidade: objetivo solúvel; troca de duas peças → insolúvel.
- h1(objetivo) = h2(objetivo) = 0; h2 ≥ h1 em amostra aleatória.
- Admissibilidade: h ≤ custo ótimo em instâncias com custo conhecido.
- h0, h1, h2 retornam o mesmo `cost`; caminho válido (passos adjacentes, termina no objetivo).
- `expanded(h2) ≤ expanded(h1) ≤ expanded(h0)` em instâncias de profundidade ≥ 8 (tendência, não lei por instância: testar em média).
- b* conhecido: N e d sintéticos com resposta fechada.

## 8. Critério de pronto

- `pytest` verde.
- `python -m experiment.run` gera JSON/CSV reproduzíveis.
- `uvicorn api.main:app` sobe; front resolve estado embaralhado com as 3 h e anima; aba experimento mostra tabela e gráfico.
- Resultado reproduz a forma da tabela do AIMA (h2 < h1 < h0 em nós; b* de h2 mais perto de 1).
