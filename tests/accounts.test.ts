import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  registerAccount,
  signInAccount,
  readLoginSession,
  revokeLoginSession,
  recoverAccount,
} from "../src/lib/accounts";
import { transact } from "../src/lib/store";
import { SESSION_LIFETIME } from "../src/lib/accounts";
import { hashPassword, verifyPassword } from "../src/lib/passwords";
process.env.QUESTGO_STORAGE = "sqlite";
process.env.QUESTGO_DATA_DIR = mkdtempSync(
  path.join(tmpdir(), "questgo-accounts-"),
);
process.env.DATABASE_URL = "postgresql://unreachable.invalid/unused";
const password = "a long private test password";
test("passwords use distinct salts and never compare as plaintext", async () => {
  const a = await hashPassword(password),
    b = await hashPassword(password);
  assert.notEqual(a, b);
  assert.ok(!a.includes(password));
  assert.equal(await verifyPassword(password, a), true);
  assert.equal(await verifyPassword("wrong", a), false);
  assert.equal(await verifyPassword(password, "malformed"), false);
});
test("local accounts persist separately from demos; duplicate emails cannot replace an account", async () => {
  const attempts = await Promise.allSettled(
    ["Alice@example.com", "alice@example.com"].map((email) =>
      registerAccount({ email, password, displayName: "Alice" }),
    ),
  );
  assert.equal(attempts.filter((a) => a.status === "fulfilled").length, 1);
  const winner = attempts.find((a) => a.status === "fulfilled")!;
  assert.equal(winner.value.recoveryCode.length, 43);
  const token = await signInAccount({ email: " ALICE@EXAMPLE.COM ", password });
  const userId = await readLoginSession(token);
  assert.ok(userId);
  const saved = await transact(false, async (state, query) => {
    const [account] = await query(
      "SELECT password_hash,recovery_hash FROM questgo_password_accounts WHERE user_id=$1",
      [userId],
    );
    assert.notEqual(account.password_hash, password);
    assert.notEqual(account.recovery_hash, winner.value.recoveryCode);
    assert.ok(!JSON.stringify(state).includes(password));
    return state.users.find((u) => u.id === userId);
  });
  assert.equal(saved!.displayName, "Alice");
  assert.equal((await transact(true, (state) => state.users)).length, 0);
  assert.equal(
    await readLoginSession(token, Date.now() + SESSION_LIFETIME + 100),
    undefined,
  );
  await revokeLoginSession(token);
  assert.equal(await readLoginSession(token), undefined);
  await assert.rejects(
    signInAccount({ email: "alice@example.com", password: "wrong" }),
    { message: "Email or password is incorrect." },
  );
  await assert.rejects(
    signInAccount({ email: "missing@example.com", password: "wrong" }),
    { message: "Email or password is incorrect." },
  );
});
test("recovery code rotates, revokes previous sessions and keeps other accounts separate", async () => {
  const registration = await registerAccount({
    email: "bob@example.com",
    password,
    displayName: "Bob",
  });
  const bob = await signInAccount({ email: "bob@example.com", password });
  const alice = await signInAccount({ email: "alice@example.com", password });
  assert.notEqual(await readLoginSession(bob), await readLoginSession(alice));
  const nextPassword = "another long private test password";
  await assert.rejects(
    recoverAccount({
      email: "bob@example.com",
      password: nextPassword,
      recoveryCode: "x".repeat(43),
    }),
  );
  assert.ok(await readLoginSession(bob));
  const recovered = await recoverAccount({
    email: "bob@example.com",
    password: nextPassword,
    recoveryCode: registration.recoveryCode,
  });
  assert.notEqual(recovered.recoveryCode, registration.recoveryCode);
  assert.equal(await readLoginSession(bob), undefined);
  assert.ok(await readLoginSession(alice));
  await assert.rejects(signInAccount({ email: "bob@example.com", password }));
  await assert.rejects(
    recoverAccount({
      email: "bob@example.com",
      password,
      recoveryCode: registration.recoveryCode,
    }),
  );
  assert.ok(
    await readLoginSession(
      await signInAccount({ email: "bob@example.com", password: nextPassword }),
    ),
  );
});
