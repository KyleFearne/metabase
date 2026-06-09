import { renderWithProviders, screen } from "__support__/ui";
import { useGetAdhocQueryQuery } from "metabase/api";
import type { GeneratedCard } from "metabase/api/ai-streaming/schemas";
import { createMockDataset } from "metabase-types/api/mocks";

import { InlineChart } from "./InlineChart";

jest.mock("metabase/api", () => ({
  ...jest.requireActual("metabase/api"),
  useGetAdhocQueryQuery: jest.fn(),
}));

// Visualization pulls in the whole charting stack; stub it to a sentinel so we
// can unit test InlineChart's run / render-states logic.
jest.mock("metabase/visualizations/components/Visualization", () => ({
  __esModule: true,
  default: () => <div data-testid="visualization" />,
}));

const datasetQuery = {
  type: "query",
  query: { "source-table": 1 },
  database: 1,
} as any;

const value: GeneratedCard = {
  type: "card",
  id: "card-1",
  title: "Orders by month",
  query: { id: "q-1", query: datasetQuery },
  display: "bar",
};

function setup(queryResult: { data?: unknown; error?: unknown }) {
  jest.mocked(useGetAdhocQueryQuery).mockReturnValue(queryResult as any);
  return renderWithProviders(<InlineChart value={value} />);
}

describe("InlineChart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs the embedded query and renders the visualization", () => {
    setup({ data: createMockDataset() });
    expect(screen.getByTestId("metabot-inline-chart")).toBeInTheDocument();
    expect(screen.getByTestId("visualization")).toBeInTheDocument();
    expect(useGetAdhocQueryQuery).toHaveBeenCalledWith(datasetQuery);
  });

  it("shows the title and an open-in-new-tab affordance", () => {
    setup({ data: createMockDataset() });
    expect(screen.getByText("Orders by month")).toBeInTheDocument();
    // (the exact /question# href resolves against the router; covered by e2e)
    expect(screen.getByLabelText("Open in a new tab")).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  it("does not render the visualization while results are loading", () => {
    setup({ data: undefined });
    expect(screen.queryByTestId("visualization")).not.toBeInTheDocument();
  });

  it("shows an error message when the request fails", () => {
    setup({ data: undefined, error: { status: 500 } });
    expect(screen.queryByTestId("visualization")).not.toBeInTheDocument();
    expect(
      screen.getByText("There was a problem displaying this chart."),
    ).toBeInTheDocument();
  });

  it("shows an error message when the dataset comes back with an error", () => {
    setup({ data: createMockDataset({ error: "Something went wrong" }) });
    expect(screen.queryByTestId("visualization")).not.toBeInTheDocument();
    expect(
      screen.getByText("There was a problem displaying this chart."),
    ).toBeInTheDocument();
  });

  it("surfaces a permission error with the permission message", () => {
    setup({
      data: createMockDataset({
        error: "no access",
        error_type: "missing-required-permissions",
      }),
    });
    expect(
      screen.getByText("Sorry, you don't have permission to see this card."),
    ).toBeInTheDocument();
  });

  it("shows the curated error text when present", () => {
    setup({
      data: createMockDataset({
        error: "Column FOO does not exist",
        error_is_curated: true,
      }),
    });
    expect(screen.getByText("Column FOO does not exist")).toBeInTheDocument();
  });
});
