import assert from "node:assert/strict";
import test from "node:test";
import {
  alreadyMemberMessage,
  checkCode,
  checkEmail,
  formatDateTime,
  inviteErrorMessage,
  isMemberRole,
  isUuid,
  PENDING_INVITE_MESSAGE,
  rolesInviterCanGrant,
  youAre,
} from "../modules/core/rules.ts";

test("checkEmail normalizes and validates", () => {
  assert.deepEqual(checkEmail("  Dono@Restaurante-X.test "), {
    ok: true,
    value: "dono@restaurante-x.test",
  });
  assert.equal(checkEmail("").ok, false);
  assert.equal(checkEmail(undefined).ok, false);
  assert.equal(checkEmail("dono@restaurante").ok, false);
  assert.equal(checkEmail("dono restaurante@x.test").ok, false);
  assert.equal(checkEmail(`${"a".repeat(250)}@x.test`).ok, false);
});

test("checkCode accepts 6 digits, spaces ignored", () => {
  assert.deepEqual(checkCode("123 456"), { ok: true, value: "123456" });
  assert.equal(checkCode("12345").ok, false);
  assert.equal(checkCode("1234567").ok, false);
  assert.equal(checkCode("12a456").ok, false);
  assert.match(checkCode("1").message, /6 números/);
});

test("roles an inviter can grant mirror the database policy", () => {
  assert.deepEqual(rolesInviterCanGrant("owner"), [
    "owner",
    "admin",
    "manager",
    "chef",
  ]);
  assert.deepEqual(rolesInviterCanGrant("admin"), ["admin", "manager", "chef"]);
  assert.deepEqual(rolesInviterCanGrant("manager"), []);
  assert.deepEqual(rolesInviterCanGrant("chef"), []);
});

test("an e-mail that is already a member gets a message with the current role", () => {
  assert.equal(
    alreadyMemberMessage("manager"),
    "Esse e-mail já faz parte da equipe como gerente. O convite não muda o papel.",
  );
  // The database error from the trigger carries the role in `details`.
  assert.equal(
    inviteErrorMessage({
      code: "23505",
      message: "this e-mail is already a member of this company",
      details: "owner",
    }),
    "Esse e-mail já faz parte da equipe como dono. O convite não muda o papel.",
  );
});

test("invite database errors become messages that say what to do", () => {
  assert.equal(
    inviteErrorMessage({
      code: "23505",
      message:
        "a pending invite already exists for this e-mail in this company",
    }),
    PENDING_INVITE_MESSAGE,
  );
  assert.match(inviteErrorMessage({ code: "42501" }), /Só o dono convida/);
  assert.match(inviteErrorMessage({ code: "XX000" }), /tente de novo/);
});

test("labels and small checks", () => {
  assert.equal(youAre("owner"), "você é dono");
  assert.equal(youAre("admin"), "você é administrador");
  assert.equal(isMemberRole("chef"), true);
  assert.equal(isMemberRole("cook"), false);
  assert.equal(isUuid("aaaaaaaa-0000-0000-0000-000000000001"), true);
  assert.equal(isUuid("../etc"), false);
  assert.equal(formatDateTime("2026-11-28T17:05:00Z"), "28/11 às 14:05");
});
