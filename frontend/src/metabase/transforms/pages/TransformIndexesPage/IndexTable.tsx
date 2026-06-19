import { useMemo } from "react";
import { t } from "ttag";

import { DateTime } from "metabase/common/components/DateTime";
import { ListEmptyState } from "metabase/common/components/ListEmptyState";
import CS from "metabase/css/core/index.css";
import {
  Badge,
  Card,
  Code,
  Ellipsified,
  Group,
  Tooltip,
  TreeTable,
  type TreeTableColumnDef,
  useTreeTableInstance,
} from "metabase/ui";
import { EMPTY_CELL_PLACEHOLDER } from "metabase/utils/constants";
import type { MergedIndex, TableIndexStatus } from "metabase-types/api";

// TreeTable rows need a stable `id`. A managed index uses its `request` id; a
// warehouse index Metabase doesn't manage carries none, so derive one from its
// observed identity.
type IndexRow = MergedIndex & { id: string };

function getRowId(index: MergedIndex): string {
  if (index.request) {
    return String(index.request.id);
  }
  return `warehouse:${index.name ?? index.kind}:${index.key_columns.join(",")}`;
}

const STATUS_COLORS = {
  pending: "text-secondary",
  running: "brand",
  succeeded: "success",
  failed: "error",
  dropped: "warning",
} as const satisfies Record<TableIndexStatus, string>;

function IndexStatusCell({ index }: { index: MergedIndex }) {
  const { request } = index;
  if (!request) {
    return <Badge color="text-secondary">{t`Unmanaged`}</Badge>;
  }

  const badge = (
    <Badge color={STATUS_COLORS[request.status]}>{request.status}</Badge>
  );
  if (request.status === "failed" && request.error_message) {
    return <Tooltip label={request.error_message}>{badge}</Tooltip>;
  }
  return badge;
}

function IndexColumnsCell({ columns }: { columns: string[] }) {
  return (
    <Group gap="xs" wrap="nowrap">
      {columns.map((name) => (
        <Code key={name}>{name}</Code>
      ))}
    </Group>
  );
}

function getColumns(): TreeTableColumnDef<IndexRow>[] {
  return [
    {
      id: "name",
      header: t`Name`,
      minWidth: "auto",
      maxAutoWidth: 320,
      accessorFn: (index) => index.name ?? "",
      cell: ({ row }) =>
        row.original.name ? (
          <Ellipsified>{row.original.name}</Ellipsified>
        ) : (
          EMPTY_CELL_PLACEHOLDER
        ),
    },
    {
      id: "kind",
      header: t`Kind`,
      width: "auto",
      accessorFn: (index) => index.kind,
      cell: ({ row }) => <Badge>{row.original.kind}</Badge>,
    },
    {
      id: "columns",
      header: t`Columns`,
      minWidth: "auto",
      maxAutoWidth: 480,
      accessorFn: (index) => index.key_columns.join(", "),
      cell: ({ row }) => (
        <IndexColumnsCell columns={row.original.key_columns} />
      ),
    },
    {
      id: "status",
      header: t`Status`,
      width: "auto",
      accessorFn: (index) => index.request?.status ?? "",
      cell: ({ row }) => <IndexStatusCell index={row.original} />,
    },
    {
      id: "last_executed_at",
      header: t`Last run`,
      width: "auto",
      accessorFn: (index) => index.request?.last_executed_at ?? "",
      cell: ({ row }) =>
        row.original.request?.last_executed_at ? (
          <DateTime value={row.original.request.last_executed_at} />
        ) : (
          EMPTY_CELL_PLACEHOLDER
        ),
    },
  ];
}

type IndexTableProps = {
  indexes: MergedIndex[];
};

export function IndexTable({ indexes }: IndexTableProps) {
  const columns = useMemo(() => getColumns(), []);
  const data = useMemo<IndexRow[]>(
    () => indexes.map((index) => ({ ...index, id: getRowId(index) })),
    [indexes],
  );
  const instance = useTreeTableInstance<IndexRow>({
    data,
    columns,
    getNodeId: (row) => row.id,
  });

  return (
    <Card
      className={CS.overflowHidden}
      p={0}
      flex="0 1 auto"
      mih={0}
      shadow="none"
      withBorder
    >
      <TreeTable
        instance={instance}
        emptyState={
          <ListEmptyState label={t`No indexes defined for this transform.`} />
        }
        ariaLabel={t`Transform indexes`}
      />
    </Card>
  );
}
