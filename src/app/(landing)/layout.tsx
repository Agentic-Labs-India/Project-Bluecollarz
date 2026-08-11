import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";

/** Shared landing chrome — navbar + footer for all public marketing pages. */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas text-foreground min-h-screen overflow-x-clip antialiased">
      <LandingNav />
      {children}
      <LandingFooter />
    </div>
  );
}
