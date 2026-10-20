"use client";

/**
 * Pillar Content Renderer
 *
 * Reads markdown pillar content from filesystem during SSR
 * Uses react-markdown for conversion to HTML
 */

import React, { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { promises as fs } from "fs";
import path from "path";

interface PillarContentRendererProps {
  slug: string;
}

async function PillarContentRendererAsync({ slug }: PillarContentRendererProps) {
  try {
    // Read markdown file from public folder during SSR
    const filePath = path.join(process.cwd(), "public", "content", "pillars", `${slug}.md`);
    const markdown = await fs.readFile(filePath, "utf-8");

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
            p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-1" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-1" {...props} />,
            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
            strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
            em: ({ node, ...props }) => <em className="italic" {...props} />,
            code: ({ node, ...props }) => (
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono" {...props} />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4" {...props} />
            ),
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead className="bg-gray-100 dark:bg-gray-800" {...props} />
            ),
            th: ({ node, ...props }) => (
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-bold" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" {...props} />
            ),
            a: ({ node, href, ...props }) => (
              <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
            ),
            hr: () => <hr className="my-6 border-t border-gray-300 dark:border-gray-600" />,
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.error(`Failed to load pillar content for slug: ${slug}`, error);
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">
          Unable to load content. Please try again later.
        </p>
      </div>
    );
  }
}

export default function PillarContentRenderer({ slug }: PillarContentRendererProps) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      }
    >
      <PillarContentRendererAsync slug={slug} />
    </Suspense>
  );
}
