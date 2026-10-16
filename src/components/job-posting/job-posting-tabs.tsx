"use client";

import { useState, useEffect } from "react";
import styles from "./job-posting-page.module.css";

export type TabId = "quick" | "apply" | "details" | "dates" | "related";

// Tab section mapping for CSS-based visibility
const TAB_SECTIONS: Record<TabId, string[]> = {
  quick: ["quick"],
  apply: ["apply"],
  details: [
    "role-details",
    "eligibility",
    "vacancies",
    "salary",
    "selection",
    "documents-enriched",
  ],
  dates: ["dates"],
  related: ["other"],
};

interface JobPostingTabsProps {
  children: React.ReactNode;
  defaultTab?: TabId;
}

export default function JobPostingTabs({
  children,
  defaultTab = "quick",
}: JobPostingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [mounted, setMounted] = useState(false);

  // Load saved preference from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("jobPostingActiveTab") as TabId | null;
      if (saved && ["quick", "apply", "details", "dates", "related"].includes(saved)) {
        setActiveTab(saved);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Control section visibility via CSS
  useEffect(() => {
    if (!mounted) return;

    // Hide all sections first
    document.querySelectorAll(`.${styles.section}`).forEach((section) => {
      const id = section.id;
      const shouldShow = TAB_SECTIONS[activeTab]?.includes(id);
      (section as HTMLElement).style.display = shouldShow ? "" : "none";
      (section as HTMLElement).style.opacity = shouldShow ? "1" : "0";
    });
  }, [activeTab, mounted]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    try {
      localStorage.setItem("jobPostingActiveTab", tab);
    } catch {
      // localStorage not available
    }
  };

  if (!mounted) return <>{children}</>;

  return (
    <>
      {/* Tab Navigation */}
      <nav className={styles.tabNavigation} aria-label="Content tabs">
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tab} ${activeTab === "quick" ? styles.tabActive : ""}`}
            onClick={() => handleTabChange("quick")}
            aria-selected={activeTab === "quick"}
            type="button"
          >
            Quick Facts
          </button>
          <button
            className={`${styles.tab} ${activeTab === "apply" ? styles.tabActive : ""}`}
            onClick={() => handleTabChange("apply")}
            aria-selected={activeTab === "apply"}
            type="button"
          >
            How to Apply
          </button>
          <button
            className={`${styles.tab} ${activeTab === "details" ? styles.tabActive : ""}`}
            onClick={() => handleTabChange("details")}
            aria-selected={activeTab === "details"}
            type="button"
          >
            Details
          </button>
          <button
            className={`${styles.tab} ${activeTab === "dates" ? styles.tabActive : ""}`}
            onClick={() => handleTabChange("dates")}
            aria-selected={activeTab === "dates"}
            type="button"
          >
            Important Dates
          </button>
          <button
            className={`${styles.tab} ${activeTab === "related" ? styles.tabActive : ""}`}
            onClick={() => handleTabChange("related")}
            aria-selected={activeTab === "related"}
            type="button"
          >
            Related Roles
          </button>
        </div>
      </nav>

      {/* Tab Content - sections managed via CSS visibility */}
      <div className={styles.tabContent} data-active-tab={activeTab}>
        {children}
      </div>
    </>
  );
}
