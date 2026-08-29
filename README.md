# RAG Interactive

**Learn Retrieval-Augmented Generation by seeing how information moves through the system.**

[www.rag-interactive.com](https://www.rag-interactive.com)

RAG Interactive is an open educational project that explains Retrieval-Augmented Generation (RAG) through visual lessons, interactive experiments, and side-by-side Python examples. The current experience focuses on **Module 01 — Basic RAG** and includes the interactive **Lab** debugger under `lab/`.

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

Module 01 remains a continuous vertical journey organized into five narrative phases:

```text
Foundations → Indexing → Retrieval → Augment & Generate → Connect
```

Within that journey, **Evidence A — Consultation price** acts as a recognizable thread from the source document through chunking, ranking, Top-K, context, prompt construction, and the final grounded answer. Documents, chunks, vectors, rankings, context, prompts, generation, and the connected pipeline use distinct visual treatments while remaining part of the same narrative.

The intended progression is concept → visualization → experiment → Python, rather than framework API → copied code → hidden mechanics.

## What you can explore today

The main page contains the initial **Basic RAG** learning journey. It covers:

- the problem RAG solves and the role of external documents;
- lossless character-based chunking with measured overlap and automatic overlap limits;
- simulated educational feature vectors and an illustrative two-dimensional projection;
- query vectorization and cosine-similarity concepts;
- deterministic dense cosine-similarity retrieval;
- Top-K selection with selected-text size and explicit approximate-token feedback (≈ characters ÷ 4);
- retrieved-context and augmented-prompt assembly;
- a five-item canonical evidence catalog with stable identities across changing chunk boundaries;
- deterministic simulated generation with strict evidence grounding and safe unsupported-query states;
- an animated complete-pipeline walkthrough with separate indexing and online-query paths;
- compact conceptual Python blocks beside each computational stage; and
- an English-only interface.

The `lab/` directory contains the **RAG Interactive Lab** — a debugging playground for Module 01. It reuses the same simulated vectors, real cosine similarity, and evidence-based grounding as Learn. Learners choose a sample or custom document, change chunk size, overlap, Top-K, and query text, then inspect generated chunks, a dense cosine-similarity ranking, the assembled prompt, and a grounded or refused answer. Out-of-domain and low-confidence queries are refused with an insufficient-evidence state instead of inventing facts.

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
| **Lab** | A playground/debugger for changing parameters and inspecting intermediate values. | Implemented in `lab/`, sharing the Learn vector, similarity, and grounding model. |
| **Build** | A hands-on Python environment where learners implement RAG components. | Planned; not implemented. |

Learn and the Lab link to each other from the navigation bar and from the Learn hero and transition sections, using product terminology rather than internal version names. Build is shown only as future functionality; no Build page exists yet, so nothing links to one.

## Interactive examples

In the current Learn experience, you can:

- switch among tiny, balanced, and large chunk presets;
- change chunk size and overlap without losing source text, with the affected value, output, and Python line highlighted together;
- highlight the overlap that actually repeats between adjacent chunks;
- inspect simulated chunk vectors in an SVG visualization;
- enter a query or choose presets, including an out-of-domain test;
- inspect a simulated dense cosine-similarity ranking;
- adjust a geometric cosine-angle visualization;
- change Top-K and observe selected chunks, context, prompt, and answer states;
- trace canonical evidence to its current chunk, dense rank, Top-K state, context, and citation;
- see when fragmented or excluded evidence cannot support an answer;
- open citation details inline without jumping back to an earlier section; and
- run, reset, or step through pipeline states that distinguish completed, current, and upcoming work.

Because the controls share state, a change near the start of the lesson can affect later retrieval, context, and generation views.

## Accessibility and responsive behavior

The Learn experience keeps its vertical structure across screen sizes. On wider layouts, a sticky section navigator shows progress through the lesson. Below 1200px, it becomes a compact progress indicator beneath the navigation bar. Dense visualizations and pipeline rows include horizontal-overflow protection and visible scrolling guidance when they cannot fit safely.

Current accessibility support includes:

- visible keyboard focus styles and larger interactive targets;
- `aria-pressed`, `aria-expanded`, `aria-current`, and live status regions where state changes;
- keyboard-operable SVG points for inspecting simulated vectors;
- semantic labels for controls and visual regions; and
- reduced-motion behavior for users who request it.

The Lab reuses the same design tokens, focus styles, and responsive breakpoints, and announces its generated chunks, similarity ranking, prompt, and answer regions with `aria-live` so state changes are readable by assistive technology.

These behaviors are covered by structural tests and code inspection. A manual visual and keyboard pass in a real browser is still recommended before publication, particularly at desktop, tablet, and mobile breakpoints; the integrated browser was unavailable during the latest verification pass.

## Python-first learning

Compact “In Python” blocks are placed next to the concepts they represent: loading a document, splitting text, producing embeddings, calculating similarity, selecting Top-K results, assembling context and a prompt, and generating an answer. Relevant lines update or highlight alongside the interactive controls.

These examples connect visual behavior to familiar RAG implementation patterns. They are explanatory snippets only—Python is **not** executed in the browser, and the project does not currently include a Python runtime or backend.

## Educational simulations

Educational simulations are used where running real embedding models or LLMs would add unnecessary infrastructure to the introductory learning experience. Learn and the Lab both rely on deterministic simulations of educational feature vectors, dense cosine retrieval, approximate token counts, LLM responses, and grounding. The similarity ranking shown in both experiences is a real cosine-similarity calculation over those simulated vectors.

These simulations teach how information and decisions move through the pipeline; they are not production-grade machine-learning implementations. The browser vectors are handcrafted educational features rather than model-produced embeddings, and the 2D chart is an illustrative projection rather than PCA. Cosine similarity retains its mathematical range of -1 to 1, while the geometry view is driven by the dense cosine score; its manual angle control is an isolated visual sandbox and does not change retrieval.

Grounding is intentionally strict. An answer is marked grounded only when one retrieved chunk contains the complete canonical evidence and that chunk is present in the active context. Fragmented evidence, evidence excluded by Top-K, and unsupported queries do not produce an enabled citation. Token counts are estimates based on the selected text length using the clearly labeled approximation ≈ characters ÷ 4.

The project follows a simple accuracy principle:

> A simplified visualization is acceptable. A misleading visualization is not.

Accordingly, technically simplified behavior is labeled clearly in the interface and documentation.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript
- SVG for the vector-space and cosine-angle visualizations
- Node.js built-in test runner for core-logic tests

There is no application framework, npm requirement, backend, database, API key, or build process. The learning application runs entirely in the browser; Node.js is needed only to run the optional automated tests.

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

## Deployment

The public site is served from the canonical domain [https://www.rag-interactive.com](https://www.rag-interactive.com). Deployment is configured outside this repository (for example, on the hosting platform's Vercel project), not through files in the repo. That platform configuration should point the custom domain at `www.rag-interactive.com`, and any legacy `rag-interactive.vercel.app` URL should be redirected to the canonical host. The repository itself contains no deployment configuration or redirect rules.

## Running tests

The testable RAG logic is isolated in `rag-core.js`, which both Learn and the Lab load in the browser, and uses only Node.js built-in modules. No package installation is required.

```bash
node --check script.js
node --check rag-core.js
node --check lab/lab.js
node --check tests/rag-core.test.js
node --check tests/ui-contract.test.js
node --check tests/lab-contract.test.js
node --check tests/publication-contract.test.js
node --test tests/*.test.js
```

The current suite contains 45 passing tests covering chunk presets and boundary values, incompatible overlap adjustment, complete document reconstruction, canonical evidence lookup, supported and unsupported queries, Top-K values of 1, 3, and 5, citation integrity, cosine-similarity endpoints and known-vector math, evidence-chunk ranking, token estimates, UI contracts for branding, narrative phases, accessibility, responsive orientation (including the viewport-safe content wrapper), the Lab page, the absence of version branding and unsafe HTML rendering, and publication contracts for canonical URLs, metadata, favicon, robots.txt, sitemap, and link integrity.

The latest verification pass also checked JavaScript syntax across Learn and the Lab, HTML structure and unique IDs, JavaScript-to-DOM references for both pages, CSS brace structure, overflow protections, keyboard and reduced-motion contracts, successful local HTTP responses for every HTML, CSS, and JavaScript asset, and publication metadata (canonical URLs, Open Graph, favicon paths, robots.txt, and sitemap). The Lab was consolidated into the RAG Interactive identity under `lab/`, the earlier `v1/` experiment was removed, and the advanced-module content remained absent from Learn. These programmatic and structural checks complement—not replace—visual browser testing.

## Project structure

```text
.
├── index.html       # Guided Module 01 learning content and interface
├── styles.css       # Shared design system, layout, and visual states for Learn and Lab
├── rag-core.js      # Testable chunking, vector, similarity, evidence, and token helpers
├── script.js        # Learn UI orchestration and deterministic simulations
├── favicon.svg      # R·I brand favicon (SVG, shared by Learn and Lab)
├── robots.txt       # Minimal crawler policy referencing the sitemap
├── sitemap.xml      # Public pages: Learn / and Lab /lab/
├── lab/
│   ├── index.html   # RAG Interactive Lab debugging playground
│   ├── lab.css      # Lab layout and debugger components (uses shared design tokens)
│   └── lab.js       # Lab controls, cosine ranking, prompt assembly, and grounding
├── tests/
│   ├── rag-core.test.js          # Node test suite for the reusable RAG core
│   ├── ui-contract.test.js       # Structural UI, accessibility, and responsive contracts
│   ├── lab-contract.test.js      # Lab branding, language, navigation, and safety contracts
│   └── publication-contract.test.js  # Canonical URLs, metadata, favicon, SEO, and link integrity
└── README.md        # Project documentation
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
- additional examples and accessibility improvements.

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
- English copy and future localizations; and
- bug fixes and small usability improvements.

There is no formal contribution guide yet. Before opening a large change, consider starting with an issue or discussion explaining the learning problem, proposed behavior, and technical trade-offs. Keep changes focused and distinguish educational simplifications from real implementations.

## Status

RAG Interactive is an early-stage educational project under active development. Module 01 and the Lab are usable prototypes, but interfaces, examples, terminology, and roadmap priorities may change. The future advanced learning modules remain outside the current Basic RAG experience.

## License

No license has been added yet.
