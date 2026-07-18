import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/auth/login-button";
import {
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";
import { auth } from "@/lib/auth/auth";
import {
  getProfileHomePath,
  getProfileIdLabel,
  normalizeProfileType,
} from "@/lib/profile-types";

export const metadata = {
  title: "Log in · BlueCollarz",
  description: "Sign in to BlueCollarz with Google.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ profileType?: string }>;
}) {
  const { profileType: rawProfileType } = await searchParams;
  const profileType = normalizeProfileType(rawProfileType);
  const profileLabel = getProfileIdLabel(profileType);

  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    const existing = normalizeProfileType(
      (session.user as { profileType?: string }).profileType,
    );
    redirect(getProfileHomePath(existing));
  }

  return (
    <MarketingPage
      eyebrow="Account"
      title={`${profileLabel} login`}
      description={`Sign in with Google to open your ${profileLabel.toLowerCase()} workspace.`}
    >
      <MarketingSection title="Continue with Google">
        <p>
          Use the same Google account that was invited for this profile type.
        </p>
        <div className="pt-2">
          <LoginButton
            profileType={profileType}
            className="bg-primary text-primary-foreground hover:bg-primary-active inline-flex items-center justify-center rounded-md px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Continue with Google
          </LoginButton>
        </div>
      </MarketingSection>
    </MarketingPage>
  );
}
