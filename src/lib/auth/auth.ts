import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { consumeUserProvision } from "@/lib/admin/provisions";
import { LegalHoldError } from "@/lib/compliance/legal-hold";
import client, { COLLECTIONS, DB_NAME } from "@/lib/db";
import { cascadeDeleteUserData } from "@/lib/user/delete-cascade";

const APP_NAME = "Blucollarz";

export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: process.env.BETTER_AUTH_URL,
  database: mongodbAdapter(client.db(DB_NAME)),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 200,
    customRules: {
      "/get-session": false,
    },
  },
  user: {
    modelName: COLLECTIONS.USERS_COLLECTION,
    additionalFields: {
      phoneNumber: {
        type: "number",
        required: false,
      },
      phoneCountryCode: {
        type: "number",
        required: false,
      },
      profileType: {
        type: "string",
        required: false,
        defaultValue: "work",
        // Not client-writable — hire/admin are provisioned via admin console.
        input: false,
      },
      cookiesEnabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      notificationsEnabled: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      platformTermsVersion: {
        type: "number",
        required: false,
        input: false,
      },
      platformTermsAcceptedAt: {
        type: "date",
        required: false,
        input: false,
      },
      /** DigiLocker identity verified — set by KYC callback, not client-writable. */
      isKycVerified: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      /** Unique DigiLocker user id. Candidate login key. */
      digilockerId: {
        type: "string",
        required: false,
        input: false,
      },
      /** Onboarding “currently working as” — shown in the account menu. */
      headline: {
        type: "string",
        required: false,
        input: false,
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        if (!user.id) return;
        try {
          await cascadeDeleteUserData(user.id);
        } catch (error) {
          if (error instanceof LegalHoldError) {
            throw new APIError("CONFLICT", { message: error.message });
          }
          throw error;
        }
      },
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const extra = user as Record<string, unknown>;
          const rawId =
            typeof extra.digilockerId === "string"
              ? extra.digilockerId.trim()
              : "";
          if (rawId) {
            return {
              data: {
                ...user,
                digilockerId: rawId,
                profileType: "work",
                cookiesEnabled: false,
                notificationsEnabled: true,
              },
            };
          }

          const email = (user.email ?? "").toLowerCase().trim();
          if (!email) {
            throw new APIError("BAD_REQUEST", {
              message: "Google account has no email.",
            });
          }
          const provisioned = await consumeUserProvision(email);
          if (!provisioned) {
            throw new APIError("FORBIDDEN", {
              message:
                "Google sign-in is for recruiters and admins. Candidates sign in with DigiLocker.",
            });
          }
          return {
            data: {
              ...user,
              profileType: provisioned,
              cookiesEnabled: false,
              notificationsEnabled: true,
            },
          };
        },
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const provider =
        (ctx.params as { id?: string } | undefined)?.id ||
        ctx.path.split("/").pop();
      const isGoogleCallback =
        provider === "google" &&
        (ctx.path === "/callback/:id" ||
          ctx.path === "/callback/google" ||
          ctx.path.startsWith("/callback/"));
      if (!isGoogleCallback) return;

      const sessionUser = (ctx.context.newSession?.user ??
        ctx.context.session?.user) as
        | { id?: string; profileType?: string }
        | undefined;
      if (!sessionUser) return;
      if (
        sessionUser.profileType === "hire" ||
        sessionUser.profileType === "admin"
      ) {
        return;
      }
      if (sessionUser.id) {
        await ctx.context.internalAdapter.deleteSessions(sessionUser.id);
      }
      throw new APIError("FORBIDDEN", {
        message:
          "Google sign-in is for recruiters and admins. Candidates sign in with DigiLocker.",
      });
    }),
  },
  plugins: [nextCookies()],
});
