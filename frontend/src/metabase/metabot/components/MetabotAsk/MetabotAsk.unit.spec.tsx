import { renderWithProviders, screen } from "__support__/ui";
import type { MetabotConfig } from "metabase/metabot/components/Metabot";
import { useMetabotAgent } from "metabase/metabot/hooks";

import { MetabotAsk } from "./MetabotAsk";

jest.mock("metabase/metabot/hooks", () => ({
  ...jest.requireActual("metabase/metabot/hooks"),
  useMetabotAgent: jest.fn(),
}));

jest.mock("metabase/metabot/components/MetabotChat", () => ({
  MetabotChat: ({ config }: { config: Pick<MetabotConfig, "agentId"> }) => (
    <div data-testid="metabot-chat">{config.agentId}</div>
  ),
}));

function setup() {
  const setVisible = jest.fn();
  const metabotAgent = {
    activeToolCalls: [],
    cancelRequest: jest.fn(),
    debugMode: false,
    isDoingScience: false,
    isLongConversation: false,
    messages: [],
    metabotId: 1,
    prompt: "",
    promptInputRef: undefined,
    reactions: {
      navigateToPath: null,
      suggestedCodeEdits: {},
      suggestedTransforms: [],
    },
    resetConversation: jest.fn(),
    retryMessage: jest.fn(),
    setProfileOverride: jest.fn(),
    setPrompt: jest.fn(),
    setVisible,
    submitInput: jest.fn(),
    visible: false,
  } satisfies ReturnType<typeof useMetabotAgent>;

  jest.mocked(useMetabotAgent).mockReturnValue(metabotAgent);

  renderWithProviders(<MetabotAsk />);

  return { setVisible };
}

describe("MetabotAsk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the full-page chat on the `ask` surface", () => {
    setup();

    expect(screen.getByTestId("metabot-chat")).toHaveTextContent("ask");
  });

  it("closes the global Metabot sidebar when the full-page surface mounts", () => {
    const { setVisible } = setup();

    expect(useMetabotAgent).toHaveBeenCalledWith("omnibot");
    expect(setVisible).toHaveBeenCalledWith(false);
  });
});
