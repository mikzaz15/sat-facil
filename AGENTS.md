# AGENTS.md

## Project
sat-facil

## Purpose
sat-facil contains an AI assistant focused on Mexican SAT / CFDI guidance, plus a separate quote/payments application.

The current priority is the SAT assistant and its RAG pipeline.

---

## Current Priority
Focus on the SAT assistant workflow:

1. ingest official SAT documents
2. chunk and embed them
3. store them in Supabase
4. retrieve relevant chunks
5. answer user SAT / CFDI questions reliably

Do not spend time trying to scrape SAT HTML pages if they are blocked by Access Gateway. Prefer local PDFs and official downloadable docs.

---

## Important Directories

### SAT assistant / RAG
- `scripts/`
- `sat_sources/`
- `src/` files related to retrieval, RAG, ingestion, and chat

### Supabase
- `supabase/`
- migrations
- schema files

### Other app domains
There is also quote/payments/workspace code in this repo.
Avoid modifying those files unless the task explicitly asks for it.

---

## Database

### Main SAT assistant tables
#### `kb_sources`
Stores source documents.

Important columns:
- `id`
- `title`
- `url`
- `publisher`
- `source`

Notes:
- `url` is unique
- `source` must not be null

#### `kb_chunks`
Stores chunked text and embeddings.

Important columns:
- `id`
- `source_id`
- `chunk_index`
- `chunk_text`
- `embedding`

Notes:
- embeddings must match the pgvector dimension in the DB
- default to `text-embedding-3-small` unless the schema explicitly supports a different dimension

---

## Ingestion Rules

Preferred ingestion order:

1. local PDFs in `sat_sources/`
2. local TXT / MD files
3. official downloadable SAT docs
4. HTML crawling only if clearly accessible and not blocked

If HTML extraction returns tiny content, Access Gateway, forbidden, or obvious blocked pages:
- do not store it
- log clearly
- save debug artifacts if needed
- prefer PDF ingestion instead

All ingestion scripts should be:
- idempotent
- safe to rerun
- explicit in logging
- conservative about storing low-quality content

When re-ingesting a source:
- upsert `kb_sources`
- replace or refresh corresponding `kb_chunks`

---

## Retrieval Rules

Prefer hybrid retrieval:
- pgvector similarity
- PostgreSQL full-text search
- merged / reranked results

Log enough retrieval diagnostics to debug:
- retrieved chunk count
- source title / URL
- similarity or score
- whether fallback retrieval was used

---

## Prompting / Answering Goals

The SAT assistant should:
- answer based on retrieved evidence
- prefer official SAT documents
- avoid overconfident unsupported answers
- clearly say when evidence is weak or missing

If evidence is weak:
- do not hallucinate
- ask for clarification or state that official support was not found

---

## Coding Rules

- Do not modify unrelated quote/payments/workspace code unless explicitly requested.
- Keep changes small and reviewable.
- Prefer scripts that can be rerun safely.
- Prefer clarity over cleverness.
- Add logging for ingestion and retrieval changes.
- Preserve compatibility with existing Supabase schema unless the task explicitly includes migrations.

---

## Environment / Defaults

Default assumptions:
- Supabase is the database
- `kb_sources` and `kb_chunks` are the SAT knowledge tables
- embeddings should default to `text-embedding-3-small`
- SAT HTML pages may be blocked by Access Gateway

---

## Typical Good Tasks

Examples of good tasks in this repo:
- improve local SAT document ingestion
- add PDF parsing
- add chunking improvements
- add hybrid retrieval
- add retrieval evaluation
- improve logging and schema compatibility

Examples of tasks to avoid unless requested:
- refactoring quote/payment UI
- changing Stripe flows
- editing unrelated workspace features

---

## If Unsure
If a task may affect both SAT assistant code and quote/payments code, prefer isolating SAT assistant logic and avoid broad refactors unless explicitly requested.