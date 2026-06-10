import * as Yup from "yup";

import { utf8_to_b64url } from "metabase/utils/encoding";
import type {
  CardDisplayType,
  DatasetQuery,
  MetabotCodeEdit,
  MetabotTodoItem,
  SuggestedTransform,
} from "metabase-types/api";

export const dataPartSchema = Yup.object({
  type: Yup.string().required(),
  version: Yup.number().required(),
  value: Yup.mixed(),
});

export const knownDataPartTypes = [
  "state",
  "todo_list",
  "code_edit",
  "transform_suggestion",
  "generated_entity",
  "adhoc_viz",
  "static_viz",
];

export type AdhocVizValue = {
  query: unknown;
  link: string;
  title?: string;
  display?: string;
};

export type StaticVizValue = {
  entity_id: number;
};

export type GeneratedQuery = {
  id: string;
  query: DatasetQuery;
};

export type GeneratedCard = {
  type: "card";
  id: string;
  title: string;
  query: GeneratedQuery;
  display?: CardDisplayType;
};

export type GeneratedDashboard = {
  type: "dashboard";
  id?: number;
  title: string;
  url: string;
};

export type GeneratedEntity = GeneratedCard | GeneratedDashboard;

export type KnownDataPart =
  | { type: "state"; version: 1; value: Record<string, any> }
  | { type: "todo_list"; version: 1; value: MetabotTodoItem[] }
  | { type: "transform_suggestion"; version: 1; value: SuggestedTransform }
  | { type: "code_edit"; version: 1; value: MetabotCodeEdit }
  | { type: "generated_entity"; version: 1; value: GeneratedEntity }
  | { type: "adhoc_viz"; version: 1; value: AdhocVizValue }
  | { type: "static_viz"; version: 1; value: StaticVizValue };

export function getGeneratedCardPath(card: GeneratedCard): string {
  const minimalCard = {
    dataset_query: card.query.query,
    display: card.display ?? "table",
    visualization_settings: {},
    displayIsLocked: card.display != null,
  };
  return `/question#${utf8_to_b64url(JSON.stringify(minimalCard))}`;
}

export function getGeneratedEntityPath(entity: GeneratedEntity): string {
  switch (entity.type) {
    case "card":
      return getGeneratedCardPath(entity);
    case "dashboard":
      return entity.url;
  }
}

export const toolCallPartSchema = Yup.object({
  toolCallId: Yup.string().required(),
  toolName: Yup.string().required(),
  args: Yup.string(),
});

export const toolResultPartSchema = Yup.object({
  toolCallId: Yup.string().required(),
  result: Yup.mixed(),
});

export const finishPartSchema = Yup.object({
  finishReason: Yup.string()
    .oneOf([
      "stop",
      "length",
      "content_filter",
      "tool_calls",
      "error",
      "other",
      "unknown",
    ])
    .required(),
});

export const startPartSchema = Yup.object({
  messageId: Yup.string().required(),
});
