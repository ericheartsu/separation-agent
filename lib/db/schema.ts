import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const id = () => text('id').primaryKey().$defaultFn(() => nanoid(16));
const ts = (name: string) => integer(name, { mode: 'timestamp' });

// ─────────────────────────────────────────────────────────────────
// Tenants (future-proof; Craft is the only one for now)
// ─────────────────────────────────────────────────────────────────
export const tenants = sqliteTable('tenants', {
  id: id(),
  name: text('name').notNull(),
  driveRootFolderId: text('drive_root_folder_id'),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: id(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  image: text('image'),
  role: text('role', { enum: ['admin', 'trainer', 'operator'] }).notNull().default('operator'),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────
// Jobs — one separation case study
// ─────────────────────────────────────────────────────────────────
export const jobs = sqliteTable('jobs', {
  id: id(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  customerName: text('customer_name').notNull(),
  jobName: text('job_name').notNull(),
  poNumber: text('po_number'),
  garmentColor: text('garment_color').notNull(),
  garmentStyle: text('garment_style'),
  colorCount: integer('color_count').notNull(),
  printMethod: text('print_method', {
    enum: ['simulated_process', 'spot_color', 'four_color_process', 'index', 'discharge', 'other'],
  }).notNull(),
  difficulty: integer('difficulty').notNull().default(3),
  notes: text('notes'),
  hqJobId: text('hq_job_id'),
  createdById: text('created_by_id').references(() => users.id),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: ts('updated_at').notNull().$defaultFn(() => new Date()),
}, (t) => ({
  customerIdx: index('jobs_customer_idx').on(t.customerName),
  createdAtIdx: index('jobs_created_at_idx').on(t.createdAt),
}));

// ─────────────────────────────────────────────────────────────────
// JobFile — three per job: customer / mockup / separation
// ─────────────────────────────────────────────────────────────────
export const jobFiles = sqliteTable('job_files', {
  id: id(),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['CUSTOMER', 'MOCKUP', 'SEPARATION'] }).notNull(),
  driveFileId: text('drive_file_id').notNull(),
  driveFileName: text('drive_file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  byteSize: integer('byte_size').notNull(),
  previewUrl: text('preview_url'),
  previewGeneratedAt: ts('preview_generated_at'),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
}, (t) => ({
  jobKindIdx: index('job_files_job_kind_idx').on(t.jobId, t.kind),
}));

// ─────────────────────────────────────────────────────────────────
// Tags — taxonomy of separation challenges
// ─────────────────────────────────────────────────────────────────
export const tags = sqliteTable('tags', {
  id: id(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  category: text('category', {
    enum: ['technique', 'problem', 'garment', 'art_style'],
  }).notNull(),
  description: text('description'),
});

export const jobTags = sqliteTable('job_tags', {
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  jobIdx: index('job_tags_job_idx').on(t.jobId),
  tagIdx: index('job_tags_tag_idx').on(t.tagId),
}));

// ─────────────────────────────────────────────────────────────────
// Critique — agent's analysis of a job
// ─────────────────────────────────────────────────────────────────
export const critiques = sqliteTable('critiques', {
  id: id(),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  modelVersion: text('model_version').notNull(),
  promptVersion: text('prompt_version').notNull(),
  text: text('text').notNull(),
  // structured findings as JSON
  findings: text('findings', { mode: 'json' }).$type<{
    summary: string;
    color_palette: { name: string; hex?: string; role: string }[];
    underbase_strategy?: string;
    halftones?: { color: string; lpi: number; angle: number }[];
    risks: { area: string; severity: 'low' | 'med' | 'high'; explanation: string }[];
    overall_difficulty: number;
  }>(),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
}, (t) => ({
  jobIdx: index('critiques_job_idx').on(t.jobId),
}));

// ─────────────────────────────────────────────────────────────────
// Correction — trainer feedback on a critique
// ─────────────────────────────────────────────────────────────────
export const corrections = sqliteTable('corrections', {
  id: id(),
  critiqueId: text('critique_id').notNull().references(() => critiques.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  verdict: text('verdict', { enum: ['correct', 'partial', 'wrong'] }).notNull(),
  whatAgentMissed: text('what_agent_missed'),
  whatAgentGotWrong: text('what_agent_got_wrong'),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────
// Pin annotations — drop pins on artwork to mark problem areas
// ─────────────────────────────────────────────────────────────────
export const pins = sqliteTable('pins', {
  id: id(),
  jobFileId: text('job_file_id').notNull().references(() => jobFiles.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  // normalized 0-1 coordinates so they survive image resizing
  x: real('x').notNull(),
  y: real('y').notNull(),
  note: text('note').notNull(),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────
// Embeddings — for similarity search (Phase 2)
// ─────────────────────────────────────────────────────────────────
export const jobEmbeddings = sqliteTable('job_embeddings', {
  id: id(),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  // stored as JSON array; in production consider pgvector
  vector: text('vector', { mode: 'json' }).$type<number[]>().notNull(),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────
// Drive audit log — every read is recorded
// ─────────────────────────────────────────────────────────────────
export const driveAudit = sqliteTable('drive_audit', {
  id: id(),
  userId: text('user_id').references(() => users.id),
  driveFileId: text('drive_file_id').notNull(),
  driveFileName: text('drive_file_name'),
  reason: text('reason').notNull(),
  successful: integer('successful', { mode: 'boolean' }).notNull(),
  errorMessage: text('error_message'),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
}, (t) => ({
  userIdx: index('drive_audit_user_idx').on(t.userId),
  createdAtIdx: index('drive_audit_created_at_idx').on(t.createdAt),
}));

// ─────────────────────────────────────────────────────────────────
// Phase 1.5 — Mockup Generator
// ─────────────────────────────────────────────────────────────────
export const garmentTemplates = sqliteTable('garment_templates', {
  id: id(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  garmentStyleSku: text('garment_style_sku').notNull(),
  name: text('name').notNull(),
  baseImageUrl: text('base_image_url').notNull(),
  maskImageUrl: text('mask_image_url'),
  displacementMapUrl: text('displacement_map_url'),
  defaultColor: text('default_color'),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
});

export const printZones = sqliteTable('print_zones', {
  id: id(),
  templateId: text('template_id').notNull().references(() => garmentTemplates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // 'chest', 'full-front', 'sleeve-left', etc.
  // pixel coordinates within the template image
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  rotationDeg: real('rotation_deg').notNull().default(0),
  // physical print constraints
  maxPrintWidthIn: real('max_print_width_in').notNull(),
  maxPrintHeightIn: real('max_print_height_in').notNull(),
  pixelsPerInch: integer('pixels_per_inch').notNull().default(150),
});

export const generatedMockups = sqliteTable('generated_mockups', {
  id: id(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  hqJobId: text('hq_job_id'),
  templateId: text('template_id').notNull().references(() => garmentTemplates.id),
  // which art went in which zone
  zonesJson: text('zones_json', { mode: 'json' }).$type<{
    zoneId: string;
    artUrl: string;
    inkColors: string[];
    widthIn: number;
    heightIn: number;
  }[]>().notNull(),
  garmentColor: text('garment_color').notNull(),
  outputUrl: text('output_url').notNull(),
  generatedById: text('generated_by_id').references(() => users.id),
  createdAt: ts('created_at').notNull().$defaultFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────
export const jobsRelations = relations(jobs, ({ many, one }) => ({
  files: many(jobFiles),
  tags: many(jobTags),
  critiques: many(critiques),
  embeddings: many(jobEmbeddings),
  createdBy: one(users, { fields: [jobs.createdById], references: [users.id] }),
}));

export const jobFilesRelations = relations(jobFiles, ({ one, many }) => ({
  job: one(jobs, { fields: [jobFiles.jobId], references: [jobs.id] }),
  pins: many(pins),
}));

export const jobTagsRelations = relations(jobTags, ({ one }) => ({
  job: one(jobs, { fields: [jobTags.jobId], references: [jobs.id] }),
  tag: one(tags, { fields: [jobTags.tagId], references: [tags.id] }),
}));

export const critiquesRelations = relations(critiques, ({ one, many }) => ({
  job: one(jobs, { fields: [critiques.jobId], references: [jobs.id] }),
  corrections: many(corrections),
}));

export const correctionsRelations = relations(corrections, ({ one }) => ({
  critique: one(critiques, { fields: [corrections.critiqueId], references: [critiques.id] }),
  user: one(users, { fields: [corrections.userId], references: [users.id] }),
}));

export const garmentTemplatesRelations = relations(garmentTemplates, ({ many }) => ({
  zones: many(printZones),
}));

export const printZonesRelations = relations(printZones, ({ one }) => ({
  template: one(garmentTemplates, { fields: [printZones.templateId], references: [garmentTemplates.id] }),
}));

export const generatedMockupsRelations = relations(generatedMockups, ({ one }) => ({
  template: one(garmentTemplates, { fields: [generatedMockups.templateId], references: [garmentTemplates.id] }),
  generatedBy: one(users, { fields: [generatedMockups.generatedById], references: [users.id] }),
}));

// type exports
export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type JobFile = typeof jobFiles.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Critique = typeof critiques.$inferSelect;
export type Correction = typeof corrections.$inferSelect;
export type Pin = typeof pins.$inferSelect;
export type GarmentTemplate = typeof garmentTemplates.$inferSelect;
export type PrintZone = typeof printZones.$inferSelect;
export type GeneratedMockup = typeof generatedMockups.$inferSelect;
export type DriveAuditEntry = typeof driveAudit.$inferSelect;
