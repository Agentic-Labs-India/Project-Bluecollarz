import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NativeAuthScreen } from "@/components/auth/native-auth-screen";
import { isNativeUserAgent } from "@/lib/native/platform";

export const metadata: Metadata = {
  title: "Sign in — Blucollarz",
  robots: { index: false, follow: false },
};

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <NativeAuthGate />
    </Suspense>
  );
}

async function NativeAuthGate() {
  const userAgent = (await headers()).get("user-agent");
  if (!isNativeUserAgent(userAgent)) {
    redirect("/");
  }

  return <NativeAuthScreen />;
}
