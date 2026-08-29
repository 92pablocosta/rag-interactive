# RAG Interactive

**Learn Retrieval-Augmented Generation by seeing how information moves through the system.**

[rag-interactive.com](https://rag-interactive.com)

RAG Interactive is an open educational project that explains Retrieval-Augmented Generation (RAG) through visual lessons, interactive experiments, and side-by-side Python examples. The current experience focuses on **Module 01 — Basic RAG** and includes an earlier experimental debugger under `v1/`.

> Project status: early-stage and under active development. The current implementation is an educational front-end, not a production RAG system.

## What is RAG Interactive?

RAG Interactive helps learners follow data through a RAG pipeline one transformation at a time:

```text
Document → Chunks → Embeddings → Retrieved Context → Prompt → Answer
```

Each stage combines a concise explanation, a visual representation, an interaction, and a nearby Python equivalent. The goal is to make two questions easy to answer:

- What is happening to the data at this exact stage?
- What Python code represents what I am seeing?

## Why this project exists

RAG is straightforward to describe at a high level: retrieve useful information, add it to a prompt, and generate an answer. The implementation becomes harder when terms such as chunking, embeddings, vector similarity, Top-K, context, prompt augmentation, and grounding remain abstract.

RAG Interactive makes those intermediate states visible before introducing larger abstractions. Its learning sequence is:

```text
SEE → UNDERSTAND → INTERACT → CODE → CONNECT
```

The project deliberately starts with the mechanics rather than a framework API. Frameworks such as LangChain can be useful, but they are not the first teaching layer here.

## How it teaches RAG

The guided experience follows four steps:

1. **Visualize** — see the document, chunks, vector representations, rankings, context, and prompt.
2. **Interact** — change parameters and observe how downstream stages respond.
3. **Connect to Python** — relate each concept to a small Python example shown beside it.
4. **See the architecture** — run or step through the complete indexing, retrieval, and generation flow.

The intended progression is concept → visualization → experiment → Python, rather than framework API → copied code → hidden mechanics.

## What you can explore today

The main page contains the initial **Basic RAG** learning journey. It covers:

- the problem RAG solves and the role of external documents;
- dynamic character-based chunking and overlap;
- simulated educational feature vectors and an illustrative two-dimensional projection;
- query vectorization and cosine-similarity concepts;
- deterministic dense cosine-similarity retrieval;
- Top-K selection with context-size and approximate-token feedback;
- retrieved-context and augmented-prompt assembly;
- deterministic simulated generation with stable evidence identities and strict grounding;
- an animated complete-pipeline walkthrough; and
- English/Portuguese switching for selected dynamic status messages.

The `v1/` directory contains an earlier **RAG Lab** experiment. It lets learners choose a sample or custom document, change chunk size, overlap, Top-K, and query text, then inspect generated chunks, a heuristic similarity ranking, the assembled prompt, and a simulated answer.

## Learning flow

A RAG system has two related but distinct paths.

### Indexing

Documents are prepared before a user asks a question:

```text
External documents
        ↓
     Chunking
        ↓
  Chunk embeddings
        ↓
    Vector store
```

### Retrieval and generation

At query time, the system retrieves evidence and uses it to construct the model input:

```text
User query
    ↓
Query embedding ───────┐
    ↓                  │
Similarity search ← Vector store
    ↓
Top-K chunks
    ↓
Retrieved context
    ↓
Augmented prompt = Instructions + Context + Question
    ↓
LLM generation
    ↓
Grounded answer
```

The current module progressively introduces the problem, documents, chunking, embeddings, query embeddings, similarity search, Top-K retrieval, context, prompt augmentation, generation and grounding, then reconnects them as one pipeline.

## Learn / Lab / Build

RAG Interactive is designed around three complementary experiences:

| Experience | Purpose | Current state |
| --- | --- | --- |
| **Learn** | A guided visual journey from individual concepts to the complete architecture. | Initial Basic RAG module implemented. |
| **Lab** | A playground/debugger for changing parameters and inspecting intermediate values. | Early experiment available under `v1/`. |
| **Build** | A hands-on Python environment where learners implement RAG components. | Planned; not implemented. |

## Interactive examples

In the current Learn experience, you can:

- switch among tiny, balanced, and large chunk presets;
- change chunk size and overlap, and highlight overlapping text;
- inspect simulated chunk vectors in an SVG visualization;
- enter a query or choose presets, including an out-of-domain test;
- inspect a simulated dense cosine-similarity ranking;
- adjust a geometric cosine-angle visualization;
- change Top-K and observe selected chunks, context, prompt, and answer states;
- trace canonical evidence to its current chunk, rank, Top-K state, context, and citation; and
- run, reset, or step through the complete pipeline animation.

Because the controls share state, a change near the start of the lesson can affect later retrieval, context, and generation views.

## Python-first learning

Python snippets are placed next to the concepts they represent: loading a document, splitting text, producing embeddings, calculating similarity, selecting Top-K results, and assembling a prompt.

These examples connect visual behavior to familiar RAG implementation patterns. They are explanatory snippets only—Python is **not** executed in the browser, and the project does not currently include a Python runtime or backend.

## Educational simulations

Educational simulations are used where running real embedding models or LLMs would add unnecessary infrastructure to the introductory learning experience. The current Learn module deterministically simulates educational feature vectors, dense cosine retrieval, approximate token counts, LLM responses, and grounding.

These simulations teach how information and decisions move through the pipeline; they are not production-grade machine-learning implementations. The browser vectors are handcrafted educational features rather than model-produced embeddings, and the 2D chart is an illustrative projection rather than PCA.

The project follows a simple accuracy principle:

> A simplified visualization is acceptable. A misleading visualization is not.

Technically simplified behavior should therefore be labeled clearly in the interface and documentation.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript
- SVG for the vector-space and cosine-angle visualizations

There is no application framework, npm requirement, backend, database, API key, or build process. All current behavior runs in the browser.

## Running locally

Clone the repository and enter its directory:

```bash
git clone https://github.com/92pablocosta/rag-interactive.git
cd rag-interactive
```

You can open `index.html` directly in a browser. On macOS:

```bash
open index.html
```

If your browser applies stricter local-file rules, serve the same static files with a small local HTTP server:

```bash
python3 -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000). The server is optional; it does not add a backend to the application.

## Project structure

```text
.
├── index.html       # Guided Module 01 learning content and interface
├── styles.css       # Layout, responsive styling, and visual states for Learn
├── script.js        # Learn interactions and deterministic simulations
├── README.md        # Project documentation
└── v1/
    ├── index.html   # Earlier RAG Lab/debugger interface
    ├── styles.css   # Lab-specific styling
    └── script.js    # Lab controls, pipeline inspection, and simulations
```

No generated assets or dependency directories are required to run the current project.

## Roadmap

The conceptual module roadmap is:

- [x] Basic RAG — initial Learn implementation
- [ ] Hybrid Retrieval
- [ ] Reranking
- [ ] Query Transformation
- [ ] Contextual Retrieval
- [ ] Evaluation
- [ ] Agentic RAG
- [ ] GraphRAG

Hybrid retrieval, reranking, and evaluation are intentionally reserved for future dedicated modules rather than previewed inside Basic RAG.

Future product ideas also include:

- richer Lab experiments and configuration comparisons;
- hands-on Python implementation exercises for Build;
- optional integrations with real embedding providers and vector databases;
- evaluation experiments backed by actual evaluation tooling; and
- additional examples, accessibility improvements, and translations.

These items describe direction, not delivery commitments.

### How future modules should evolve the architecture

Advanced modules should begin with a visible limitation in the current architecture, then introduce a technique because it solves that problem:

```text
Current architecture
        ↓
Problem or limitation
        ↓
New technique
        ↓
Visual experiment
        ↓
Trade-off
        ↓
Python implementation
```

For example, semantic retrieval can miss exact terms, which motivates hybrid retrieval. Hybrid retrieval can still produce a weak candidate order, which motivates reranking. This keeps the roadmap focused on *why* an architecture evolves, not merely on collecting techniques.

## Design principles

- Visual understanding before abstraction
- Mechanics before framework conventions
- Interaction over passive reading
- Technical accuracy over visual spectacle
- Complexity introduced only when it solves a visible problem
- Python examples close to the concepts they explain

## Contributing

Contributions are welcome, especially in these areas:

- technical review of RAG explanations and simulations;
- accessibility and responsive behavior;
- clearer visual explanations and examples;
- Python exercises and implementation notes;
- English and Portuguese copy, plus additional translations; and
- bug fixes and small usability improvements.

There is no formal contribution guide yet. Before opening a large change, consider starting with an issue or discussion explaining the learning problem, proposed behavior, and technical trade-offs. Keep changes focused and distinguish educational simplifications from real implementations.

## Status

RAG Interactive is an early-stage educational project under active development. Module 01 and the experimental Lab are usable prototypes, but interfaces, examples, terminology, and roadmap priorities may change.

## License

No license has been added yet.
