# Contribuindo

## Ambiente

```bash
uv sync
uv run pytest
```

Regra de arquitetura: `core/` não importa nada de `api/`, `web/` ou `experiment/`.

## Documentation Conventions

O texto das docstrings e comentários fica em inglês, como o código. A documentação de projeto (README, este arquivo, `design.md`) fica em português.

### Python

Docstrings no estilo Google em todo módulo, classe e função pública. A primeira linha é um resumo no imperativo; seções `Args:`, `Returns:`, `Raises:` (e `Attributes:` em classes) quando se aplicam. Os testes levam só a docstring de módulo, porque o nome de cada teste já diz o que ele verifica. Arquivos `__init__.py` vazios ficam sem docstring.

Template:

```python
"""One-line summary of the module."""


def function(arg1, arg2=default):
    """Imperative one-line summary.

    Optional paragraph with invariants or algorithm notes.

    Args:
        arg1: Description.
        arg2: Description.

    Returns:
        Description of the return value.

    Raises:
        ExceptionType: When it is raised.
    """
```

Exemplo (`core/astar.py`):

```python
def astar(start, h, goal=GOAL):
    """Run graph-search A* with lazy deletion and no reopening.

    The heap key is (f, -g, counter): ties go to the deeper node, then FIFO.
    Metrics are counted the same way for every heuristic: stale heap entries
    are not expanded; the goal pop counts as expanded but generates nothing;
    generated counts successors pushed onto the heap.

    Args:
        start: Initial state.
        h: Heuristic, state -> int. Must be consistent for optimality
            without reopening.
        goal: Goal state.

    Returns:
        Result with the optimal path, its moves and the search metrics.

    Raises:
        ValueError: If the frontier empties without reaching goal.
    """
```

### JavaScript

JSDoc em toda função nomeada, inclusive arrow functions atribuídas a `const`, e um bloco `@file` no topo do arquivo. Funções sem parâmetros usam um bloco de uma linha. Handlers inline (`el.onclick = () => …`) não levam JSDoc. Os marcadores `// ---------- seção ----------` separam as partes do arquivo.

Template:

```js
/**
 * Summary sentence.
 * @param {Type} name Description.
 * @param {Type} [optional=default] Description.
 * @returns {Type} Description.
 */
function name(name, optional = default) { … }

/** Summary for a function with no parameters or return value. */
function other() { … }
```

Exemplo (`web/app.js`):

```js
/**
 * Random walk from the goal without undoing the previous move, so the result is always solvable.
 * @param {number} steps Number of moves.
 * @returns {number[]} State.
 */
function shuffle(steps) {
```
