import {
  setupAlertsEndpoints,
  setupCardEndpoints,
  setupCardQueryEndpoints,
  setupCardQueryMetadataEndpoint,
  setupCollectionByIdEndpoint,
  setupDatabaseEndpoints,
  setupDatabaseListEndpoint,
  setupSearchEndpoints,
  setupTableEndpoints,
} from "__support__/server-mocks";
import { setupWebhookChannelsEndpoint } from "__support__/server-mocks/channel";
import {
  setupCreateNotificationEndpoint,
  setupListNotificationEndpoints,
} from "__support__/server-mocks/notification";
import { screen, waitForLoaderToBeRemoved } from "__support__/ui";
import { useSdkQuestionContext } from "embedding-sdk-bundle/components/private/SdkQuestion/context";
import {
  TEST_DATASET,
  TEST_DB,
  TEST_TABLE,
} from "embedding-sdk-bundle/components/public/question/shared-tests/constants.spec";
import { renderWithSDKProviders } from "embedding-sdk-bundle/test/__support__/ui";
import { createMockSdkConfig } from "embedding-sdk-bundle/test/mocks/config";
import { setupSdkState } from "embedding-sdk-bundle/test/server-mocks/sdk-init";
import { isSavedQuestionChanged } from "metabase/querying/common/utils/question";
import type { VisualizationSettings } from "metabase-types/api";
import {
  createMockCard,
  createMockCardQueryMetadata,
  createMockCollection,
  createMockUser,
} from "metabase-types/api/mocks";

import { InteractiveQuestion } from "./InteractiveQuestion";

/**
 * Reads the question + baseline from context and exposes whether the question is
 * considered changed-from-saved, so we can assert seeded settings don't register
 * as unsaved changes.
 */
const DirtyStateProbe = () => {
  const { question, originalQuestion } = useSdkQuestionContext();
  const isChanged =
    question && originalQuestion
      ? isSavedQuestionChanged(question, originalQuestion)
      : null;
  return <div data-testid="dirty-probe" data-changed={String(isChanged)} />;
};

// Capture rawSeries passed to the visualization so we can assert on merged settings.
const mockRawSeriesCapture: { current: any[] | null } = { current: null };

jest.mock("metabase/querying/components/QueryVisualization", () => ({
  QueryVisualization: (props: any) => {
    mockRawSeriesCapture.current = props.rawSeries;
    return <div data-testid="query-visualization-root" />;
  },
}));

const TEST_CARD_ID = 1;
const COLLECTION_ID = 1;

const TEST_COLLECTION = createMockCollection({
  archived: false,
  can_write: true,
  description: null,
  id: COLLECTION_ID,
  location: "/",
  name: "Test collection",
  personal_owner_id: 100,
});

interface SetupOpts {
  savedVizSettings?: VisualizationSettings;
  initialVisualizationSettings?: VisualizationSettings;
  children?: React.ReactNode;
}

const setup = async ({
  savedVizSettings = {},
  initialVisualizationSettings,
  children,
}: SetupOpts = {}) => {
  mockRawSeriesCapture.current = null;

  const user = createMockUser({ id: 999, is_superuser: true });
  const { state } = setupSdkState({ currentUser: user });

  const card = createMockCard({
    id: TEST_CARD_ID,
    name: "My Question",
    type: "question",
    collection_id: COLLECTION_ID,
    collection: TEST_COLLECTION,
    visualization_settings: savedVizSettings,
  });

  setupCardEndpoints(card);
  setupCardQueryMetadataEndpoint(
    card,
    createMockCardQueryMetadata({
      databases: [TEST_DB],
      tables: [TEST_TABLE],
    }),
  );
  setupAlertsEndpoints(card, []);
  setupDatabaseEndpoints(TEST_DB);
  setupTableEndpoints(TEST_TABLE);
  setupCardQueryEndpoints(card, TEST_DATASET);
  setupCollectionByIdEndpoint({ collections: [TEST_COLLECTION] });
  setupListNotificationEndpoints({ card_id: card.id }, []);
  setupWebhookChannelsEndpoint();
  setupCreateNotificationEndpoint();
  setupSearchEndpoints([]);
  setupDatabaseListEndpoint([]);

  renderWithSDKProviders(
    <InteractiveQuestion
      questionId={TEST_CARD_ID}
      initialVisualizationSettings={initialVisualizationSettings}
    >
      {children}
    </InteractiveQuestion>,
    {
      componentProviderProps: { authConfig: createMockSdkConfig() },
      storeInitialState: state,
    },
  );

  await waitForLoaderToBeRemoved();
};

describe("InteractiveQuestion initialVisualizationSettings", () => {
  it("renders with saved settings when no initialVisualizationSettings is provided", async () => {
    const savedSettings: VisualizationSettings = {
      "table.pivot": true,
      "graph.x_axis.scale": "linear",
    };

    await setup({ savedVizSettings: savedSettings });

    expect(screen.getByTestId("query-visualization-root")).toBeInTheDocument();

    const rawSeries = mockRawSeriesCapture.current;
    expect(rawSeries).not.toBeNull();
    expect(rawSeries![0].card.visualization_settings).toEqual(
      expect.objectContaining(savedSettings),
    );
  });

  it("seeds initialVisualizationSettings into the question at load time", async () => {
    const savedSettings: VisualizationSettings = {
      "table.pivot": true,
      "graph.x_axis.scale": "linear",
    };
    const initialSettings: VisualizationSettings = {
      "table.pivot": false,
      "card.title": "Overridden Title",
    };

    await setup({
      savedVizSettings: savedSettings,
      initialVisualizationSettings: initialSettings,
    });

    expect(screen.getByTestId("query-visualization-root")).toBeInTheDocument();

    const rawSeries = mockRawSeriesCapture.current;
    expect(rawSeries).not.toBeNull();

    const mergedSettings = rawSeries![0].card.visualization_settings;
    // Initial override wins for conflicting keys
    expect(mergedSettings["table.pivot"]).toBe(false);
    // New key from initial settings is present
    expect(mergedSettings["card.title"]).toBe("Overridden Title");
    // Saved-only key is preserved
    expect(mergedSettings["graph.x_axis.scale"]).toBe("linear");
  });

  it("does not flag seeded settings as unsaved changes", async () => {
    await setup({
      savedVizSettings: { "table.pivot": true },
      initialVisualizationSettings: { "card.title": "Overridden Title" },
      children: <DirtyStateProbe />,
    });

    const probe = await screen.findByTestId("dirty-probe");
    // The seed is applied to both the question and its baseline, so the question
    // should not be considered changed-from-saved on load.
    expect(probe).toHaveAttribute("data-changed", "false");
  });
});
