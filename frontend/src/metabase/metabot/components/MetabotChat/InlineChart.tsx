import { useMemo } from "react";
import { t } from "ttag";
import { noop } from "underscore";

import { useGetAdhocQueryQuery } from "metabase/api";
import type { GeneratedCard } from "metabase/api/ai-streaming/schemas";
import { getGeneratedCardPath } from "metabase/api/ai-streaming/schemas";
import { ForwardRefLink } from "metabase/common/components/Link";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { Anchor, Box, Center, Flex } from "metabase/ui";
import Visualization from "metabase/visualizations/components/Visualization";
import { ErrorView } from "metabase/visualizations/components/Visualization/ErrorView";
import {
  getDatasetError,
  getGenericErrorMessage,
} from "metabase/visualizations/lib/errors";
import type { Card } from "metabase-types/api";

import S from "./InlineChart.module.css";

/**
 * Renders a Metabot-generated `card` entity as a live, read-only chart inline in
 * the conversation: it runs the card's embedded query ad-hoc and renders the
 * result; the title bar links out to the full question.
 */
export function InlineChart({ value }: { value: GeneratedCard }) {
  const { title, display } = value;
  const datasetQuery = value.query.query;

  // A minimal ad-hoc card (no id/name); Visualization renders it read-only.
  const card = useMemo(
    () =>
      ({
        dataset_query: datasetQuery,
        display: display ?? "table",
        visualization_settings: {},
      }) as unknown as Card,
    [datasetQuery, display],
  );

  // Open-in-new-tab link: the same /question#<hash> the QB deserializes.
  const link = useMemo(() => getGeneratedCardPath(value), [value]);

  const { data: dataset, error } = useGetAdhocQueryQuery(datasetQuery);

  const rawSeries = useMemo(
    () => (dataset ? [{ card, data: dataset.data }] : null),
    [card, dataset],
  );

  const datasetError = dataset ? getDatasetError(dataset) : undefined;
  const hasError = error != null || datasetError != null;
  const { message, icon } = datasetError ?? {
    message: getGenericErrorMessage(),
    icon: "warning" as const,
  };

  return (
    <Box className={S.container} data-testid="metabot-inline-chart">
      <Flex className={S.header} align="center" gap="sm">
        <Anchor
          className={S.title}
          component={ForwardRefLink}
          to={link}
          target="_blank"
          fw="bold"
          truncate
          aria-label={t`Open in a new tab`}
        >
          {title}
        </Anchor>
      </Flex>
      <Box className={S.viz}>
        {hasError ? (
          <Center h="100%" p="md">
            <ErrorView error={message} icon={icon} isDashboard />
          </Center>
        ) : !rawSeries ? (
          <LoadingAndErrorWrapper loading />
        ) : (
          <Visualization
            rawSeries={rawSeries}
            isQueryBuilder={false}
            onChangeCardAndRun={noop}
          />
        )}
      </Box>
    </Box>
  );
}
