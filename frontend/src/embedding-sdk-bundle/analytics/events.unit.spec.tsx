// jest.mock is hoisted before imports, so jest.fn() must be defined inline.
// External const refs (like `const mockFoo = jest.fn()`) cause TDZ errors.
jest.mock("metabase/analytics/event", () => ({
  trackSimpleEvent: jest.fn(),
}));

jest.mock("embedding-sdk-shared/lib/get-build-info", () => ({
  getSdkPackageVersion: jest.fn(() => "1.2.3"),
}));

import { renderHookWithProviders } from "__support__/ui";
import { sdkReducers } from "embedding-sdk-bundle/store";
import { createMockSdkState } from "embedding-sdk-bundle/test/mocks/state";
import { setupSdkState } from "embedding-sdk-bundle/test/server-mocks/sdk-init";
import { trackSimpleEvent } from "metabase/analytics/event";
import { createMockSettings } from "metabase-types/api/mocks";

import type { SdkComponentName } from "./component-events";
import { useTrackSdkComponentMount } from "./component-events";

const mockTrackSimpleEvent = jest.mocked(trackSimpleEvent);

// Unique instance counter so firedKeys never causes cross-test interference.
let nextId = 1;
const uniqueId = () => nextId++;

const STUB_DASHBOARD_PROPS = {
  with_title: false,
  with_downloads: false,
  with_subscriptions: false,
  auto_refresh: false,
  enable_entity_navigation: false,
};

interface SetupOptions {
  trackingEnabled?: boolean;
  componentName: SdkComponentName;
  entityId?: number | null;
  properties?: Record<string, unknown>;
}

function setup({
  trackingEnabled = true,
  componentName,
  entityId = null,
  properties = {},
}: SetupOptions) {
  const { state } = setupSdkState({
    settingValues: createMockSettings({
      "anon-tracking-enabled": trackingEnabled,
    }),
    sdkState: createMockSdkState(),
  });

  return renderHookWithProviders(
    () => useTrackSdkComponentMount(componentName, entityId, properties),
    { storeInitialState: state, customReducers: sdkReducers },
  );
}

describe("useTrackSdkComponentMount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fires one event when tracking is enabled", () => {
    setup({
      componentName: "StaticDashboard",
      entityId: uniqueId(),
      properties: { ...STUB_DASHBOARD_PROPS, with_title: true },
    });

    expect(mockTrackSimpleEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackSimpleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "embedding_sdk_component_rendered",
        triggered_from: "StaticDashboard",
        event_detail: expect.stringContaining('"with_title":"true"'),
      }),
    );
  });

  it("does not fire when tracking is disabled", () => {
    setup({
      trackingEnabled: false,
      componentName: "StaticDashboard",
      entityId: uniqueId(),
      properties: STUB_DASHBOARD_PROPS,
    });

    expect(mockTrackSimpleEvent).not.toHaveBeenCalled();
  });

  it("deduplicates — re-renders with the same instance key do not re-fire", () => {
    const { rerender } = setup({
      componentName: "InteractiveDashboard",
      entityId: uniqueId(),
      properties: STUB_DASHBOARD_PROPS,
    });
    rerender();
    rerender();

    expect(mockTrackSimpleEvent).toHaveBeenCalledTimes(1);
  });

  it("fires separate events for two mounts of the same component type", () => {
    const { state } = setupSdkState({
      settingValues: createMockSettings({ "anon-tracking-enabled": true }),
      sdkState: createMockSdkState(),
    });
    const renderOptions = {
      storeInitialState: state,
      customReducers: sdkReducers,
    };

    renderHookWithProviders(
      () =>
        useTrackSdkComponentMount(
          "StaticDashboard",
          uniqueId(),
          STUB_DASHBOARD_PROPS,
        ),
      renderOptions,
    );
    renderHookWithProviders(
      () =>
        useTrackSdkComponentMount(
          "StaticDashboard",
          uniqueId(),
          STUB_DASHBOARD_PROPS,
        ),
      renderOptions,
    );

    expect(mockTrackSimpleEvent).toHaveBeenCalledTimes(2);
  });

  it("uses the correct component name as triggered_from", () => {
    setup({ componentName: "MetabotQuestion", properties: { layout: "auto" } });

    expect(mockTrackSimpleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ triggered_from: "MetabotQuestion" }),
    );
  });

  it("fires for CreateDashboardModal with empty properties", () => {
    setup({ componentName: "CreateDashboardModal" });

    expect(mockTrackSimpleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "embedding_sdk_component_rendered",
        triggered_from: "CreateDashboardModal",
      }),
    );
  });

  it("includes sdk_version in event_detail JSON", () => {
    setup({
      componentName: "StaticDashboard",
      entityId: uniqueId(),
      properties: STUB_DASHBOARD_PROPS,
    });

    const call = mockTrackSimpleEvent.mock.calls[0][0];
    const detail = JSON.parse(call.event_detail!);
    expect(detail.sdk_version).toBe("1.2.3");
  });
});
