/** Code default when Admin → Settings has no saved model id. Not read from env. */
export const DEFAULT_GATEWAY_MODEL = "openai/gpt-4o";
/** Default embedding model for knowledge RAG. 1536 dims — keep in sync with the Atlas index. */
export const DEFAULT_GATEWAY_EMBEDDING_MODEL = "openai/text-embedding-3-small";
