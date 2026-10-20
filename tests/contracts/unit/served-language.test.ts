/**
 * Language of the server-rendered document (SEO-001 step 3).
 *
 * The one root layout is rendered to HTML with the page chrome
 * (header, footer, analytics, navigation progress) replaced by stubs, so the
 * assertions are about the document the server sends: one <html>, its lang,
 * one shell.
 */
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("@fontsource-variable/inter", () => ({}));
vi.mock("@fontsource-variable/inter/wght-italic.css", () => ({}));
vi.mock("@/app/globals.css", () => ({}));
vi.mock("@/components/header", () => ({ Header: () => createElement("header", null, "header") }));
vi.mock("@/components/footer", () => ({ Footer: () => createElement("footer", null, "footer") }));
vi.mock("@/components/analytics-tracker", () => ({ AnalyticsTracker: () => null }));
vi.mock("@/components/listing-language-assist", () => ({
  ListingLanguageAssist: () => createElement("i", { "data-listing-language-assist": "" }),
}));
vi.mock("@/components/intl-provider", () => ({
  IntlProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/navigation-progress", () => ({
  NavigationProgressProvider: ({ children }: { children: ReactNode }) => children,
}));

// Server components are async functions: resolve them depth-first into plain
// elements so the synchronous renderer can produce the HTML.
async function resolve(node: unknown): Promise<unknown> {
  if (Array.isArray(node)) return Promise.all(node.map(resolve));
  if (!node || typeof node !== "object" || !("type" in node)) return node;
  const el = node as { type: unknown; props: Record<string, unknown> };
  if (typeof el.type === "function") {
    return resolve(await (el.type as (p: unknown) => unknown)(el.props));
  }
  const children = await resolve(el.props.children);
  return { ...el, props: { ...el.props, children } };
}

async function htmlOf(tree: unknown): Promise<string> {
  return renderToStaticMarkup((await resolve(tree)) as never);
}

const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const page = createElement("main", null, "page");

describe("served document language", () => {
  // LOC-06/LOC-07 (locale root layout) were retired with the locale prefix
  // (URL contract 2026-10-20): there is one root layout and it serves English.
  test("LOC-08 the unprefixed root layout serves <html lang=en>, one shell, with the listing assist", async () => {
    const mod = await import("@/app/(default)/layout");
    const html = await htmlOf(mod.default({ children: page }));
    expect(html).toMatch(/^<html lang="en"/);
    expect(count(html, /<html/g)).toBe(1);
    expect(count(html, /<header/g)).toBe(1);
    expect(count(html, /<footer/g)).toBe(1);
    expect(count(html, /data-listing-language-assist/g)).toBe(1);
  });
});
