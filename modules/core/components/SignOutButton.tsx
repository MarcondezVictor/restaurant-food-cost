import { signOut } from "../actions.ts";
import { secondaryButtonClass } from "./ui.tsx";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className={secondaryButtonClass}>
        Sair
      </button>
    </form>
  );
}
