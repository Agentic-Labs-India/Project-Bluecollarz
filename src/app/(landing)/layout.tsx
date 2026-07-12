import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";

/** Shared landing chrome — navbar + footer for all public marketing pages. */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas min-h-screen text-foreground antialiased">
      <LandingNav />
      {children}
      <div className="mx-auto w-full max-w-[1600px] px-6 duration-300 md:px-8 lg:px-14">
        <LandingFooter />
      </div>
    </div>
  );
}
