import { describe, expect, test } from "bun:test";
import { defaultPlatformSettings } from "@/lib/admin/platform-settings-defaults";
import { KNOWLEDGE_RAG_KEYS } from "@/lib/admin/platform-settings-types";
import {
  isKnowledgeDocType,
  KNOWLEDGE_DOC_TYPES,
  parseKnowledgeDocType,
} from "@/lib/knowledge/types";

describe("knowledge document types", () => {
  test("covers Gulf hiring surfaces", () => {
    expect(KNOWLEDGE_DOC_TYPES).toContain("emigration");
    expect(KNOWLEDGE_DOC_TYPES).toContain("gulf_labour");
    expect(KNOWLEDGE_DOC_TYPES).toContain("kyc");
    expect(KNOWLEDGE_DOC_TYPES).toContain("medical");
    expect(KNOWLEDGE_DOC_TYPES).toContain("interview");
    expect(KNOWLEDGE_DOC_TYPES).toContain("onboarding");
    expect(isKnowledgeDocType("legal")).toBe(true);
    expect(isKnowledgeDocType("general")).toBe(true);
    expect(isKnowledgeDocType("unknown")).toBe(false);
  });

  test("parseKnowledgeDocType falls back to general", () => {
    expect(parseKnowledgeDocType("kyc")).toBe("kyc");
    expect(parseKnowledgeDocType("not-a-type")).toBe("general");
    expect(parseKnowledgeDocType(null)).toBe("general");
  });
});

describe("knowledge RAG switches", () => {
  test("default off for every surface", () => {
    const rag = defaultPlatformSettings().knowledge.rag;
    expect(KNOWLEDGE_RAG_KEYS).toEqual([
      "support",
      "onboarding",
      "interviewCommunication",
      "interviewDomain",
    ]);
    for (const key of KNOWLEDGE_RAG_KEYS) {
      expect(rag[key]).toBe(false);
    }
  });
});
