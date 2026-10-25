import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { cookies } from "next/headers";
import { transact } from "@/lib/store";
import { makeUser } from "@/lib/domain";

export const { handlers, auth } = NextAuth({
  trustHost: true,
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({ authorization: { params: { prompt: "select_account" } } })]
      : []),
    ...(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
      ? [Facebook]
      : []),
  ],
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/explore", error: "/explore" },
  events: {
    async signIn() {
      // A successful provider callback must leave any earlier demo identity.
      (await cookies()).delete("questgo-demo");
    },
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.appUserId = await transact(false, (state) => {
          const providerKey = `${account.provider}:${account.providerAccountId}`;
          let person = state.users.find(
            (entry) => entry.providerKey === providerKey,
          );
          if (!person) {
            person = makeUser(
              providerKey,
              (user.name || "Explorer").slice(0, 32),
            );
            state.users.push(person);
          }
          return person.id;
        });
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.appUserId === "string")
        session.user.id = token.appUserId;
      return session;
    },
  },
});
