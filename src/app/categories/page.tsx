import type { Metadata } from "next";
import { listCategories } from "@/lib/queries";
import { CategoriesContent } from "@/components/categories-content";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Job Categories",
  description:
    "Browse government and private job openings by category, sector, and state.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  try {
    categories = await listCategories();
  } catch {
    categories = [];
  }
  // Rendering (including which language to show) lives in CategoriesContent,
  // a client component that reads the visitor's saved language cookie —
  // keeps this page a plain static/ISR server component (○ Static), same
  // reasoning as src/app/page.tsx / home-content.tsx.
  return <CategoriesContent categories={categories} />;
}
