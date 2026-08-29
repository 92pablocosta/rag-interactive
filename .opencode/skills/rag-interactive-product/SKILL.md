---
name: rag-interactive-product
description: Product context and decision framework for RAG Interactive. Use when planning, reviewing, designing, or implementing features for rag-interactive.com.
compatibility: opencode
metadata:
  scope: product
  project: rag-interactive
---

# RAG Interactive Product

Use this skill only for work related to RAG Interactive.

## Product

RAG Interactive is a public educational platform for teaching Retrieval-Augmented Generation through visual, interactive, progressive, and technically accurate experiences.

The core learning philosophy is:

SEE
→ UNDERSTAND
→ INTERACT
→ CODE
→ CONNECT

The product is organized around:

- Learn — guided educational experience
- Lab — interactive experimentation and debugging
- Build — future hands-on Python exercises

## Current focus

The current priority is Basic RAG.

Core flow:

Document
→ Chunking
→ Embeddings
→ Similarity Search
→ Context
→ Prompt
→ Generation

Do not expand the current module into advanced RAG concepts unless explicitly requested.

Examples of concepts that should normally remain outside the current scope:

- hybrid retrieval
- BM25
- reranking
- query transformation
- contextual retrieval
- evaluation frameworks
- agentic RAG
- GraphRAG

These may belong in future modules.

## Product principles

Prioritize:

1. clarity
2. technical correctness
3. educational value
4. interaction with purpose
5. visual continuity
6. simplicity
7. maintainability

Avoid adding features simply because they are technically interesting.

A feature should answer:

- What does the learner understand better because of this?
- Does it belong in the current learning stage?
- Is there a simpler way to teach the same concept?
- Does it preserve the product's educational flow?

## Learn

Learn should present concepts progressively.

Each major stage should ideally connect:

concept
→ explanation
→ visual representation
→ interaction where useful
→ code example

Avoid turning Learn into a dashboard or playground.

## Lab

Lab exists for exploration, experimentation, and debugging.

It should complement Learn rather than duplicate it.

## Technical honesty

The product may use:

- conceptual visualizations
- educational simulations
- simplified examples

But simplification must never become technically misleading.

Clearly distinguish educational representations from real implementation behavior where relevant.

## Implementation constraints

Prefer the current project stack and architecture.

Do not introduce frameworks, dependencies, or architectural complexity without a concrete need.

Do not migrate the project to a new stack merely because it is more fashionable or powerful.

## Product decision rule

When evaluating a proposed feature, classify it as:

- NOW
- LATER
- REJECT
- NEEDS EVIDENCE

Explain the decision using:

- learner value
- scope
- complexity
- technical accuracy
- maintenance cost
- consistency with Learn / Lab / Build