"use client";

import { useEffect, useState } from "react";
import styles from "./job-posting-page.module.css";

interface JobPostingPageClientProps {
  children: React.ReactNode;
  applyUrl?: string | null;
  postTitle?: string;
}

export default function JobPostingPageClient({
  children,
  applyUrl,
  postTitle = "Job Post",
}: JobPostingPageClientProps) {
  const [showStickyButton, setShowStickyButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky button after scrolling past hero (roughly 600px)
      const scrolled = window.scrollY > 600;
      setShowStickyButton(scrolled && !!applyUrl);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [applyUrl]);

  return (
    <>
      {children}

      {/* Sticky Apply Button (Phase 1 - appears on scroll) */}
      {applyUrl && (
        <div className={`${styles.stickyApplyButton} ${showStickyButton ? styles.visible : ""}`}>
          <a href={applyUrl} target="_blank" rel="noopener noreferrer">
            Apply on official portal →
          </a>
        </div>
      )}

      {/* Mobile Jump Menu (Phase 1 - mobile only) */}
      <div className={styles.mobileJumpMenu}>
        <a href="#apply">How to Apply</a>
        <a href="#dates">Important Dates</a>
        <a href="#posts">Related Posts</a>
      </div>
    </>
  );
}
