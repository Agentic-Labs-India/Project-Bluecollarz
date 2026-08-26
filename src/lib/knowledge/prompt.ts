export const KNOWLEDGE_SUGGESTIONS = [
  "What do the documents say about ECR / emigration clearance?",
  "Summarise Gulf labour or medical fitness rules in the PDFs.",
  "Which uploaded files mention DigiLocker, KYC, or interviews?",
] as const;

/**
 * Injected when a surface's RAG switch is on. Interviews/onboarding must still
 * run their session — search is extra context, not the job.
 */
export const KNOWLEDGE_RAG_SURFACE_HINT = `Knowledge base: When the question is about process, policy, emigration, medical, KYC, interviews, jobs, or uploaded documents, call searchDocuments (or listDocuments for a catalogue). Cite [filename p.N]. Do not invent law or policy. If search returns insufficient, say you do not have that in the knowledge base. Do not skip this session's required questions or tools to search.`;
