import { NotFoundContent } from "@/components/not-found-content";

// Shown when a page in this tree calls notFound(). Rendered inside this
// tree's root layout, so it keeps the header, footer and page language.
export default function NotFound() {
  return <NotFoundContent />;
}
