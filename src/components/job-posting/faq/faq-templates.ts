/**
 * FAQ Templates by Job Type
 *
 * Auto-generates common FAQs based on job details.
 * Templates are category-aware (SSC, Bank, Railway, UPSC, etc.)
 */

import type { FAQItem } from './faq-section';

interface JobContext {
  title: string;
  organizationName?: string;
  recruitmentName?: string;
  qualificationText?: string;
  experienceText?: string;
  locationCity?: string;
  locationState?: string;
  salary?: { min?: number; max?: number };
  applicationDeadline?: Date;
  examDate?: Date;
  ageMin?: number;
  ageMax?: number;
}

/**
 * Categorize job by recruitment name patterns
 */
function getJobCategory(
  recruitmentName?: string,
  title?: string
): 'ssc' | 'bank' | 'railway' | 'upsc' | 'state' | 'defence' | 'other' {
  const combined = `${recruitmentName || ''} ${title || ''}`.toLowerCase();

  if (combined.includes('staff selection') || combined.includes('ssc'))
    return 'ssc';
  if (combined.includes('bank') || combined.includes('banking')) return 'bank';
  if (combined.includes('railway') || combined.includes('rrb'))
    return 'railway';
  if (combined.includes('upsc') || combined.includes('ias') || combined.includes('ips'))
    return 'upsc';
  if (combined.includes('defence') || combined.includes('military'))
    return 'defence';
  if (
    combined.includes('state') ||
    combined.includes('psc') ||
    combined.includes('commission')
  )
    return 'state';

  return 'other';
}

/**
 * Generate FAQs based on job context
 */
export function generateFAQs(context: JobContext): FAQItem[] {
  const category = getJobCategory(context.recruitmentName, context.title);
  const faqs: FAQItem[] = [];

  // Universal FAQs
  faqs.push(
    {
      question: 'Who is eligible to apply for this job?',
      answer: context.qualificationText
        ? `${context.qualificationText}. Please ensure you meet all eligibility criteria before applying.`
        : `Please check the official notification for detailed eligibility criteria including education qualifications, age limits, and other requirements.`,
    },
    {
      question: 'What is the age limit for this position?',
      answer: context.ageMax
        ? `The age limit for this position is typically ${context.ageMin || 'Check the official notification'} to ${context.ageMax} years. Age relaxation may apply for reserved categories. Please verify with the official notification for exact details and applicable relaxations.`
        : `Please refer to the official job notification for age limit details and applicable age relaxations for different categories.`,
    }
  );

  // Experience-related FAQ
  if (context.experienceText) {
    faqs.push({
      question: 'What experience is required?',
      answer: context.experienceText,
    });
  }

  // Salary FAQ
  if (context.salary?.min || context.salary?.max) {
    const minSalary = context.salary.min
      ? `₹${(context.salary.min / 100000).toFixed(1)} lakh`
      : '';
    const maxSalary = context.salary.max
      ? `₹${(context.salary.max / 100000).toFixed(1)} lakh`
      : '';

    faqs.push({
      question: 'What is the salary for this position?',
      answer:
        minSalary && maxSalary
          ? `The salary range is ${minSalary} to ${maxSalary} per annum, subject to revision as per government norms. The exact salary will depend on your qualifications and experience.`
          : `Please check the official notification for detailed salary structure and pay bands.`,
    });
  }

  // Category-specific FAQs
  if (category === 'ssc') {
    faqs.push(
      {
        question: 'What is the selection process for SSC recruitment?',
        answer:
          'SSC recruitment typically involves written examination(s), followed by document verification and medical examination (if applicable). Some positions may have a skill test or interview. The exact selection process is mentioned in the official notification.',
      },
      {
        question: 'When will the SSC exam be held?',
        answer: context.examDate
          ? `The examination is scheduled for ${new Date(context.examDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}. Please check the official website for latest updates and exam center details.`
          : 'Please check the official SSC website for exam schedule and important dates.',
      }
    );
  }

  if (category === 'bank') {
    faqs.push(
      {
        question: 'What documents are required for bank recruitment?',
        answer:
          'Typically, you will need: education certificates, age proof (birth certificate/passport), category certificate (if applicable), SC/ST/OBC certificate, disability certificate (if applicable), passport-size photographs, and identity proof. The exact list is available in the official notification.',
      },
      {
        question: 'Is there any interview after the written exam?',
        answer:
          'Most bank recruitments include a written test, followed by interview/group discussion for shortlisted candidates. Some positions may have a skill test. Refer to the official notification for the detailed selection process.',
      }
    );
  }

  if (category === 'railway') {
    faqs.push(
      {
        question: 'What is the selection process for Railway recruitment?',
        answer:
          'Railway recruitment typically involves CBT (Computer Based Test), physical efficiency test (PET), document verification, and medical examination. The selection process varies by position. Check the official RRB website for specific details.',
      },
      {
        question: 'Are there any medical requirements for Railway jobs?',
        answer:
          'Yes, Railway positions require candidates to pass a medical examination. Physical requirements vary by position (e.g., height, vision, hearing). Refer to the official notification for position-specific medical standards.',
      }
    );
  }

  if (category === 'upsc') {
    faqs.push(
      {
        question: 'What is the UPSC selection process?',
        answer:
          'UPSC conducts a three-stage process: Preliminary Examination (Objective), Main Examination (Subjective), and Interview (Personality Test). Only candidates qualifying the Prelims are eligible for Mains.',
      },
      {
        question: 'How many attempts are allowed in UPSC exams?',
        answer:
          'The number of attempts varies by age and service. Generally, candidates have 6 attempts if they are under 30 years old, with additional attempts for reserved categories. Check the official UPSC notice for exact details.',
      }
    );
  }

  // Application-related FAQs
  faqs.push(
    {
      question: 'How do I apply for this position?',
      answer: `You can apply through the official website of ${context.organizationName || 'the recruiting organization'} by filling the online application form with required details and documents. Click the 'Apply Now' button above for the direct link.`,
    },
    {
      question: 'What is the application deadline?',
      answer: context.applicationDeadline
        ? `The application deadline is ${new Date(context.applicationDeadline).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}. Applications submitted after this date will not be accepted. Please apply before the deadline.`
        : 'Please check the official notification for the application deadline. Do not miss the last date.',
    },
    {
      question: 'Is there an application fee?',
      answer:
        'Most government job recruitments have an application fee (ranging from ₹0 to ₹1000). Some categories are exempted from fees. Check the official notification for fee details and payment methods. Fees are usually non-refundable.',
    }
  );

  // Location-specific FAQ
  if (context.locationCity || context.locationState) {
    const location = context.locationCity
      ? `${context.locationCity}, ${context.locationState || ''}`
      : context.locationState;

    faqs.push({
      question: 'Where will this position be located?',
      answer: `This position is located in ${location || 'India'}. Candidates will be posted at the mentioned location or nearby centers as per organizational requirements.`,
    });
  }

  // Generic FAQ
  faqs.push({
    question: 'Where can I find the official notification?',
    answer:
      'Click the "Official Notification" link above to access the complete job notification with all details. You can also visit the official website of the recruiting organization for updates and clarifications.',
  });

  return faqs;
}
