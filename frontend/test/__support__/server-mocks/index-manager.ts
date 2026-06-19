import fetchMock from "fetch-mock";

import type { RequestIndex, TransformId } from "metabase-types/api";
import { createMockRequestIndex } from "metabase-types/api/mocks";

export function setupTableIndexEndpoints(
  transformId: TransformId,
  indexes: RequestIndex[] = [],
) {
  fetchMock.get({
    url: `path:/api/indexes`,
    query: { "transform-id": transformId },
    response: { data: indexes },
    name: `listTableIndexes-${transformId}`,
  });

  indexes.forEach((index) => {
    fetchMock.get(`path:/api/indexes/request/${index.id}`, index, {
      name: `getRequestIndex-${index.id}`,
    });
    fetchMock.delete(`path:/api/indexes/request/${index.id}`, 204, {
      name: `deleteRequestIndex-${index.id}`,
    });
  });

  fetchMock.post(
    `path:/api/indexes/request`,
    async (call) => {
      const lastCall = fetchMock.callHistory.lastCall(call.url);
      return createMockRequestIndex(await lastCall?.request?.json());
    },
    { name: `createRequestIndex` },
  );
}
