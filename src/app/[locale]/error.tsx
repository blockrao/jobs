"use client";

// Same error boundary as the unprefixed tree. Each root layout needs its own
// error.tsx because there is no layout above them to hold a shared one.
export { default } from "@/app/(default)/error";
