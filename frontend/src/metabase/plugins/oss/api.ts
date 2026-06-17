/* eslint-disable metabase/no-literal-metabase-strings -- request header names */
import type { OnBeforeRequestHandler } from "metabase/api/client";
import { isEmbeddingSdk } from "metabase/embedding-sdk/config";
import { isWithinIframe } from "metabase/utils/iframe";

const noop: OnBeforeRequestHandler = async () => {};

// Tag requests from a non-SDK app running inside an iframe (interactive /
// static / public embedding) so the backend knows it's embedded. Lives here
// rather than in `metabase/api` so the client stays free of SDK imports.
const setEmbeddedHeader: OnBeforeRequestHandler = async () => {
  if (isWithinIframe() && !isEmbeddingSdk()) {
    return { headers: { "X-Metabase-Embedded": "true" } };
  }
};

// Strip a null/absent `entityIdentifier` from the request params. It's an
// embedding-only concept: guest/public/static embeds address entities by
// token/uuid, and the embed override (see override-requests-for-embeds) keeps a
// real `entityIdentifier` so it can fill the `:entityIdentifier` url tag.
// Everywhere else it's null, so drop it here — once, instead of guarding every
// call site — and it never trails along as an `?entityIdentifier=` querystring
// param. Mutates `data` in place: the pipeline's merge can't delete keys, and
// the client defensively copies the bag for exactly this.
const dropNullEntityIdentifier: OnBeforeRequestHandler = async ({ data }) => {
  if (data.entityIdentifier == null) {
    delete data.entityIdentifier;
  }
};

const getDefaultPluginApi = () => ({
  onBeforeRequestHandlers: {
    // Unlike the other slots this carries real default behavior (not a no-op):
    // it's correct for every request — in embeds `entityIdentifier` is non-null
    // so it's a no-op there too.
    dropNullEntityIdentifier,
    overrideRequestsForPublicEmbeds: noop,
    rewriteEmbedPreviewUrl: noop,
    setEmbeddedHeader,
    // Emit the embedding client headers (`X-Metabase-Client` / `-Version`). A
    // no-op slot: the embedding setup flow installs `setRequestClientHeaders`
    // here, closing over the active client (see `embedding-request-auth`).
    // Untouched in the normal app — keeping these embedding-only headers out of
    // the generic api client.
    setRequestClientHeaders: noop,
    // Emit the embed-preview header (`X-Metabase-Embedded-Preview`). A no-op
    // slot: the public and SDK embed flows install `setEmbedPreviewHeader` here,
    // which tags requests when running inside an embed preview (see
    // `embedding-request-auth`).
    setEmbedPreviewHeader: noop,
    // Emit the embedding auth header (`X-Api-Key` or `X-Metabase-Session`). A
    // no-op slot: the embedding auth flow installs exactly one strategy here —
    // `setApiKeyHeader` or `setSessionTokenHeader` — based on the auth method in
    // use (see `embedding-request-auth`).
    setEmbeddingRequestAuthHeaders: noop,
  },
});

export const PLUGIN_API = getDefaultPluginApi();

/**
 * @internal Do not call directly. Use the main reinitialize function from metabase/plugins instead.
 */
export function reinitialize() {
  Object.assign(PLUGIN_API, getDefaultPluginApi());
}
