import type { SearchContext, SearchModel } from "metabase-types/api";

type SearchEventSchema = {
  event: string;
  runtime_milliseconds?: number | null;
  context?: string | null;
  total_results?: number | null;
  page_results?: number | null;
  position?: number | null;
  target_type?: string | null;
  content_type?: string[] | null;
  creator?: boolean | null;
  last_editor?: boolean | null;
  creation_date?: boolean | null;
  last_edit_date?: boolean | null;
  verified_items?: boolean | null;
  search_native_queries?: boolean | null;
  search_archived?: boolean | null;
  search_engine?: string | null;
  request_id?: string | null;
  offset?: number | null;
  entity_model?: string | null;
  entity_id?: number | null;
  search_term_hash?: string | null;
  search_term?: string | null;
};

type ValidateEvent<
  T extends SearchEventSchema &
    Record<Exclude<keyof T, keyof SearchEventSchema>, never>,
> = T;

// The snowplow `search` schema's `content_type` enum; keep in sync with:
// snowplow/iglu-client-embedded/schemas/com.metabase/search/jsonschema/1-1-4
// "other" (kept last) is the catch-all for models that aren't tracked content types — e.g. a picker that
// casts a navigation pseudo-model like "schema" into `models`. `toSnowplowContentTypes` buckets anything
// off-list there so a broadened tracking surface can't emit values that fail schema validation.
const SNOWPLOW_CONTENT_TYPES = [
  "dashboard",
  "card",
  "dataset",
  "segment",
  "measure",
  "metric",
  "collection",
  "database",
  "table",
  "action",
  "indexed-entity",
  "document",
  "transform",
  "schema",
  "other",
] as const;

type SearchContentType = (typeof SNOWPLOW_CONTENT_TYPES)[number];

const SNOWPLOW_CONTENT_TYPE_SET = new Set<string>(SNOWPLOW_CONTENT_TYPES);

// Maps a search request's `models` to snowplow `content_type`, bucketing any value that isn't a tracked
// content type into "other" and de-duplicating. The `SearchContentType[]` return type doubles as a
// guard: a `SearchModel` missing from the enum above would fail to compile here.
export const toSnowplowContentTypes = (
  models: SearchModel[] | null | undefined,
): SearchContentType[] | null =>
  models == null
    ? null
    : Array.from(
        new Set(
          models.map((model) =>
            SNOWPLOW_CONTENT_TYPE_SET.has(model) ? model : "other",
          ),
        ),
      );

// The snowplow `search` schema's `context` enum. Kept as its own list — not derived from the frontend
// `SearchContext` (which is imported above only for the compile-time guard) — so adding a UI context
// forces a deliberate choice: extend this enum and the iglu schema to track it, or list it in
// `PENDING_CONTEXTS` to bucket it as `"other"` until the schema catches up. Keep in sync with:
// snowplow/iglu-client-embedded/schemas/com.metabase/search/jsonschema/1-1-4
// Non-null in the event types below even though the wire schema allows null: `toSnowplowContext`
// always yields a value (worst case `"other"`), but keeping the schema nullable avoids a major (MODEL)
// version bump that would fork events into a new warehouse table.
type SnowplowSearchContext =
  | "browse"
  | "command-palette"
  | "data-picker"
  | "dependencies"
  | "document"
  | "embedding-setup"
  | "entity-picker"
  | "library"
  | "model-migration"
  | "search-app"
  | "search-bar"
  | "type-filter"
  | "other"; // catch-all, kept last rather than alphabetized with the real surfaces

// Frontend contexts not yet in the snowplow enum above; emitted as `"other"` until the iglu schema is
// bumped to include them. Empty when everything is in sync. To migrate one, add it to the enum (and the
// schema) and drop it from here.
const PENDING_CONTEXTS = [] as const satisfies readonly SearchContext[];

// Compile-time guard: every `SearchContext` must be in the snowplow enum or listed in `PENDING_CONTEXTS`.
// If a new context is neither, this assignment fails with the offending value in the error message.
const _allContextsHandled: Exclude<
  SearchContext,
  SnowplowSearchContext | (typeof PENDING_CONTEXTS)[number]
> extends never
  ? true
  : "Add the missing SearchContext to the snowplow enum or to PENDING_CONTEXTS" =
  true;

export const toSnowplowContext = (
  context: SearchContext,
): SnowplowSearchContext =>
  (PENDING_CONTEXTS as readonly SearchContext[]).includes(context)
    ? "other"
    : // safe: the guard above proves every non-pending context is in the snowplow enum
      (context as SnowplowSearchContext);

export type SearchQueryEvent = ValidateEvent<{
  event: "search_query";
  search_term_hash: string | null;
  search_term: string | null;
  runtime_milliseconds: number;
  context: SnowplowSearchContext;
  total_results: number;
  page_results: number | null;
  content_type: SearchContentType[] | null;
  creator: boolean;
  last_editor: boolean;
  creation_date: boolean;
  last_edit_date: boolean;
  verified_items: boolean;
  search_native_queries: boolean;
  search_archived: boolean;
  search_engine: string | null;
  request_id: string | null;
  offset: number | null;
}>;

export type SearchClickEvent = ValidateEvent<{
  event: "search_click";
  position: number;
  target_type: "item" | "view_more";
  context: SnowplowSearchContext;
  search_engine: string | null;
  request_id: string | null;
  entity_model: string | null;
  entity_id: number | null;
  search_term_hash: string | null;
  search_term: string | null;
}>;

export type SearchEvent = SearchQueryEvent | SearchClickEvent;
