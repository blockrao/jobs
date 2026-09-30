import type { Metadata } from "next";
import Link from "next/link";
import { listCategories } from "@/lib/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Job Categories",
  description:
    "Browse government and private job openings by category, sector, and state.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await listCategories();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/categories/${category.slug}`}
              className="block rounded-md border border-black/10 px-4 py-3 hover:border-black/30"
            >
              <span className="font-medium">{category.name}</span>
              {category.description && (
                <p className="text-sm text-neutral-600">
                  {category.description}
                </p>
              )}
            </Link>
          </li>
        ))}
        {categories.length === 0 && (
          <li className="text-sm text-neutral-500">No categories yet.</li>
        )}
      </ul>
    </div>
  );
}
