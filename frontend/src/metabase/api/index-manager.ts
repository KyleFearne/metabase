import type {
  CreateRequestIndexRequest,
  ListTableIndexesRequest,
  ListTableIndexesResponse,
  MergedIndex,
  RequestIndex,
  RequestIndexId,
  UpdateRequestIndexRequest,
} from "metabase-types/api";

import { Api } from "./api";
import {
  idTag,
  invalidateTags,
  listTag,
  provideRequestIndexTags,
  provideTableIndexListTags,
} from "./tags";

export const indexManagerApi = Api.injectEndpoints({
  endpoints: (builder) => ({
    listTableIndexes: builder.query<MergedIndex[], ListTableIndexesRequest>({
      query: (params) => ({
        method: "GET",
        url: "/api/indexes",
        params,
      }),
      transformResponse: (response: ListTableIndexesResponse) => response.data,
      providesTags: (indexes = []) => provideTableIndexListTags(indexes),
    }),
    getRequestIndex: builder.query<RequestIndex, RequestIndexId>({
      query: (id) => ({
        method: "GET",
        url: `/api/indexes/request/${id}`,
      }),
      providesTags: (index) => (index ? provideRequestIndexTags(index) : []),
    }),
    createRequestIndex: builder.mutation<
      RequestIndex,
      CreateRequestIndexRequest
    >({
      query: (body) => ({
        method: "POST",
        url: "/api/indexes/request",
        body,
      }),
      invalidatesTags: (_index, error, { transform_id }) =>
        invalidateTags(error, [
          listTag("table-index"),
          idTag("transform", transform_id),
        ]),
    }),
    updateRequestIndex: builder.mutation<
      RequestIndex,
      UpdateRequestIndexRequest
    >({
      query: ({ id, ...body }) => ({
        method: "PUT",
        url: `/api/indexes/request/${id}`,
        body,
      }),
      invalidatesTags: (_index, error, { id }) =>
        invalidateTags(error, [
          listTag("table-index"),
          idTag("table-index", id),
        ]),
    }),
    deleteRequestIndex: builder.mutation<void, RequestIndexId>({
      query: (id) => ({
        method: "DELETE",
        url: `/api/indexes/request/${id}`,
      }),
      invalidatesTags: (_index, error, id) =>
        invalidateTags(error, [
          listTag("table-index"),
          idTag("table-index", id),
        ]),
    }),
  }),
});

export const {
  useListTableIndexesQuery,
  useGetRequestIndexQuery,
  useLazyGetRequestIndexQuery,
  useCreateRequestIndexMutation,
  useUpdateRequestIndexMutation,
  useDeleteRequestIndexMutation,
} = indexManagerApi;
