'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface HubFAQProps {
  title: string;
  items: FAQItem[];
}

export default function HubFAQ({ title, items }: HubFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mt-16 pt-8 border-t">
      <h2 className="text-2xl font-bold mb-8">{title}</h2>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-lg font-semibold text-left text-gray-900">
                {item.question}
              </h3>
              <span className="ml-4 text-gray-500 flex-shrink-0">
                {openIndex === index ? '−' : '+'}
              </span>
            </button>
            {openIndex === index && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-gray-700 leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
