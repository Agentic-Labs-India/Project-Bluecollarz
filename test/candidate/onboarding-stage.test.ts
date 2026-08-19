import { describe, expect, test } from "bun:test";
import type { UIMessage } from "ai";
import {
  formatEducationLines,
  formatYearsExperience,
  inferAskingField,
  readOnboardingStage,
  valuesFromProfile,
} from "@/lib/candidate/onboarding-stage";
import { emptyCandidateProfileData } from "@/lib/candidate/profile";

function assistant(parts: UIMessage["parts"]): UIMessage {
  return { id: "a1", role: "assistant", parts };
}

describe("onboarding stage formatters", () => {
  test("years of experience uses a spoken quantity", () => {
    expect(formatYearsExperience(null)).toBe("");
    expect(formatYearsExperience(0)).toBe("0 years");
    expect(formatYearsExperience(1)).toBe("1 year");
    expect(formatYearsExperience(5)).toBe("5 years");
  });

  test("education lines skip empty rows and join details", () => {
    expect(
      formatEducationLines([
        {
          school: "",
          degree: "",
          startYear: null,
          endYear: null,
          major: "",
          gpa: null,
        },
        {
          school: "ABC Polytechnic",
          degree: "Diploma",
          startYear: 2018,
          endYear: 2021,
          major: "Mechanical",
          gpa: null,
        },
      ]),
    ).toBe("Diploma · Mechanical · ABC Polytechnic · 2018–2021");
  });

  test("valuesFromProfile only shows a voice language after it is set", () => {
    const empty = valuesFromProfile(emptyCandidateProfileData());
    expect(empty.voiceLanguage).toBe("");
    expect(empty.headline).toBe("");
    const filled = valuesFromProfile({
      ...emptyCandidateProfileData(),
      voiceLanguage: "hi-IN",
      headline: "Welder",
      yearsExperience: 4,
      languages: ["Hindi", "English"],
    });
    expect(filled.voiceLanguage).toBe("Hindi");
    expect(filled.headline).toBe("Welder");
    expect(filled.yearsExperience).toBe("4 years");
    expect(filled.languages).toBe("Hindi, English");
  });
});

describe("inferAskingField", () => {
  test("reads the question the coach is asking", () => {
    expect(inferAskingField("What are you currently working as?", [])).toBe(
      "headline",
    );
    expect(
      inferAskingField("How many years of experience do you have?", []),
    ).toBe("yearsExperience");
    expect(inferAskingField("Which college did you study at?", [])).toBe(
      "education",
    );
  });

  test("falls back to the first missing interview field", () => {
    expect(inferAskingField("", ["education", "languages"])).toBe("education");
    expect(inferAskingField("", [])).toBeNull();
  });
});

describe("readOnboardingStage", () => {
  test("writes streamed updateCandidateProfile input into the canvas", () => {
    const stage = readOnboardingStage([
      assistant([
        {
          type: "tool-updateCandidateProfile",
          toolCallId: "u1",
          state: "input-streaming",
          input: { headline: "Welder" },
        },
      ]),
    ]);
    expect(stage.values.headline).toBe("Welder");
    expect(stage.writing).toEqual(["headline"]);
  });

  test("a later update that repeats old fields only writes the new one", () => {
    const stage = readOnboardingStage([
      assistant([
        {
          type: "tool-updateCandidateProfile",
          toolCallId: "u1",
          state: "output-available",
          input: { headline: "Welder" },
          output: {
            profile: { headline: "Welder", yearsExperience: null },
            missing: ["years of experience"],
          },
        },
      ]),
      assistant([
        {
          type: "tool-updateCandidateProfile",
          toolCallId: "u2",
          state: "input-streaming",
          input: { headline: "Welder", yearsExperience: 4 },
        },
      ]),
    ]);
    expect(stage.values.headline).toBe("Welder");
    expect(stage.values.yearsExperience).toBe("4 years");
    expect(stage.writing).toEqual(["yearsExperience"]);
  });

  test("uses saved profile output and remaining missing labels", () => {
    const stage = readOnboardingStage([
      assistant([
        {
          type: "tool-getCandidateProfile",
          toolCallId: "g1",
          state: "output-available",
          input: {},
          output: {
            profile: {
              headline: "Welder",
              yearsExperience: 3,
              languages: ["Hindi"],
              education: [],
              workExperience: [],
            },
            missing: ["education", "work experience"],
          },
        },
        {
          type: "text",
          text: "Which college did you study at?",
        },
      ]),
    ]);
    expect(stage.values.headline).toBe("Welder");
    expect(stage.values.yearsExperience).toBe("3 years");
    expect(stage.missing).toEqual(["education", "workExperience"]);
    expect(stage.asking).toBe("education");
    expect(stage.writing).toEqual([]);
  });

  test("selectVoiceLanguage output fills the voice language row", () => {
    const stage = readOnboardingStage([
      assistant([
        {
          type: "tool-selectVoiceLanguage",
          toolCallId: "l1",
          state: "output-available",
          input: {},
          output: { language_code: "hi-IN", label: "Hindi" },
        },
      ]),
    ]);
    expect(stage.values.voiceLanguage).toBe("Hindi");
  });
});
