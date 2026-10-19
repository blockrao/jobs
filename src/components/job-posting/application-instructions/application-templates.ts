/**
 * Application Instructions Templates
 *
 * Auto-generates application instructions based on post metadata.
 */

import type {
  ApplicationInstruction,
  RequiredDocument,
} from './application-instructions-section';

interface PostContext {
  applyUrl?: string | null;
  officialSourceUrl?: string | null;
  organizationName?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  employmentType?: string | null;
  requiredDocuments?: Array<{ name: string; category: string; isRequired: boolean }>;
  applicationDeadline?: Date | string | null;
}

/**
 * Generate application instructions from post data
 */
export function generateApplicationInstructions(
  context: PostContext
): ApplicationInstruction[] {
  const instructions: ApplicationInstruction[] = [];

  // Primary: Online Application (if available)
  if (context.applyUrl) {
    instructions.push({
      method: 'online',
      title: 'Apply Online (Recommended)',
      url: context.applyUrl,
      instructions:
        'Click "Open Application Portal" to access the official application form. Fill in all required details accurately and upload documents as specified.',
      deadlineNote: 'Online applications must be submitted before the deadline.',
    });
  }

  // Fallback: Official Notification with application details
  if (context.officialSourceUrl && !context.applyUrl) {
    instructions.push({
      method: 'offline',
      title: 'Download Official Notification',
      url: context.officialSourceUrl,
      instructions:
        'Download the official notification PDF for detailed application instructions, addresses, and submission guidelines.',
    });
  }

  // Secondary: Postal/Offline Application
  if (context.organizationName || context.locationCity) {
    const orgName = context.organizationName || 'Recruiting Organization';
    const location = context.locationCity || context.locationState || 'India';

    instructions.push({
      method: 'post',
      title: 'Apply by Post',
      address: generatePostalAddress(orgName, location),
      envelopeFormat: generateEnvelopeFormat(context),
      instructions:
        'Send your application via registered post/courier. The envelope should be clearly marked with the position title and vacancy number.',
      deadlineNote:
        'Applications must be received (not just posted) by the deadline.',
    });
  }

  // Email (if applicable for certain organizations)
  if (
    context.organizationName?.toLowerCase().includes('university') ||
    context.organizationName?.toLowerCase().includes('college')
  ) {
    instructions.push({
      method: 'email',
      title: 'Email Application (if specified)',
      email: 'hr@organization.gov.in', // Placeholder
      instructions:
        'Check the official notification for the specific email address. Subject line should include position title and date.',
      deadlineNote: 'Email received timestamp should be before the deadline.',
    });
  }

  return instructions;
}

/**
 * Generate required documents list from post data
 */
export function generateRequiredDocuments(
  context: PostContext
): RequiredDocument[] {
  // Use provided documents if available
  if (context.requiredDocuments && context.requiredDocuments.length > 0) {
    return context.requiredDocuments.map((doc) => ({
      name: doc.name,
      description: `${doc.category}`,
      isRequired: doc.isRequired,
    }));
  }

  // Otherwise, generate standard government job documents
  const standardDocs: RequiredDocument[] = [
    {
      name: 'Application Form (Duly Filled)',
      description: 'Download from official notification or portal',
      isRequired: true,
    },
    {
      name: 'Educational Certificates',
      description: 'Degree, diploma, or qualifying exam certificates',
      isRequired: true,
    },
    {
      name: 'Age Proof',
      description: 'Birth certificate, passport, or SSC certificate',
      isRequired: true,
    },
    {
      name: 'Category Certificate',
      description: 'SC/ST/OBC/EWS certificate if applicable',
      isRequired: false,
    },
    {
      name: 'Disability Certificate',
      description: 'If applying under PwD quota (UDID/government issued)',
      isRequired: false,
    },
    {
      name: 'Experience Certificate',
      description: 'If applicable to the position',
      isRequired: false,
    },
    {
      name: 'Passport-size Photographs',
      description: '4-6 recent colored photographs (size 4x6 cm)',
      isRequired: true,
    },
    {
      name: 'Identity Proof',
      description: 'Passport, Aadhaar, Voter ID, or Driving License',
      isRequired: true,
    },
    {
      name: 'Address Proof',
      description: 'Utility bill, rent receipt, or similar',
      isRequired: false,
    },
  ];

  return standardDocs;
}

/**
 * Generate postal address from context
 */
function generatePostalAddress(orgName: string, location: string): string {
  return `${orgName}
Office Address
${location}
India

Mark the envelope: "[Position Name] - [Your Full Name]"`;
}

/**
 * Generate envelope format instructions
 */
function generateEnvelopeFormat(context: PostContext): string {
  const positionTitle = 'Position Name'; // Placeholder
  const orgName = context.organizationName || 'Organization';

  return `Front of Envelope:
${orgName}
ATTN: Application for "${positionTitle}"
[Applicant Name]
[Complete Postal Address]

Back of Envelope:
[Your Contact Number]
[Your Email ID]
Date: [Submission Date]`;
}
