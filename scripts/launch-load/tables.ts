/**
 * Launch-load export configuration: which tables the ingestion path writes, how
 * each row is identified without its serial id (natural key), and which foreign
 * keys are re-resolved on the target by natural key.
 *
 * Row ids differ between the scratch database and production, so no id is ever
 * copied. Every foreign key is carried as a natural-key value and resolved by
 * subselect on the target.
 */

export interface FkSpec {
  /** Column on this table holding the foreign id. */
  column: string;
  /** Parent table (its natural key is defined in KEY_EXPR). */
  parent: string;
  nullable: boolean;
}

export interface TableSpec {
  name: string;
  /** Foreign keys re-resolved by natural key. */
  fks: FkSpec[];
  /** Foreign-id columns that point at reference data not loaded here; carried as null. */
  nullColumns?: string[];
}

/**
 * Natural key of each table, as ordered SQL expressions over the row alias `t`.
 * Reference tables that already exist on the target (exams) are keyed by slug.
 */
export const KEY_EXPR: Record<string, string[]> = {
  organizations: ["t.slug"],
  organization_aliases: ["t.alias_normalized"],
  organization_candidates: ["t.normalized_name", "t.source"],
  sources: ["t.slug"],
  positions: ["t.slug"],
  exams: ["t.slug"],
  recruitments: ["t.slug"],
  posts: ["(select r.slug from public.recruitments r where r.id = t.recruitment_id)", "lower(t.name)"],
  source_documents: ["(select s.slug from public.sources s where s.id = t.source_id)", "t.external_id"],
  postings: ["t.slug"],
  source_observations: ["t.source", "t.external_id", "t.content_hash"],
};

/** Load order: parents before children. Rollback uses the reverse order. */
export const TABLES: TableSpec[] = [
  { name: "organizations", fks: [] },
  { name: "organization_aliases", fks: [{ column: "organization_id", parent: "organizations", nullable: false }] },
  { name: "organization_candidates", fks: [{ column: "proposed_organization_id", parent: "organizations", nullable: true }] },
  { name: "sources", fks: [] },
  { name: "positions", fks: [], nullColumns: ["typical_qualification_id"] },
  {
    name: "recruitments",
    fks: [
      { column: "organization_id", parent: "organizations", nullable: false },
      { column: "exam_id", parent: "exams", nullable: true },
    ],
  },
  {
    name: "posts",
    fks: [
      { column: "recruitment_id", parent: "recruitments", nullable: false },
      { column: "position_id", parent: "positions", nullable: false },
    ],
  },
  { name: "source_documents", fks: [{ column: "source_id", parent: "sources", nullable: false }] },
  {
    name: "postings",
    fks: [
      { column: "organization_id", parent: "organizations", nullable: false },
      { column: "exam_id", parent: "exams", nullable: true },
      { column: "source_id", parent: "sources", nullable: true },
      { column: "source_document_id", parent: "source_documents", nullable: true },
      { column: "inferred_recruitment_id", parent: "recruitments", nullable: true },
      { column: "inferred_post_id", parent: "posts", nullable: true },
    ],
  },
  {
    name: "source_observations",
    fks: [
      { column: "posting_id", parent: "postings", nullable: true },
      { column: "candidate_id", parent: "organization_candidates", nullable: true },
    ],
  },
];

/**
 * Tables the ingestion path could write that this tool does NOT export. If the source
 * holds rows in any of them, the export aborts rather than silently dropping them.
 */
export const GUARDED_UNEXPORTED = ["vacancies", "posting_updates", "posting_categories", "posting_articles", "eligibilities", "selection_processes"];

/** Columns never copied: serial ids (re-assigned on the target). */
export const NEVER_COPY = ["id"];
