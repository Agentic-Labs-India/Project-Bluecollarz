"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneNumberInput } from "@/components/candidate/phone-number-input";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { listCountries } from "@/lib/geo/places";
import {
  COMPANY_SIZES,
  RECRUITER_INDUSTRIES,
} from "@/lib/recruiter-inquiries/types";

export function RecruiterAccessForm() {
  const countries = useMemo(() => listCountries(), []);
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState<number | null>(91);
  const [phoneNumber, setPhoneNumber] = useState<number | null>(null);
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("India");
  const [companySize, setCompanySize] = useState("");
  const [website, setWebsite] = useState("");
  const [about, setAbout] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (phoneCountryCode == null || phoneNumber == null) {
      setError("Phone number is required");
      return;
    }
    if (!industry || !companySize) {
      setError("Industry and team size are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/recruiter-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName,
          companyName,
          email,
          phoneCountryCode,
          phoneNumber,
          industry,
          country,
          companySize,
          website,
          about,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not submit request");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="bg-primary relative space-y-3 overflow-hidden border border-white/15 p-6">
        <PrimaryDither seed="recruiter-access-done" opacity={0.7} />
        <div className="relative z-10">
          <p className="text-base font-semibold text-white">Request received</p>
          <p className="mt-1 text-sm leading-relaxed text-white/75">
            Thanks — we have your company details. Our team will review and reply
            with recruiter onboarding steps if approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-primary relative space-y-5 overflow-hidden border border-white/15 p-6"
    >
      <PrimaryDither seed="recruiter-access-form" opacity={0.7} />
      <div className="relative z-10 space-y-5 [&_label]:text-white">
        <div>
          <p className="text-base font-semibold text-white">
            Company information
          </p>
          <p className="mt-1 text-sm text-white/75">
            Submit once — we review requests and provision hire access from the
            admin panel.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactName">Your name</Label>
            <Input
              id="contactName"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Full name"
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Legal company name"
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Phone</Label>
            <PhoneNumberInput
              countryCode={phoneCountryCode}
              number={phoneNumber}
              defaultIso="IN"
              onChange={({ phoneCountryCode: cc, phoneNumber: n }) => {
                setPhoneCountryCode(cc);
                setPhoneNumber(n);
              }}
              className="[&_[data-slot=select-trigger]]:bg-white [&_input]:bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Industry</Label>
            <Select value={industry || undefined} onValueChange={setIndustry}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {RECRUITER_INDUSTRIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Team size</Label>
            <Select
              value={companySize || undefined}
              onValueChange={setCompanySize}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select team size" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size} employees
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select value={country || undefined} onValueChange={setCountry}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="about">About your company</Label>
            <Textarea
              id="about"
              required
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="What you hire for, locations, and approximate volume…"
              className="bg-white"
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-md bg-white/95 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="bg-white text-primary hover:bg-white/90"
        >
          {submitting ? "Submitting…" : "Request access"}
        </Button>
      </div>
    </form>
  );
}
