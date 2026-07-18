import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getOAuthState } from "better-auth/api";
import client, { DB_NAME, COLLECTIONS } from "@/lib/db";
import { normalizeProfileType } from "@/lib/profile-types";
import { cascadeDeleteUserData } from "@/lib/user/delete-cascade";

const APP_NAME = "Gulf Path";

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
        type: "string",
        required: false,
      },
      profileType: {
        type: "string",
        required: false,
        defaultValue: "work",
        input: true,
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
          const state = await getOAuthState();
          const profileType =
            (state as { profileType?: string } | null)?.profileType ??
            (state as { additionalData?: { profileType?: string } } | null)
              ?.additionalData?.profileType;

          return {
            data: {
              ...user,
              ...(profileType
                ? { profileType: normalizeProfileType(profileType) }
                : {}),
              cookiesEnabled: true,
              notificationsEnabled: true,
            },
          };
        },
      },
    },
  },
  plugins: [nextCookies()],
});
