import type { TransformId } from "./transform";
import type { UserId } from "./user";

export type TableIndexId = number;

export type IndexColumnDirection = "asc" | "desc";

export type IndexColumn = {
  name: string;
  direction?: IndexColumnDirection;
};

// Postgres / MySQL / SQL Server secondary indexes — all share the classical shape.
export const CLASSICAL_INDEX_KINDS = [
  "btree",
  "hash",
  "gin",
  "gist",
  "brin",
  "spgist",
  "fulltext",
  "spatial",
  "clustered",
  "nonclustered",
  "columnstore",
] as const;
export type ClassicalIndexKind = (typeof CLASSICAL_INDEX_KINDS)[number];

export type ClassicalIndex = {
  kind: ClassicalIndexKind;
  name: string;
  columns: IndexColumn[];
  include?: string[];
  unique?: boolean;
};

export type SortKeyStyle = "compound" | "interleaved";

// Redshift sort key, inline.
export type SortKeyIndex = {
  kind: "sortkey";
  style: SortKeyStyle;
  columns: IndexColumn[];
};

// Redshift distribution key, inline.
export type DistKeyIndex = {
  kind: "distkey";
  column: string;
};

// Snowflake (standalone) / BigQuery (inline) clustering.
export type ClusteringIndex = {
  kind: "clustering";
  name?: string;
  columns: IndexColumn[];
};

// ClickHouse ORDER BY, inline.
export type OrderByIndex = {
  kind: "order-by";
  columns: IndexColumn[];
};

export const SKIP_INDEX_TYPES = [
  "minmax",
  "set",
  "bloom_filter",
  "ngrambf_v1",
  "tokenbf_v1",
] as const;
export type SkipIndexType = (typeof SKIP_INDEX_TYPES)[number];

// ClickHouse data-skipping index, standalone.
export type SkipIndex = {
  kind: "skip-index";
  name: string;
  columns: IndexColumn[];
  type: SkipIndexType;
  "type-args"?: unknown[];
  granularity?: number;
};

// A single structured index definition, dispatched on `kind`. Mirrors the
// backend `metabase.indexes.schema/index-structured` multi-schema.
export type StructuredIndex =
  | ClassicalIndex
  | SortKeyIndex
  | DistKeyIndex
  | ClusteringIndex
  | OrderByIndex
  | SkipIndex;

export const TABLE_INDEX_STATUSES = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "dropped",
] as const;
export type TableIndexStatus = (typeof TABLE_INDEX_STATUSES)[number];

export type TableIndex = {
  id: TableIndexId;
  transform_id: TransformId;
  index_name: string;
  structured: StructuredIndex;
  status: TableIndexStatus;
  error_message: string | null;
  created_by: UserId | null;
  created_at: string;
  updated_at: string;
  last_executed_at: string | null;
};

export type ListTableIndexesRequest = {
  "transform-id": TransformId;
};

export type ListTableIndexesResponse = {
  data: TableIndex[];
};

export type CreateTableIndexRequest = {
  transform_id: TransformId;
  structured: StructuredIndex;
};

export type UpdateTableIndexRequest = {
  id: TableIndexId;
  structured: StructuredIndex;
};
