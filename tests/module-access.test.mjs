import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCESS_MESSAGES,
  decideAccess,
  MODULES,
  moduleHref,
  modulesFor,
} from "../lib/modules/access.ts";
import { MEMBER_ROLES } from "../modules/core/types.ts";

// Who may open what. Written out by hand on purpose, so a change in the
// registry has to be reflected here too.
const EXPECTED = {
  "core.invites": {
    owner: "allow",
    admin: "allow",
    manager: "wrong-role",
    chef: "wrong-role",
  },
};

test("the registry and the expected table cover the same modules", () => {
  assert.deepEqual(
    MODULES.map((entry) => entry.id).sort(),
    Object.keys(EXPECTED).sort(),
  );
});

for (const entry of MODULES) {
  for (const role of MEMBER_ROLES) {
    test(`decideAccess(${role}, ${entry.id}) is ${EXPECTED[entry.id][role]}`, () => {
      assert.equal(decideAccess(role, entry.id), EXPECTED[entry.id][role]);
    });
  }

  test(`decideAccess(null, ${entry.id}) is not-member`, () => {
    assert.equal(decideAccess(null, entry.id), "not-member");
  });
}

test("an unknown module is refused, never allowed", () => {
  for (const role of MEMBER_ROLES) {
    assert.equal(decideAccess(role, "core.everything"), "wrong-role");
  }
  assert.equal(decideAccess(null, "core.everything"), "not-member");
});

test("the home per role lists only the modules that role may open", () => {
  assert.deepEqual(
    modulesFor("owner").map((entry) => entry.id),
    ["core.invites"],
  );
  assert.deepEqual(
    modulesFor("admin").map((entry) => entry.id),
    ["core.invites"],
  );
  assert.deepEqual(modulesFor("manager"), []);
  assert.deepEqual(modulesFor("chef"), []);
});

test("module links live under the company", () => {
  const invites = MODULES.find((entry) => entry.id === "core.invites");
  assert.equal(
    moduleHref(invites, "aaaaaaaa-0000-0000-0000-000000000001"),
    "/empresa/aaaaaaaa-0000-0000-0000-000000000001/convites",
  );
});

test("friendly messages are in Portuguese and carry no error code", () => {
  assert.equal(
    ACCESS_MESSAGES["not-member"],
    "Esse link não é de uma empresa sua. Volte para o início.",
  );
  assert.equal(
    ACCESS_MESSAGES["wrong-role"],
    "Essa tela é do dono e do administrador. Se precisar dela, fale com o dono.",
  );
  for (const message of Object.values(ACCESS_MESSAGES)) {
    assert.doesNotMatch(message, /\d{3}|erro|error/i);
  }
});
