# ADR-0004: `images` Table Schema

- **Status**: Proposed

- **Context**: The `images` table associates R2 object keys with listings, supports ordered display via `position`, and tracks the primary (hero) image via `is_primary`. It must integrate with the existing Drizzle/Neon stack at `lib/db/schema.ts` and the `drizzle.config.ts` pointing at `./drizzle` for migration output.

- **Decision**: Append to `lib/db/schema.ts`:

  ```ts
  import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

  export const listingImages = pgTable("images", {
    id:        text("id").primaryKey(),
    listingId: text("listing_id").notNull(),
    r2Key:     text("r2_key").notNull(),
    position:  integer("position").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  });
  ```

  Column rationale:
  - `id`: server-assigned UUID via `crypto.randomUUID()`. Text type is consistent with `users.id` and `sellerAccounts.userId`.
  - `listing_id`: `text NOT NULL`. The `listings` table does not yet exist in the codebase (lands in S-2.4). The Drizzle schema omits `.references()` to prevent a schema-generation error; the FK is present in the migration SQL as a comment pending S-2.4.
  - `r2_key`: the server-assigned R2 object key from the upload-url step. Stored as-is; variant URLs are derived at query time by `buildVariants()`.
  - `position INT NOT NULL`: display order, client-supplied at confirm. No DB-level uniqueness per listing — duplicate positions are harmless; the list handler sorts by `is_primary DESC, position ASC`.
  - `is_primary BOOLEAN NOT NULL DEFAULT FALSE`: no unique partial index at this stage. The atomic swap pattern in the confirm handler (demote-then-insert in a single transaction) is sufficient for current single-writer concurrency. Future hardening: `CREATE UNIQUE INDEX ... WHERE is_primary = true`.
  - No `updated_at`: images are immutable after confirm; no update path exists in this story.

- **Consequences**:
  - Schema compiles without a `listings` table present.
  - Minimal columns — no premature additions for future delete/replace flows.
  - Two concurrent `confirm` calls with `isPrimary: true` can produce two primary rows. Acceptable at current scale; addressed by the atomic-swap app-code convention.

- **Alternatives considered**:
  - `serial` or native `uuid` PK: `text` UUID is consistent with the existing schema conventions.
  - `primary_image_id` FK on `listings`: circular dependency, two-table atomic update on every primary swap; `is_primary` boolean is simpler.
  - Unique constraint on `(listing_id, is_primary)`: prevents dual-primary at DB level but makes the update path more complex; deferred to future hardening.
