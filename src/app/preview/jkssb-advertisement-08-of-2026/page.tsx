import { redirect } from "next/navigation";

// Keep the original review URL usable while routing testing moves to the
// normal recruitment-hub URL contract.
export default function JkssbPreviewRedirect() {
  redirect("/jobs/jkssb-advertisement-08-of-2026");
}
