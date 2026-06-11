/**
 * The imports here are only called from the Embedding SDK.
 * This file is not imported from the main app, including the new iframe embedding.
 *
 * This is aliased as `sdk-specific-imports` in the SDK's webpack config.
 */

// Polyfills useSyncExternalStore for React 17 for backwards compatibility.
import "./polyfill/use-sync-external-store";

/**
 * We need to manually import them here to make sure they are included in the bundle
 * as they're dynamically loaded in the main codebase.
 *
 * This will crash the main app if it's included in the new iframe embedding plugin,
 * as we chunk-split these two dependencies to make it only dynamically loadable.
 */
import "html2canvas-pro";
import "jspdf";

/**
 * EChartsRenderer (and all of echarts) is loaded as an on-demand chunk in the
 * main app (see EChartsRenderer/lazy.ts) to keep echarts out of the initial
 * bundle. The SDK loads its code eagerly via a build-time manifest and can't
 * fetch on-demand chunks in a host app (they'd fail with a ChunkLoadError), so
 * we force EChartsRenderer into the bundle here. The dynamic `import()` then
 * resolves from the already-loaded module instead of fetching a chunk.
 */
import "metabase/visualizations/components/EChartsRenderer/EChartsRenderer";
