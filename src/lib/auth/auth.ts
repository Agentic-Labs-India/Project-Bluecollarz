import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import client, { DB_NAME, COLLECTIONS } from "@/lib/db";
import { cascadeDeleteUserData } from "@/lib/user/delete-cascade";
import { consumeUserProvision } from "@/lib/admin/provisions";

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
        defaultValue: true,
        input: false,
      },
      notificationsEnabled: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      /** DigiLocker identity verified — set by KYC callback, not client-writable. */
      isKycVerified: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        if (!user.id) return;
        await cascadeDeleteUserData(user.id);
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
          const email = (user.email ?? "").toLowerCase().trim();
          const provisioned = email ? await consumeUserProvision(email) : null;
          return {
            data: {
              ...user,
              // Organic Google signups are candidates; admin invites win when present.
              profileType: provisioned ?? "work",
              cookiesEnabled: false,
              notificationsEnabled: true,
            },
          };
        },
      },
    },
  },
  plugins: [nextCookies()],
});
