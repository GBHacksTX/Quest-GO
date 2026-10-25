import { randomBytes } from "node:crypto";
import { z } from "zod";
import { AppError, hash, makeUser } from "./domain";
import { hashPassword, verifyPassword } from "./passwords";
import { transact, type Query } from "./store";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(12).max(128);
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export const registrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2).max(32),
});
export const recoverySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  recoveryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{43}$/),
});
export const SESSION_LIFETIME = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = "questgo-session";
export async function registerAccount(
  input: z.infer<typeof registrationSchema>,
) {
  const values = registrationSchema.parse(input);
  const passwordHash = await hashPassword(values.password);
  const recoveryCode = randomBytes(32).toString("base64url");
  return transact(false, async (state, query) => {
    const [existing] = await query(
      "SELECT user_id FROM questgo_password_accounts WHERE email=$1",
      [values.email],
    );
    if (existing)
      throw new AppError(
        "An account with this email already exists. Sign in or use your recovery code.",
        409,
      );
    const user = makeUser(`password:${values.email}`, values.displayName);
    state.users.push(user);
    // The credential FK is written before the repository's final state save.
    await query(
      "INSERT INTO app_users(id,provider_key,data) VALUES($1,$2,$3)",
      [user.id, user.providerKey, JSON.stringify(user)],
    );
    await query(
      "INSERT INTO questgo_password_accounts(user_id,email,password_hash,recovery_hash,version,created_at) VALUES($1,$2,$3,$4,1,$5)",
      [user.id, values.email, passwordHash, hash(recoveryCode), Date.now()],
    );
    return { recoveryCode };
  });
}
export async function insertSession(query: Query, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  await query(
    "INSERT INTO questgo_login_sessions(token_hash,user_id,created_at,expires_at,revoked_at) VALUES($1,$2,$3,$4,NULL)",
    [hash(token), userId, now, now + SESSION_LIFETIME],
  );
  return token;
}
export async function signInAccount(input: z.infer<typeof loginSchema>) {
  const values = loginSchema.parse(input);
  const account = await transact(
    false,
    async (_state, query) =>
      (
        await query(
          "SELECT user_id,password_hash,version FROM questgo_password_accounts WHERE email=$1",
          [values.email],
        )
      )[0],
  );
  if (
    !(await verifyPassword(
      values.password,
      account ? String(account.password_hash) : undefined,
    ))
  )
    throw new AppError("Email or password is incorrect.", 401);
  return transact(false, async (_state, query) => {
    const [current] = await query(
      "SELECT version FROM questgo_password_accounts WHERE user_id=$1",
      [account.user_id],
    );
    if (!current || Number(current.version) !== Number(account.version))
      throw new AppError("Your password changed. Please sign in again.", 401);
    return insertSession(query, String(account.user_id));
  });
}
export async function readLoginSession(token?: string, now = Date.now()) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined;
  return transact(false, async (_state, query) => {
    const [session] = await query(
      "SELECT user_id,expires_at,revoked_at FROM questgo_login_sessions WHERE token_hash=$1",
      [hash(token)],
    );
    if (
      !session ||
      session.revoked_at != null ||
      Number(session.expires_at) <= now
    )
      return undefined;
    return String(session.user_id);
  });
}
export async function revokeLoginSession(token?: string) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await transact(false, async (_state, query) => {
    await query(
      "UPDATE questgo_login_sessions SET revoked_at=$1 WHERE token_hash=$2 AND revoked_at IS NULL",
      [Date.now(), hash(token)],
    );
  });
}
export async function recoverAccount(input: z.infer<typeof recoverySchema>) {
  const values = recoverySchema.parse(input);
  const passwordHash = await hashPassword(values.password);
  const nextCode = randomBytes(32).toString("base64url");
  return transact(false, async (_state, query) => {
    const [account] = await query(
      "SELECT user_id FROM questgo_password_accounts WHERE email=$1 AND recovery_hash=$2",
      [values.email, hash(values.recoveryCode)],
    );
    if (!account)
      throw new AppError("Email or recovery code is incorrect.", 401);
    await query(
      "UPDATE questgo_password_accounts SET password_hash=$1,recovery_hash=$2,version=version+1 WHERE user_id=$3",
      [passwordHash, hash(nextCode), account.user_id],
    );
    await query(
      "UPDATE questgo_login_sessions SET revoked_at=$1 WHERE user_id=$2 AND revoked_at IS NULL",
      [Date.now(), account.user_id],
    );
    return { recoveryCode: nextCode };
  });
}
