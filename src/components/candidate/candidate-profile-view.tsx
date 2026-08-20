"use client";

import { BadgeCheckIcon, PlusIcon, ShieldCheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CandidateMedicalReports } from "@/components/candidate/candidate-medical-reports";
import { CountryMultiSelect } from "@/components/candidate/country-multi-select";
import { DateOfBirthPicker } from "@/components/candidate/date-of-birth-picker";
import { PhoneNumberInput } from "@/components/candidate/phone-number-input";
import { ResidencePlaceFields } from "@/components/candidate/residence-place-fields";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { AppPage, AppPageTitle } from "@/components/layout/app-page";
import { ProfilePageSkeleton } from "@/components/layout/page-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  type CandidateProfileData,
  type EducationFormEntry,
  emptyCandidateProfileData,
  emptyEducationEntry,
  emptyWorkEntry,
  HOBBY_PRESETS,
  type WorkFormEntry,
} from "@/lib/candidate/profile";
import {
  countryCodeFromName,
  normalizeCountryNames,
  normalizeResidencePlace,
} from "@/lib/core/geo/places";
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
  preferredCountries: string[];
  summary: string;
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
    preferredCountries: profile.preferredCountries,
    summary: profile.summary,
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
    fullTimeCompensation: profile.fullTimeCompensation,
    partTimeCompensation: profile.partTimeCompensation,
  };
}

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
  const [profile, setProfile] = useState<CandidateProfileData>(
    emptyCandidateProfileData(),
  );
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
        lastSavedJsonRef.current = JSON.stringify(
          buildProfileSavePayload(next),
        );
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
  const identityLocked = profile.isKycVerified === true;

  return (
    <AppPage className="pb-10">
      <AppPageTitle
        trailing={
          <p
            className="text-muted-foreground min-h-5 text-sm"
            aria-live="polite"
          >
            {saving ? "Saving…" : saved ? "Saved" : null}
          </p>
        }
      >
        Profile
      </AppPageTitle>

      <div className="space-y-8">
        <div className="bg-primary relative flex flex-col items-start gap-5 overflow-hidden border border-white/15 p-6 sm:flex-row sm:items-center">
        <PrimaryDither seed="candidate-profile-header" opacity={0.85} />
        <Avatar className="relative z-10 size-20 ring-2 ring-white/25">
          {profile.image ? (
            <AvatarImage src={profile.image} alt={profile.name || "User"} />
          ) : null}
          <AvatarFallback className="bg-white/15 text-xl font-semibold text-white">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="relative z-10 min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
            <span>{profile.name || "Your name"}</span>
            {identityLocked ? (
              <span
                className="inline-flex items-center gap-1 text-sm font-medium text-white"
                title="Identity verified via DigiLocker"
              >
                <BadgeCheckIcon className="size-5 fill-white text-primary" />
                Verified
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-sm text-white/75">
            {profile.headline || "Add your headline"}
          </p>
          {identityLocked ? (
            <p className="mt-2 text-xs text-white/65">
              DigiLocker verified — phone, DOB, address, PAN, Aadhaar, and
              gender are locked.
            </p>
          ) : profile.candidateOnboardingComplete ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/65">
              <BadgeCheckIcon className="size-3.5" />
              Profile ready for applications
            </p>
          ) : (
            <p className="mt-2 text-xs text-white/65">
              Profile incomplete —{" "}
              <a
                href="/candidate/onboarding"
                className="text-white underline underline-offset-4 hover:text-white/90"
              >
                continue onboarding
              </a>
            </p>
          )}
        </div>
        <Button
          asChild
          variant="outline"
          className="relative z-10 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
        >
          <Link href="/candidate/kyc">
            <ShieldCheckIcon className="size-4" />
            {identityLocked ? "View KYC" : "Complete KYC"}
          </Link>
        </Button>
      </div>

      <CandidateMedicalReports />

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
              disabled={identityLocked}
              defaultIso={countryCodeFromName(profile.residenceCountry) ?? "IN"}
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
            <Label htmlFor="location">Location / address</Label>
            <Input
              id="location"
              value={profile.location}
              disabled={identityLocked}
              onChange={(e) =>
                setProfile((p) => ({ ...p, location: e.target.value }))
              }
            />
          </div>
          {identityLocked ||
          profile.gender ||
          profile.pan ||
          profile.aadhaarLast4 ? (
            <>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Input value={profile.gender || "—"} disabled />
              </div>
              <div className="space-y-2">
                <Label>PAN</Label>
                <Input value={profile.pan || "—"} disabled />
              </div>
              <div className="space-y-2">
                <Label>Aadhaar (last 4)</Label>
                <Input
                  value={
                    profile.aadhaarLast4
                      ? `XXXXXXXX${profile.aadhaarLast4}`
                      : "—"
                  }
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of birth</Label>
                {identityLocked ? (
                  <Input id="dob" value={profile.dateOfBirth || "—"} disabled />
                ) : (
                  <DateOfBirthPicker
                    id="dob"
                    value={profile.dateOfBirth}
                    onChange={(dateOfBirth) =>
                      setProfile((p) => ({ ...p, dateOfBirth }))
                    }
                  />
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="dob">Date of birth</Label>
              <DateOfBirthPicker
                id="dob"
                value={profile.dateOfBirth}
                onChange={(dateOfBirth) =>
                  setProfile((p) => ({ ...p, dateOfBirth }))
                }
              />
            </div>
          )}
          <div className="space-y-2">
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
            Education{" "}
            <span className="text-muted-foreground text-sm font-normal">
              (required)
            </span>
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
            <div
              key={`edu-${entry.school}-${entry.degree}-${entry.startYear}-${index}`}
              className="border-border space-y-3 border p-4"
            >
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
            <span className="text-muted-foreground text-sm font-normal">
              (required)
            </span>
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
            <div
              key={`work-${entry.company}-${entry.role}-${entry.startYear}-${index}`}
              className="border-border space-y-3 border p-4"
            >
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
            <span className="text-muted-foreground text-sm font-normal">
              (required)
            </span>
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

      {/* Location */}
      <section className="space-y-4">
        <div>
          <h3 className="text-foreground text-xl font-semibold">Location</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Where you are based for most of the year.
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
          <fieldset disabled={identityLocked} className="min-w-0 space-y-3">
            <ResidencePlaceFields
              country={profile.residenceCountry}
              state={profile.residenceState}
              city={profile.residenceCity}
              postalCode={profile.residencePostalCode}
              onChange={(place) =>
                setProfile((p) => ({
                  ...p,
                  residenceCountry: place.country,
                  residenceState: place.state,
                  residenceCity: place.city,
                  residencePostalCode: place.postalCode,
                }))
              }
            />
          </fieldset>
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
            Minimum expected compensation. Shown to recruiters when you apply.
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
      </div>
    </AppPage>
  );
}
