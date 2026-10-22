import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Report an Error | JobOye',
  description: 'Report inaccurate information on JobOye job postings',
};

export default function ReportPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const pageUrl = decodeURIComponent(searchParams.page || '');

  return (
    <main style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h1>Report an Error</h1>
      <p>Thank you for helping us improve JobOye! If you found inaccurate information on our job listings, please let us know.</p>

      <form
        action="https://formspree.io/f/xyzabc" // Replace with your Formspree form ID
        method="POST"
        style={{ marginTop: '20px' }}
      >
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="page" style={{ display: 'block', marginBottom: '4px' }}>
            Page URL:
          </label>
          <input
            type="text"
            name="page"
            id="page"
            defaultValue={pageUrl}
            readOnly
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#f5f5f5',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '4px' }}>
            Your Email:
          </label>
          <input
            type="email"
            name="email"
            id="email"
            required
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="issue" style={{ display: 'block', marginBottom: '4px' }}>
            What&apos;s the issue?
          </label>
          <select
            name="issue"
            id="issue"
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          >
            <option value="">Select an issue</option>
            <option value="incorrect_date">Incorrect date</option>
            <option value="incorrect_vacancy">Incorrect vacancy count</option>
            <option value="incorrect_eligibility">Incorrect eligibility</option>
            <option value="broken_link">Broken link</option>
            <option value="missing_info">Missing information</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="description" style={{ display: 'block', marginBottom: '4px' }}>
            Description:
          </label>
          <textarea
            name="description"
            id="description"
            required
            placeholder="Please describe the error in detail..."
            rows={5}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: '10px 20px',
            backgroundColor: '#1d4ed8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Submit Report
        </button>
      </form>

      <p style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        We review all reports and work to fix errors as quickly as possible. Thank you for your help!
      </p>
    </main>
  );
}
