import { isObject } from "metabase-types/guards";

import { getMetricIdFromQuery, getTableIdFromQuery } from "./accessors";
import type {
  CountAggregationRuntime,
  DimensionFilterRuntime,
  FieldAggregationRuntime,
  MeasureReferenceRuntime,
  MetabaseQueryRuntime,
  MetricQueryRuntime,
  QuestionQueryRuntime,
  SegmentReferenceRuntime,
  TableQueryRuntime,
} from "./runtime-types";
import type { FieldSchema } from "./schema";

export const isQuestionQuery = (
  query: MetabaseQueryRuntime,
): query is QuestionQueryRuntime => query.questionId != null;

export const isTableQuery = (
  query: MetabaseQueryRuntime,
): query is TableQueryRuntime => getTableIdFromQuery(query) != null;

export const isMetricQuery = (
  query: MetabaseQueryRuntime,
): query is MetricQueryRuntime => getMetricIdFromQuery(query) != null;

export const isUnaryOperator = (operator: string) =>
  operator === "is-empty" ||
  operator === "not-empty" ||
  operator === "is-null" ||
  operator === "not-null";

export const isDimensionFilter = (
  value: unknown,
): value is DimensionFilterRuntime => isObject(value) && "dimension" in value;

export const isTableDimensionFilter = (
  value: unknown,
): value is DimensionFilterRuntime & { dimension: FieldSchema } =>
  isDimensionFilter(value) && isTableFieldSchema(value.dimension);

export const isSegmentSchema = (
  value: unknown,
): value is SegmentReferenceRuntime =>
  isObject(value) && "kind" in value && value.kind === "segment";

export const isMeasureSchema = (
  value: unknown,
): value is MeasureReferenceRuntime =>
  isObject(value) && "kind" in value && value.kind === "measure";

export const isCountAggregation = (
  value: unknown,
): value is CountAggregationRuntime =>
  isObject(value) && "type" in value && value.type === "count";

export const isFieldAggregation = (
  value: unknown,
): value is FieldAggregationRuntime =>
  isObject(value) &&
  "type" in value &&
  "dimension" in value &&
  (value.type === "sum" ||
    value.type === "avg" ||
    value.type === "median" ||
    value.type === "distinct" ||
    value.type === "min" ||
    value.type === "max");

export function isTableFieldSchema(value: unknown): value is FieldSchema {
  if (!isObject(value) || "metricId" in value) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    (typeof value.fieldId === "number" ||
      typeof value.id === "number" ||
      typeof value.id === "string")
  );
}
