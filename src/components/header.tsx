import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const NAV_LINKS = [
  { href: "/jobs", label: "All Jobs" },
  { href: "/exams", label: "By Exam" },
  { href: "/news", label: "News" },
  { href: "/articles", label: "Guides" },
];

export function Header() {
  return (
    <header className="border-b border-black/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          {SITE_NAME}
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-neutral-700 hover:text-black hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
