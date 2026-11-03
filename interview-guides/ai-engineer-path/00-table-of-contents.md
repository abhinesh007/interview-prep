# 🎯 AI Engineer Interview Master Index & Table of Contents

> **Comprehensive, production-grade AI Engineer technical interview preparation guide** covering LLM & Transformer runtime mechanics, advanced RAG architectures, Context Engineering, Model Context Protocol (MCP), autonomous multi-agent systems, fine-tuning (PEFT/LoRA/DPO), high-throughput inference serving (vLLM, PagedAttention), evaluations, observability, and enterprise system design.
> 
> Aligned with the official [roadmap.sh AI Engineer Path](https://roadmap.sh/ai-engineer) and 2026 production AI engineering practices.

---

## 📚 Study Modules

| Module | Title | Key Topics Covered | Guide Link | Status |
| :---: | :--- | :--- | :---: | :---: |
| **00** | **Table of Contents** | Guide Index, Role-Based Learning Tracks & Difficulty Matrix | [Read Index →](00-table-of-contents.md) | 🎯 Master Index |
| **01** | **AI Landscape & Terminology** | AI vs AGI, LLMs, Training vs Inference, Context vs Prompt vs Inference Engineering, Open vs Closed Models | [Read Guide →](01-ai-landscape-and-terminology-qa.md) | ✅ Ready |
| **02** | **Core LLM Mechanics & Sampling** | Transformer Decoder, Next-Token Prediction, Attention, KV Cache, Temperature, Top-P, Top-K, Repetition Penalties | [Read Guide →](02-core-llm-mechanics-and-sampling-qa.md) | ✅ Ready |
| **03** | **Working with LLMs & Structured Outputs** | APIs (OpenAI, Claude, Gemini), System Prompting, JSON Schema, Instructor, Function Calling, Prompt Caching, Streaming | [Read Guide →](03-working-with-llms-apis-and-structured-outputs-qa.md) | ✅ Ready |
| **04** | **Embeddings & Semantic Search** | Vector Embeddings, Distance Metrics (Cosine, Dot, L2), Bi-Encoders vs Cross-Encoders, Proprietary vs OSS Models, MTEB | [Read Guide →](04-embeddings-and-semantic-search-qa.md) | ✅ Ready |
| **05** | **Vector Databases & Indexing** | Pinecone, Qdrant, Milvus, pgvector, HNSW, IVF-PQ, Metadata Filtering Traps, Index Sizing & Scale | [Read Guide →](05-vector-databases-and-indexing-qa.md) | ✅ Ready |
| **06** | **RAG Fundamentals & Chunking** | RAG Lifecycle, Chunking Strategies (Fixed, Semantic, Parent-Child), Ingestion Pipelines, RAG vs Fine-Tuning | [Read Guide →](06-rag-fundamentals-and-chunking-qa.md) | ✅ Ready |
| **07** | **Advanced RAG Retrieval & Reranking** | Hybrid Search (BM25 + Dense), Reciprocal Rank Fusion (RRF), Cross-Encoder Rerankers, Query Rewriting, GraphRAG | [Read Guide →](07-advanced-rag-retrieval-and-reranking-qa.md) | ✅ Ready |
| **08** | **RAG Frameworks & Implementation** | Implementing RAG: Direct SDKs, LlamaIndex, Haystack, RAGFlow (Architectural Trade-offs & Production Traps) | [Read Guide →](08-rag-frameworks-and-implementation-qa.md) | ✅ Ready |
| **09** | **LangChain & LangGraph Deep Dive** | LangChain Core, LCEL Runnables, Cyclic StateGraph, Reducers, Checkpointers, HITL (`interrupt()`), Subgraphs | [Read Guide →](09-langchain-and-langgraph-deep-dive-qa.md) | ✅ Ready |
| **10** | **Context Engineering & Memory Systems** | Context Layer, Context Compaction, Memory Systems (Episodic/Semantic), Long Context & "Lost in the Middle", Modus/Atlan | [Read Guide →](10-context-engineering-and-memory-systems-qa.md) | ✅ Ready |
| **11** | **Model Context Protocol (MCP)** | MCP Architecture, Host vs Client vs Server, Stdio vs SSE, Resources vs Tools vs Prompts, Security & Tool Poisoning | [Read Guide →](11-model-context-protocol-mcp-qa.md) | ✅ Ready |
| **12** | **AI Agents & Multi-Agent Systems** | ReAct Pattern, Multi-Agent Collaboration (CrewAI, AutoGen, Swarm), Runaway Loops & Compounding Errors | [Read Guide →](12-ai-agents-and-multi-agent-architectures-qa.md) | ✅ Ready |
| **13** | **Fine-Tuning, PEFT & Alignment** | Supervised Fine-Tuning (SFT), LoRA & QLoRA, Alignment (RLHF, DPO), Loss Curves & Catastrophic Forgetting Prevention | [Read Guide →](13-fine-tuning-peft-and-alignment-qa.md) | ✅ Ready |
| **14** | **Inference Engineering & Serving** | Prefill vs Decode, PagedAttention, vLLM, Continuous Batching, Quantization (AWQ, GPTQ, GGUF), Hardware Metrics (TTFT, TPOT) | [Read Guide →](14-inference-engineering-and-model-serving-qa.md) | ✅ Ready |
| **15** | **Evaluation, Observability & Guardrails** | Evals (Ragas, DeepEval), LLM-as-a-Judge Biases, Observability (Langfuse, Arize Phoenix), Guardrails & Prompt Injection Defense | [Read Guide →](15-evaluation-observability-and-guardrails-qa.md) | ✅ Ready |
| **16** | **Multimodal AI & Developer Tools** | Vision-Language Models (VLMs), Speech/Audio (Whisper), Multimodal RAG, AI Coding Tools (Cursor, Devin, Claude Code) | [Read Guide →](16-multimodal-ai-and-developer-ecosystem-qa.md) | ✅ Ready |
| **17** | **System Design & Enterprise Production** | Enterprise System Design using the RADIO Framework (Multi-Tenant RAG, Voice AI Agent, AI Gateway & Dynamic Routing) | [Read Guide →](17-system-design-and-enterprise-production-qa.md) | ✅ Ready |

---

## 🎯 Question Format Standard

Every question in every module adheres strictly to the repository standards documented in [`CONTEXT.md`](../CONTEXT.md) and [`TEMPLATES.md`](../TEMPLATES.md):

```markdown
### Q[N]: [Title of the Question]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[In-depth technical explanation, ASCII data-flow diagrams, and production-grade code]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Probing question, edge-case trap, or failure scenario]"  
*Senior Answer:* [How a top engineer handles the trade-offs and mitigates pitfalls]
```

---

## 🚦 Recommended Learning Tracks

Select a track tailored to your current seniority, interview target, or study timeline:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Role-Based Learning Tracks                           │
├──────────────────────────┬──────────────────────────┬────────────────────────────┤
│ 🟢 Foundations Track     │ 🟡 Production RAG Track  │ 🔴 Senior AI Engineer      │
│ (Modules 01, 02, 03, 04) │ (Modules 05, 06, 07, 08) │ (Modules 09, 10, 11, 12,13)│
│                          │                          │                            │
│ Focus: Core terminology, │ Focus: Vector DBs,       │ Focus: LangChain &         │
│ Transformer internals,   │ chunking pipelines,      │ LangGraph, Context Layer,  │
│ sampling mathematics,    │ hybrid search (BM25 +    │ Model Context Protocol,    │
│ and embedding models.    │ dense), and rerankers.   │ agents & LoRA fine-tuning. │
├──────────────────────────┴──────────────────────────┴────────────────────────────┤
│                        🟣 Principal / Architect Track                            │
│                             (Modules 14, 15, 16, 17)                             │
│                                                                                  │
│ Focus: vLLM PagedAttention, GPU memory bounds, continuous batching, automated    │
│ eval pipelines (Ragas), observability, and fullscale RADIO system design.        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 🟢 1. Junior & AI Foundations Track
- `01-ai-landscape-and-terminology-qa.md` — AI vs AGI, model types, token fundamentals.
- `02-core-llm-mechanics-and-sampling-qa.md` — Attention, next-token prediction, Temperature & Top-P.
- `03-working-with-llms-apis-and-structured-outputs-qa.md` — API integration, JSON Schema, prompt engineering.
- `04-embeddings-and-semantic-search-qa.md` — Vector representations, distance metrics, semantic similarity.

### 🟡 2. Mid-Level & Production RAG Track
- `05-vector-databases-and-indexing-qa.md` — HNSW, IVF-PQ, metadata filtering with pgvector/Qdrant.
- `06-rag-fundamentals-and-chunking-qa.md` — Ingestion pipelines, semantic & parent-child chunking.
- `07-advanced-rag-retrieval-and-reranking-qa.md` — Hybrid search, Reciprocal Rank Fusion, Cross-Encoder reranking.
- `08-rag-frameworks-and-implementation-qa.md` — Native SDKs vs LlamaIndex vs Haystack vs RAGFlow.

### 🔴 3. Senior AI Engineer & Agentic Systems Track
- `09-langchain-and-langgraph-deep-dive-qa.md` — LangChain LCEL, StateGraph, Checkpointers, HITL, Subgraphs.
- `10-context-engineering-and-memory-systems-qa.md` — Context compaction, "Lost in the Middle" mitigation, memory layers.
- `11-model-context-protocol-mcp-qa.md` — MCP host/client/server architecture, stdio/SSE, security & tool poisoning.
- `12-ai-agents-and-multi-agent-architectures-qa.md` — Multi-agent collaboration, swarms, runaway loops.
- `13-fine-tuning-peft-and-alignment-qa.md` — PEFT, LoRA/QLoRA mathematical derivation, SFT, DPO alignment.

### 🟣 4. Principal AI Architect Track
- `14-inference-engineering-and-model-serving-qa.md` — Prefill vs Decode, PagedAttention, vLLM, quantization, VRAM budgeting.
- `15-evaluation-observability-and-guardrails-qa.md` — LLM-as-a-Judge biases, automated CI/CD evals, Langfuse, prompt injection.
- `16-multimodal-ai-and-developer-ecosystem-qa.md` — VLMs, ColPali vision RAG, real-time audio streams, agentic IDEs.
- `17-system-design-and-enterprise-production-qa.md` — Complete RADIO architecture breakdowns for high-scale enterprise systems.

---

## 🛠️ How to Practice with This Guide

1. **Self-Paced Mastery:** Read sequentially or jump directly to the module relevant to your upcoming interview round.
2. **Interactive Mock Interviews:** Ask your AI assistant (Antigravity, Cursor, Claude Code, ChatGPT):
   > *"Act as a strict Principal AI Engineer following [SKILL.md](../SKILL.md) Workflow 4. Ask me a Senior-level question from Module 09 on LangGraph State Reducers and Checkpointing, wait for my answer, challenge my edge cases, and score my performance."*
3. **System Design Whiteboarding:** Pick a scenario from Module 17 and practice breaking it down using the **RADIO** framework on a whiteboard before reading the model solution.
