import Link from "next/link";

const NAV_LINKS = [
  { href: "/jobs?kind=GOVERNMENT", label: "Govt Jobs" },
  { href: "/jobs?kind=PRIVATE", label: "Private Jobs" },
  { href: "/categories", label: "Categories" },
  { href: "/articles", label: "Guides & Articles" },
];

export function Header() {
  return (
    <header className="border-b border-black/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          RojgarSetu
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
