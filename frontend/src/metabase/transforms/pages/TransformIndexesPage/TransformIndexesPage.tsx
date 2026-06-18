import { useState } from "react";
import { t } from "ttag";

import {
  skipToken,
  useGetTransformQuery,
  useListTableIndexesQuery,
} from "metabase/api";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { PageContainer } from "metabase/data-studio/common/components/PageContainer";
import { useTransformPermissions } from "metabase/transforms/hooks/use-transform-permissions";
import { Button, Center, Group, Stack } from "metabase/ui";
import * as Urls from "metabase/urls";
import type { TableId, TransformId } from "metabase-types/api";

import { TransformHeader } from "../../components/TransformHeader";

import { CreateIndexModal } from "./CreateIndexModal";
import { IndexTable } from "./IndexTable";

export type TransformIndexesPageParams = {
  transformId: string;
};

type TransformIndexesPageProps = {
  params?: TransformIndexesPageParams;
};

export function TransformIndexesPage({ params }: TransformIndexesPageProps) {
  const id = Urls.extractEntityId(params?.transformId);
  const {
    data: transform,
    isLoading: isLoadingTransform,
    error: transformError,
  } = useGetTransformQuery(id ?? skipToken);
  const { readOnly, isLoadingDatabases, databasesError } =
    useTransformPermissions({ transform });
  const isLoading = isLoadingTransform || isLoadingDatabases;
  const error = transformError || databasesError;

  if (id == null || transform == null || isLoading || error != null) {
    return (
      <Center h="100%">
        <LoadingAndErrorWrapper loading={isLoading} error={error} />
      </Center>
    );
  }

  return (
    <PageContainer data-testid="transforms-indexes-content">
      <TransformHeader transform={transform} readOnly={readOnly} />
      <TransformIndexesContent
        transformId={transform.id}
        tableId={transform.table?.id ?? null}
        readOnly={readOnly}
      />
    </PageContainer>
  );
}

type TransformIndexesContentProps = {
  transformId: TransformId;
  tableId: TableId | null;
  readOnly?: boolean;
};

function TransformIndexesContent({
  transformId,
  tableId,
  readOnly,
}: TransformIndexesContentProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const {
    data: indexes = [],
    isLoading,
    error,
  } = useListTableIndexesQuery({ "transform-id": transformId });

  if (isLoading || error != null) {
    return (
      <Center flex={1}>
        <LoadingAndErrorWrapper loading={isLoading} error={error} />
      </Center>
    );
  }

  return (
    <Stack flex={1} gap="md">
      <Group justify="flex-end">
        <Button
          variant="filled"
          disabled={readOnly}
          onClick={() => setIsCreateOpen(true)}
        >
          {t`Create index`}
        </Button>
      </Group>
      <IndexTable indexes={indexes} />
      {isCreateOpen && (
        <CreateIndexModal
          transformId={transformId}
          tableId={tableId}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </Stack>
  );
}
