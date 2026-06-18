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
import type {
  StructuredIndex,
  TableIndex,
  TableIndexStatus,
} from "metabase-types/api";

function getIndexColumnNames(structured: StructuredIndex): string[] {
  if (structured.kind === "distkey") {
    return [structured.column];
  }
  return structured.columns.map((column) =>
    column.direction ? `${column.name} ${column.direction}` : column.name,
  );
}

const STATUS_COLORS = {
  pending: "text-secondary",
  running: "brand",
  succeeded: "success",
  failed: "error",
  dropped: "warning",
} as const satisfies Record<TableIndexStatus, string>;

function IndexStatusCell({ index }: { index: TableIndex }) {
  const badge = (
    <Badge color={STATUS_COLORS[index.status]}>{index.status}</Badge>
  );

  if (index.status === "failed" && index.error_message) {
    return <Tooltip label={index.error_message}>{badge}</Tooltip>;
  }
  return badge;
}

function IndexColumnsCell({ structured }: { structured: StructuredIndex }) {
  return (
    <Group gap="xs" wrap="nowrap">
      {getIndexColumnNames(structured).map((name) => (
        <Code key={name}>{name}</Code>
      ))}
    </Group>
  );
}

function getColumns(): TreeTableColumnDef<TableIndex>[] {
  return [
    {
      id: "name",
      header: t`Name`,
      minWidth: "auto",
      maxAutoWidth: 320,
      accessorFn: (index) => index.index_name,
      cell: ({ row }) => <Ellipsified>{row.original.index_name}</Ellipsified>,
    },
    {
      id: "kind",
      header: t`Kind`,
      width: "auto",
      accessorFn: (index) => index.structured.kind,
      cell: ({ row }) => <Badge>{row.original.structured.kind}</Badge>,
    },
    {
      id: "columns",
      header: t`Columns`,
      minWidth: "auto",
      maxAutoWidth: 480,
      accessorFn: (index) => getIndexColumnNames(index.structured).join(", "),
      cell: ({ row }) => (
        <IndexColumnsCell structured={row.original.structured} />
      ),
    },
    {
      id: "status",
      header: t`Status`,
      width: "auto",
      accessorFn: (index) => index.status,
      cell: ({ row }) => <IndexStatusCell index={row.original} />,
    },
    {
      id: "last_executed_at",
      header: t`Last run`,
      width: "auto",
      accessorFn: (index) => index.last_executed_at ?? "",
      cell: ({ row }) =>
        row.original.last_executed_at ? (
          <DateTime value={row.original.last_executed_at} />
        ) : (
          EMPTY_CELL_PLACEHOLDER
        ),
    },
  ];
}

type IndexTableProps = {
  indexes: TableIndex[];
};

export function IndexTable({ indexes }: IndexTableProps) {
  const columns = useMemo(() => getColumns(), []);
  const instance = useTreeTableInstance<TableIndex>({
    data: indexes,
    columns,
    getNodeId: (index) => String(index.id),
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
