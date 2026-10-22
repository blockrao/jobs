/**
 * FAQPage Schema Component
 *
 * Renders FAQPage structured data for pages with FAQ sections
 * Helps Google display FAQ rich snippets in search results
 *
 * Usage:
 * const faqs = [
 *   { question: "How do I apply?", answer: "Visit the official..." },
 *   { question: "What's the deadline?", answer: "Applications close..." },
 * ];
 * return <FAQPageSchema faqs={faqs} />;
 */

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQPageSchemaProps {
  faqs: FAQItem[];
}

export default function FAQPageSchema({ faqs }: FAQPageSchemaProps) {
  if (!faqs || faqs.length === 0) {
    return null;
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}
