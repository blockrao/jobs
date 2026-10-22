/**
 * Hub Eligibility Detailed — per-post eligibility requirements.
 * Displays domicile, citizenship, skills, physical requirements, and experience.
 * Only shows fields with data (no empty fields displayed).
 * Includes optional verification status per field or section-wide.
 */

import styles from '../recruitment-hub.module.css';

interface EligibilityField {
  label: string;
  value: string | null;
  verificationStatus?: string;
}

interface Props {
  postTitle: string;
  eligibility: {
    domicile?: string | null;
    citizenship?: string | null;
    skills?: string | null;
    physicalRequirements?: string | null;
    experience?: string | null;
    [key: string]: string | null | undefined;
  };
  verificationStatus?: string;
}

export default function HubEligibilityDetailed({
  postTitle,
  eligibility,
  verificationStatus,
}: Props) {
  // Build field list from eligibility object, filtering out null/empty values
  const fields: EligibilityField[] = [];

  if (eligibility.domicile) {
    fields.push({ label: 'Domicile', value: eligibility.domicile });
  }
  if (eligibility.citizenship) {
    fields.push({ label: 'Citizenship', value: eligibility.citizenship });
  }
  if (eligibility.skills) {
    fields.push({ label: 'Skills Required', value: eligibility.skills });
  }
  if (eligibility.physicalRequirements) {
    fields.push({ label: 'Physical Requirements', value: eligibility.physicalRequirements });
  }
  if (eligibility.experience) {
    fields.push({ label: 'Experience', value: eligibility.experience });
  }

  if (fields.length === 0) return null;

  return (
    <div className={styles.subCard}>
      <h3 className={styles.subTitle}>Eligibility: {postTitle}</h3>
      <dl className={styles.kv}>
        {fields.map((field) => (
          <div key={field.label} className={styles.kvRow}>
            <dt>{field.label}</dt>
            <dd>
              {field.value}
              {field.verificationStatus && (
                <span className={styles.verificationNote}> ({field.verificationStatus})</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {verificationStatus && (
        <p className={styles.note} style={{ marginTop: 8 }}>
          {verificationStatus}
        </p>
      )}
    </div>
  );
}
