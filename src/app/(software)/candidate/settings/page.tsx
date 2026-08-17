"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { AppLanguageSetting } from "@/components/candidate/app-language-setting";
import { DataRightsSection } from "@/components/compliance/data-rights-section";
import { PrivacyTermsAcknowledgment } from "@/components/compliance/privacy-terms-acknowledgment";
import { AppPage } from "@/components/layout/app-page";
import { DeleteAccountSection } from "@/components/shared/delete-account-section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function CandidateSettingsPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <AppPage>
      <h1 className="text-foreground mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
        Settings
      </h1>

      <section className="border-border/80 bg-card divide-border/60 mb-6 divide-y rounded-none border shadow-sm">
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <Label className="text-foreground text-sm font-medium">
              Appearance
            </Label>
            <p className="text-muted-foreground mt-1 text-sm">
              Switch between light and dark mode.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-40 shrink-0"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? (
              <SunIcon className="size-4" />
            ) : (
              <MoonIcon className="size-4" />
            )}
            {isDark ? "Light mode" : "Dark mode"}
          </Button>
        </div>

        <div className="p-5">
          <AppLanguageSetting />
        </div>
      </section>

      <section className="border-border/80 bg-card mb-6 rounded-none border px-5 shadow-sm">
        <Accordion type="multiple">
          <AccordionItem value="privacy">
            <AccordionTrigger className="hover:no-underline">
              <span className="block">
                <span className="text-foreground block text-sm font-medium">
                  Privacy &amp; terms
                </span>
                <span className="text-muted-foreground mt-1 block text-sm font-normal">
                  Platform notices and DigiLocker purpose consent.
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-foreground">
              <PrivacyTermsAcknowledgment showConsentPanel />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="rights">
            <AccordionTrigger className="hover:no-underline">
              <span className="block">
                <span className="text-foreground block text-sm font-medium">
                  Data rights
                </span>
                <span className="text-muted-foreground mt-1 block text-sm font-normal">
                  Access, correction, erasure, withdraw consent, or grievance.
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-foreground">
              <DataRightsSection />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section
        id="delete-account"
        className="border-destructive/20 bg-card rounded-none border p-5 shadow-sm"
      >
        <p className="text-destructive mb-4 text-xs font-medium tracking-wide uppercase">
          Danger zone
        </p>
        <DeleteAccountSection profileType="work" />
      </section>
    </AppPage>
  );
}
