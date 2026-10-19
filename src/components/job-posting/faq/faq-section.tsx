import React from 'react';

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQItem[];
  postId: number | string;
  postTitle: string;
}

export default function FAQSection({
  faqs,
  postId,
  postTitle,
}: FAQSectionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  if (!faqs || faqs.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
        Frequently Asked Questions
      </h2>

      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 flex justify-between items-center transition-colors"
            >
              <span className="font-semibold text-gray-900 dark:text-white">
                {faq.question}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {openIndex === idx ? '−' : '+'}
              </span>
            </button>

            {openIndex === idx && (
              <div className="px-4 py-3 bg-white dark:bg-slate-950 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FAQPage Schema for Google rich snippets */}
      <FAQPageSchema faqs={faqs} postTitle={postTitle} postId={postId} />
    </section>
  );
}

interface FAQPageSchemaProps {
  faqs: FAQItem[];
  postTitle: string;
  postId: number | string;
}

function FAQPageSchema({ faqs, postTitle, postId }: FAQPageSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer.replace(/<[^>]*>/g, ''), // Strip HTML if present
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
