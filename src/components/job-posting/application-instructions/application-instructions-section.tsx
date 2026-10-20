/**
 * Application Instructions Section
 *
 * Displays how to apply, where to send applications, required documents,
 * and envelope format for offline submissions.
 */

import React from 'react';

export interface ApplicationInstruction {
  method: 'online' | 'offline' | 'email' | 'post';
  title: string;
  address?: string;
  email?: string;
  url?: string;
  instructions?: string;
  envelopeFormat?: string;
  deadlineNote?: string;
}

export interface RequiredDocument {
  name: string;
  description?: string;
  isRequired: boolean;
}

interface ApplicationInstructionsSectionProps {
  instructions?: ApplicationInstruction[];
  requiredDocuments?: RequiredDocument[];
  applicationDeadline?: Date | string;
  organizationName?: string;
}

export default function ApplicationInstructionsSection({
  instructions,
  requiredDocuments,
  applicationDeadline,
  organizationName,
}: ApplicationInstructionsSectionProps) {
  // Don't show section if no data
  if (
    (!instructions || instructions.length === 0) &&
    (!requiredDocuments || requiredDocuments.length === 0)
  ) {
    return null;
  }

  const deadlineDate = applicationDeadline
    ? new Date(applicationDeadline)
    : null;

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
        How to Apply
      </h2>

      {/* Application Methods */}
      {instructions && instructions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Application Methods
          </h3>
          <div className="space-y-4">
            {instructions.map((instruction, idx) => (
              <div
                key={idx}
                className="p-4 bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-lg"
              >
                {/* Method Type Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full capitalize">
                    {instruction.method}
                  </span>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {instruction.title}
                  </h4>
                </div>

                {/* Method-specific details */}
                {instruction.method === 'online' && instruction.url && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Apply online using the official portal:
                    </p>
                    <a
                      href={instruction.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                    >
                      Open Application Portal
                    </a>
                  </div>
                )}

                {instruction.method === 'email' && instruction.email && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      Send application to:
                    </p>
                    <a
                      href={`mailto:${instruction.email}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-mono"
                    >
                      {instruction.email}
                    </a>
                  </div>
                )}

                {instruction.method === 'post' && instruction.address && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      Send hardcopy to:
                    </p>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {instruction.address}
                    </div>
                  </div>
                )}

                {/* Envelope format */}
                {instruction.envelopeFormat && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded">
                    <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                      📧 Envelope Format:
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-200 whitespace-pre-wrap">
                      {instruction.envelopeFormat}
                    </p>
                  </div>
                )}

                {/* General instructions */}
                {instruction.instructions && (
                  <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded text-sm text-gray-700 dark:text-gray-300">
                    {instruction.instructions}
                  </div>
                )}

                {/* Deadline note */}
                {instruction.deadlineNote && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    ⏰ {instruction.deadlineNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required Documents */}
      {requiredDocuments && requiredDocuments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Documents Required
          </h3>
          <div className="p-4 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg">
            <ul className="space-y-2">
              {requiredDocuments.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span
                    className={`mt-1 inline-block w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      doc.isRequired
                        ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {doc.isRequired ? '✓' : '○'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {doc.name}
                      {doc.isRequired && (
                        <span className="ml-1 text-red-600 dark:text-red-400 text-xs">
                          (Required)
                        </span>
                      )}
                    </p>
                    {doc.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Deadline Warning */}
      {deadlineDate && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">
            <strong>⚠️ Important:</strong> Submit your application before{' '}
            <strong>
              {deadlineDate.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </strong>
            . Late submissions will not be accepted.
          </p>
        </div>
      )}
    </section>
  );
}
