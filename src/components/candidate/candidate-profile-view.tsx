"use client";

import { useEffect, useRef, useState } from "react";
import { AppPage } from "@/components/layout/app-page";
import { ProfilePageSkeleton } from "@/components/layout/page-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  emptyEducationEntry,
  emptyWorkEntry,
  HOBBY_PRESETS,
  type CandidateProfileData,
  type EducationFormEntry,
  type WorkFormEntry,
} from "@/lib/candidate/profile";
import { CountryMultiSelect } from "@/components/candidate/country-multi-select";
import { DateOfBirthPicker } from "@/components/candidate/date-of-birth-picker";
import { PhoneNumberInput } from "@/components/candidate/phone-number-input";
import { ResidencePlaceFields } from "@/components/candidate/residence-place-fields";
import {
  countryCodeFromName,
  normalizeCountryNames,
  normalizeResidencePlace,
} from "@/lib/geo/places";
import { BadgeCheckIcon, PlusIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const AUTOSAVE_DEBOUNCE_MS = 700;

function readNullableInt(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function readNullableFloat(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

type ProfileSavePayload = {
  phoneNumber: number | null;
  phoneCountryCode: number | null;
  headline: string;
  location: string;
  yearsExperience: number | null;
  skills: string[];
  workAuthorization: string;
  preferredCountries: string[];
  summary: string;
  resumeUrl: string;
  resumeSource: string;
  education: EducationFormEntry[];
  workExperience: WorkFormEntry[];
  portfolioUrl: string;
  otherLinks: string[];
  languages: string[];
  voiceLanguage: string;
  hobbies: string[];
  residenceCountry: string;
  residenceState: string;
  residenceCity: string;
  residencePostalCode: string;
  dateOfBirth: string;
  workAuthConfirmed: boolean;
  workAuthStayAgreed: boolean;
  fullTimeCompensation: number | null;
  partTimeCompensation: number | null;
};

function buildProfileSavePayload(
  profile: CandidateProfileData,
): ProfileSavePayload {
  return {
    phoneNumber: profile.phoneNumber,
    phoneCountryCode: profile.phoneCountryCode,
    headline: profile.headline,
    location: profile.location,
    yearsExperience: profile.yearsExperience,
    skills: profile.skills,
    workAuthorization: profile.workAuthorization,
    preferredCountries: profile.preferredCountries,
    summary: profile.summary,
    resumeUrl: profile.resumeUrl,
    resumeSource: profile.resumeSource || "",
    education: profile.education,
    workExperience: profile.workExperience,
    portfolioUrl: profile.portfolioUrl,
    otherLinks: profile.otherLinks,
    languages: profile.languages,
    voiceLanguage: profile.voiceLanguage || "",
    hobbies: profile.hobbies,
    residenceCountry: profile.residenceCountry,
    residenceState: profile.residenceState,
    residenceCity: profile.residenceCity,
    residencePostalCode: profile.residencePostalCode,
    dateOfBirth: profile.dateOfBirth,
    workAuthConfirmed: profile.workAuthConfirmed,
    workAuthStayAgreed: profile.workAuthStayAgreed,
    fullTimeCompensation: profile.fullTimeCompensation,
    partTimeCompensation: profile.partTimeCompensation,
  };
}

const emptyProfile: CandidateProfileData = {
  name: "",
  email: "",
  image: "",
  phoneNumber: null,
  phoneCountryCode: null,
  headline: "",
  location: "",
  yearsExperience: null,
  skills: [],
  workAuthorization: "",
  preferredCountries: [],
  summary: "",
  resumeUrl: "",
  resumeSource: "",
  candidateOnboardingComplete: false,
  education: [],
  workExperience: [],
  portfolioUrl: "",
  otherLinks: [],
  languages: [],
  voiceLanguage: "",
  hobbies: [],
  residenceCountry: "",
  residenceState: "",
  residenceCity: "",
  residencePostalCode: "",
  dateOfBirth: "",
  workAuthConfirmed: false,
  workAuthStayAgreed: false,
  fullTimeCompensation: null,
  partTimeCompensation: null,
};

function TagList({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...values];
    for (const p of parts) {
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="border-border bg-muted/40 text-foreground inline-flex items-center gap-1 border px-2 py-0.5 text-xs"
            >
              {v}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

function educationTitle(entry: EducationFormEntry) {
  const degree = entry.degree.trim();
  const school = entry.school.trim();
  if (degree && school) return `${degree} from ${school}`;
  return degree || school || "Education entry";
}

function workTitle(entry: WorkFormEntry) {
  const role = entry.role.trim();
  const company = entry.company.trim();
  if (role && company) return `${role} at ${company}`;
  return role || company || "Work experience";
}

export function CandidateProfileView() {
  const [profile, setProfile] = useState<CandidateProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const profileRef = useRef(profile);
  const lastSavedJsonRef = useRef<string | null>(null);
  const saveRequestIdRef = useRef(0);
  const readyRef = useRef(false);

  profileRef.current = profile;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/candidate/profile");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (cancelled) return;
        const next = data.profile as CandidateProfileData;
        next.preferredCountries = normalizeCountryNames(
          next.preferredCountries ?? [],
        );
        const place = normalizeResidencePlace({
          country: next.residenceCountry,
          state: next.residenceState,
          city: next.residenceCity,
        });
        next.residenceCountry = place.country;
        next.residenceState = place.state;
        next.residenceCity = place.city;
        setProfile(next);
        lastSavedJsonRef.current = JSON.stringify(buildProfileSavePayload(next));
        readyRef.current = true;
        setReady(true);
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof Error ? e.message : "Failed to load profile";
          setError(
            message.includes("work")
              ? "This page is for Candidate accounts. Sign in with a Candidate (work) profile to continue onboarding."
              : message,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || loading) return;

    const payload = buildProfileSavePayload(profile);
    const json = JSON.stringify(payload);
    if (json === lastSavedJsonRef.current) return;

    setSaved(false);
    const timer = window.setTimeout(() => {
      const requestId = ++saveRequestIdRef.current;
      const body = buildProfileSavePayload(profileRef.current);
      const bodyJson = JSON.stringify(body);
      if (bodyJson === lastSavedJsonRef.current) return;

      setSaving(true);
      setError("");
      void (async () => {
        try {
          const res = await fetch("/api/candidate/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: bodyJson,
          });
          const data = await res.json();
          if (requestId !== saveRequestIdRef.current) return;
          if (!res.ok) throw new Error(data.error || "Save failed");
          lastSavedJsonRef.current = bodyJson;
          setSaved(true);
        } catch (e) {
          if (requestId !== saveRequestIdRef.current) return;
          setError(e instanceof Error ? e.message : "Save failed");
          setSaved(false);
        } finally {
          if (requestId === saveRequestIdRef.current) setSaving(false);
        }
      })();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [profile, ready, loading]);

  // Flush pending edits if the user leaves mid-debounce.
  useEffect(() => {
    return () => {
      if (!readyRef.current) return;
      const body = buildProfileSavePayload(profileRef.current);
      const bodyJson = JSON.stringify(body);
      if (bodyJson === lastSavedJsonRef.current) return;
      void fetch("/api/candidate/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: bodyJson,
        keepalive: true,
      });
    };
  }, []);

  const updateEducation = (
    index: number,
    patch: Partial<EducationFormEntry>,
  ) => {
    setProfile((p) => ({
      ...p,
      education: p.education.map((e, i) =>
        i === index ? { ...e, ...patch } : e,
      ),
    }));
  };

  const updateWork = (index: number, patch: Partial<WorkFormEntry>) => {
    setProfile((p) => ({
      ...p,
      workExperience: p.workExperience.map((e, i) =>
        i === index ? { ...e, ...patch } : e,
      ),
    }));
  };

  const toggleHobby = (hobby: string) => {
    setProfile((p) => {
      const has = p.hobbies.some(
        (h) => h.toLowerCase() === hobby.toLowerCase(),
      );
      return {
        ...p,
        hobbies: has
          ? p.hobbies.filter((h) => h.toLowerCase() !== hobby.toLowerCase())
          : [...p.hobbies, hobby],
      };
    });
  };

  if (loading) {
    return <ProfilePageSkeleton />;
  }

  const initial = profile.name?.charAt(0) || "U";

  return (
    <AppPage className="space-y-8 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
          Profile
        </h1>
        <p
          className="text-muted-foreground min-h-5 text-sm"
          aria-live="polite"
        >
          {saving ? "Saving…" : saved ? "Saved" : null}
        </p>
      </div>

      <div className="border-border bg-card flex flex-col items-start gap-5 border p-6 sm:flex-row sm:items-center">
        <Avatar className="size-20">
          {profile.image ? (
            <AvatarImage src={profile.image} alt={profile.name || "User"} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="text-foreground text-xl font-semibold">
            {profile.name || "Your name"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {profile.headline || "Add your headline"}
          </p>
          {profile.candidateOnboardingComplete ? (
            <p className="text-muted-foreground mt-2 inline-flex items-center gap-1.5 text-xs">
              <BadgeCheckIcon className="size-3.5" />
              Profile ready for applications
            </p>
          ) : (
            <p className="text-muted-foreground mt-2 text-xs">
              Profile incomplete —{" "}
              <a
                href="/candidate/onboarding"
                className="text-primary underline-offset-4 hover:underline"
              >
                continue onboarding
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Basics */}
      <section className="space-y-4">
        <h3 className="text-foreground text-xl font-semibold">Basics</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <PhoneNumberInput
              id="phone"
              countryCode={profile.phoneCountryCode}
              number={profile.phoneNumber}
              defaultIso={
                countryCodeFromName(profile.residenceCountry) ?? "IN"
              }
              onChange={({ phoneCountryCode, phoneNumber }) =>
                setProfile((p) => ({
                  ...p,
                  phoneCountryCode,
                  phoneNumber,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={profile.location}
              onChange={(e) =>
                setProfile((p) => ({ ...p, location: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="headline">Headline / current role</Label>
            <Input
              id="headline"
              value={profile.headline}
              onChange={(e) =>
                setProfile((p) => ({ ...p, headline: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="years">Years of experience</Label>
            <Input
              id="years"
              type="number"
              inputMode="numeric"
              min={0}
              max={80}
              step={1}
              value={profile.yearsExperience ?? ""}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  yearsExperience: readNullableInt(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-summary">Work authorization (summary)</Label>
            <Input
              id="auth-summary"
              placeholder="e.g. Authorized to work in UAE"
              value={profile.workAuthorization}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  workAuthorization: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="summary">Professional summary</Label>
            <Textarea
              id="summary"
              rows={6}
              value={profile.summary}
              onChange={(e) =>
                setProfile((p) => ({ ...p, summary: e.target.value }))
              }
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Education */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-foreground text-xl font-semibold">
            Education <span className="text-muted-foreground text-sm font-normal">(required)</span>
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() =>
              setProfile((p) => ({
                ...p,
                education: [...p.education, emptyEducationEntry()],
              }))
            }
          >
            <PlusIcon className="size-4" />
            Add education
          </Button>
        </div>
        {profile.education.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No education added yet.
          </p>
        ) : null}
        <div className="space-y-4">
          {profile.education.map((entry, index) => (
            <div key={`edu-${index}`} className="border-border space-y-3 border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-foreground text-sm font-medium">
                  {educationTitle(entry)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      education: p.education.filter((_, i) => i !== index),
                    }))
                  }
                >
                  <XIcon className="size-3.5" />
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>School</Label>
                  <Input
                    value={entry.school}
                    onChange={(e) =>
                      updateEducation(index, { school: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Degree</Label>
                  <Input
                    value={entry.degree}
                    onChange={(e) =>
                      updateEducation(index, { degree: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Major</Label>
                  <Input
                    value={entry.major}
                    onChange={(e) =>
                      updateEducation(index, { major: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Start year</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={2100}
                    step={1}
                    value={entry.startYear ?? ""}
                    onChange={(e) =>
                      updateEducation(index, {
                        startYear: readNullableInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End year</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={2100}
                    step={1}
                    placeholder="Blank = Present"
                    value={entry.endYear ?? ""}
                    onChange={(e) =>
                      updateEducation(index, {
                        endYear: readNullableInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>GPA</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={10}
                    step={0.01}
                    value={entry.gpa ?? ""}
                    onChange={(e) =>
                      updateEducation(index, {
                        gpa: readNullableFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Work experience */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-foreground text-xl font-semibold">
            Work experience{" "}
            <span className="text-muted-foreground text-sm font-normal">(required)</span>
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() =>
              setProfile((p) => ({
                ...p,
                workExperience: [...p.workExperience, emptyWorkEntry()],
              }))
            }
          >
            <PlusIcon className="size-4" />
            Add work experience
          </Button>
        </div>
        {profile.workExperience.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No work experience added yet.
          </p>
        ) : null}
        <div className="space-y-4">
          {profile.workExperience.map((entry, index) => (
            <div key={`work-${index}`} className="border-border space-y-3 border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-foreground text-sm font-medium">
                  {workTitle(entry)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      workExperience: p.workExperience.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                >
                  <XIcon className="size-3.5" />
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Input
                    value={entry.company}
                    onChange={(e) =>
                      updateWork(index, { company: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Input
                    value={entry.role}
                    onChange={(e) =>
                      updateWork(index, { role: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Start year</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={2100}
                    step={1}
                    value={entry.startYear ?? ""}
                    onChange={(e) =>
                      updateWork(index, {
                        startYear: readNullableInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End year</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={2100}
                    step={1}
                    placeholder="Blank = Present"
                    value={entry.endYear ?? ""}
                    onChange={(e) =>
                      updateWork(index, {
                        endYear: readNullableInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    value={entry.city}
                    onChange={(e) =>
                      updateWork(index, { city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input
                    value={entry.country}
                    onChange={(e) =>
                      updateWork(index, { country: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={5}
                    value={entry.description}
                    onChange={(e) =>
                      updateWork(index, { description: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Links */}
      <section className="space-y-4">
        <h3 className="text-foreground text-xl font-semibold">Links</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="portfolio">Portfolio URL</Label>
            <Input
              id="portfolio"
              placeholder="https://yourportfolio.com"
              value={profile.portfolioUrl}
              onChange={(e) =>
                setProfile((p) => ({ ...p, portfolioUrl: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Other links</Label>
          <TagList
            values={profile.otherLinks}
            placeholder="https://example.com"
            onChange={(otherLinks) => setProfile((p) => ({ ...p, otherLinks }))}
          />
        </div>
      </section>

      <Separator />

      {/* Skills */}
      <section className="space-y-4">
        <h3 className="text-foreground text-xl font-semibold">Skills</h3>
        <TagList
          values={profile.skills}
          placeholder="Add a skill and press Enter"
          onChange={(skills) => setProfile((p) => ({ ...p, skills }))}
        />
      </section>

      <Separator />

      {/* Languages */}
      <section className="space-y-4">
        <div>
          <h3 className="text-foreground text-xl font-semibold">
            Languages{" "}
            <span className="text-muted-foreground text-sm font-normal">(required)</span>
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            What languages can you natively speak, read, and write?
          </p>
        </div>
        <TagList
          values={profile.languages}
          placeholder="Search and add languages…"
          onChange={(languages) => setProfile((p) => ({ ...p, languages }))}
        />
      </section>

      <Separator />

      {/* Hobbies */}
      <section className="space-y-4">
        <div>
          <h3 className="text-foreground text-xl font-semibold">Hobbies</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Select all that apply:
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {HOBBY_PRESETS.map((hobby) => {
            const selected = profile.hobbies.some(
              (h) => h.toLowerCase() === hobby.toLowerCase(),
            );
            return (
              <button
                key={hobby}
                type="button"
                onClick={() => toggleHobby(hobby)}
                className={cn(
                  "border px-3 py-1.5 text-xs transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {hobby}
              </button>
            );
          })}
        </div>
        <TagList
          values={profile.hobbies.filter(
            (h) =>
              !HOBBY_PRESETS.some((p) => p.toLowerCase() === h.toLowerCase()),
          )}
          placeholder="Add a custom hobby"
          onChange={(custom) =>
            setProfile((p) => ({
              ...p,
              hobbies: [
                ...p.hobbies.filter((h) =>
                  HOBBY_PRESETS.some(
                    (preset) => preset.toLowerCase() === h.toLowerCase(),
                  ),
                ),
                ...custom,
              ],
            }))
          }
        />
      </section>

      <Separator />

      {/* Location & work authorization */}
      <section className="space-y-4">
        <div>
          <h3 className="text-foreground text-xl font-semibold">
            Location &amp; work authorization
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Where you are based and legally authorized to work.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-foreground text-sm font-semibold">
            Location of residence
          </h4>
          <p className="text-muted-foreground text-xs">
            Where you are based for most of the year. This might differ from
            citizenship.
          </p>
          <ResidencePlaceFields
            country={profile.residenceCountry}
            state={profile.residenceState}
            city={profile.residenceCity}
            onChange={(place) =>
              setProfile((p) => ({
                ...p,
                residenceCountry: place.country,
                residenceState: place.state,
                residenceCity: place.city,
              }))
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Postal code</Label>
              <Input
                value={profile.residencePostalCode}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    residencePostalCode: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-foreground text-sm font-semibold">
            Legal attestation
          </h4>
          <p className="text-muted-foreground text-xs">
            Confirm your legally authorized work status.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <DateOfBirthPicker
              id="dob"
              value={profile.dateOfBirth}
              onChange={(dateOfBirth) =>
                setProfile((p) => ({ ...p, dateOfBirth }))
              }
            />
          </div>
          <label className="border-border flex cursor-pointer items-start gap-3 border p-3">
            <input
              type="checkbox"
              className="border-input mt-0.5 size-4 accent-primary"
              checked={profile.workAuthConfirmed}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  workAuthConfirmed: e.target.checked,
                }))
              }
            />
            <span className="space-y-1">
              <span className="text-foreground block text-sm font-medium">
                I agree that I am legally authorized to work for the employer I
                am selected for.
              </span>
              <span className="text-muted-foreground block text-xs">
                You warrant you have the necessary visas or permits for any role
                you accept, and will keep that authorization current.
              </span>
            </span>
          </label>
          <label className="border-border flex cursor-pointer items-start gap-3 border p-3">
            <input
              type="checkbox"
              className="border-input mt-0.5 size-4 accent-primary"
              checked={profile.workAuthStayAgreed}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  workAuthStayAgreed: e.target.checked,
                }))
              }
            />
            <span className="space-y-1">
              <span className="text-foreground block text-sm font-medium">
                I agree to notify in writing before any change to my work
                location or authorization status.
              </span>
              <span className="text-muted-foreground block text-xs">
                Changes may need review so roles stay compliant with local work
                rules.
              </span>
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <Label>Preferred countries</Label>
          <p className="text-muted-foreground text-xs">
            Select one or more countries where you want to work.
          </p>
          <CountryMultiSelect
            value={profile.preferredCountries}
            onChange={(preferredCountries) =>
              setProfile((p) => ({ ...p, preferredCountries }))
            }
          />
        </div>
      </section>

      <Separator />

      {/* Work preferences */}
      <section className="space-y-4">
        <div>
          <h3 className="text-foreground text-xl font-semibold">
            Work preferences
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Minimum expected compensation. This stays private.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ft-comp">Full-time (USD / year)</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">
                $
              </span>
              <Input
                id="ft-comp"
                className="pl-6"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="25000"
                value={profile.fullTimeCompensation ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    fullTimeCompensation: readNullableFloat(e.target.value),
                  }))
                }
              />
            </div>
            <p className="text-muted-foreground text-xs">
              We won&apos;t reach out about roles below this.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pt-comp">Part-time (USD / hour)</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">
                $
              </span>
              <Input
                id="pt-comp"
                className="pl-6"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                placeholder="15"
                value={profile.partTimeCompensation ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    partTimeCompensation: readNullableFloat(e.target.value),
                  }))
                }
              />
            </div>
            <p className="text-muted-foreground text-xs">
              We won&apos;t reach out about roles below this.
            </p>
          </div>
        </div>
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </AppPage>
  );
}
