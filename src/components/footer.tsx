import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-black/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-neutral-600">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}. Job and exam information
          is aggregated for informational purposes — always verify against
          the official notification before applying.
        </p>
        <div className="flex flex-wrap gap-x-4">
          <Link href="/jobs" className="hover:underline">
            All Jobs
          </Link>
          <Link href="/categories" className="hover:underline">
            Categories
          </Link>
          <Link href="/articles" className="hover:underline">
            Articles
          </Link>
        </div>
      </div>
    </footer>
  );
}
