"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Drop-in replacement for a plain <button> inside a <form action={...}>
 * (Server Action) form — disables itself and swaps its label while the
 * action is in flight, so clicking it twice doesn't double-submit and the
 * person gets visible feedback that something is happening. Per
 * node_modules/next/dist/docs/01-app/02-guides/forms.md, useFormStatus
 * must live in a component nested under the <form>, not the page itself —
 * that's the only reason this is its own component rather than inline.
 */
export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText ?? "Working…" : children}
    </button>
  );
}
