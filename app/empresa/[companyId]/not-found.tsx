import { NotMemberPage } from "@/lib/modules/AccessPages";

// Shown by notFound() in any /empresa/[companyId] page: not a member, or the
// company does not exist (the same page for both).
export default function CompanyNotFound() {
  return <NotMemberPage />;
}
