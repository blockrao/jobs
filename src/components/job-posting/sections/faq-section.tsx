/**
 * FAQ Section Component
 *
 * Displays 8 auto-generated frequently asked questions derived from enrichment data.
 * Shares the same Q&A generation logic with faq-page-schema.tsx for consistency.
 *
 * Questions cover: age limit, qualifications, fee, vacancies, salary, deadline, experience, selection
 */

import { JobPostingData } from "@/types/job-posting";
import { generateFAQs } from "../structured-data/faq-page-schema";
import styles from "./faq-section.module.css";

interface FAQSectionProps {
  post: JobPostingData;
  embedded?: boolean;
}

export default function FAQSection({ post, embedded = false }: FAQSectionProps) {
  const faqs = generateFAQs({ post });

  if (!faqs || faqs.length === 0) {
    return null;
  }

  return (
    <section className={styles.faqSection}>
      <div className={styles.header}>
        <h2 className={styles.title}>Frequently Asked Questions</h2>
        <p className={styles.subtitle}>
          Common questions from candidates applying for this position
        </p>
      </div>

      <div className={styles.faqList}>
        {faqs.map((faq, idx) => (
          <FAQItem key={idx} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </section>
  );
}

/**
 * Individual FAQ Item with Accordion UI
 */
interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={`${styles.faqItem} ${isOpen ? styles.open : ""}`}>
      <button
        className={styles.faqQuestion}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={styles.questionText}>{question}</span>
        <span className={styles.toggleIcon}>
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className={styles.faqAnswer}>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

// Import React for useState
import React from "react";
