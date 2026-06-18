import userEvent from "@testing-library/user-event";
import fetchMock from "fetch-mock";

import { setupPropertiesEndpoints } from "__support__/server-mocks";
import { mockSettings } from "__support__/settings";
import { renderWithProviders, screen, waitFor } from "__support__/ui";
import { createMockState } from "metabase/redux/store/mocks";
import type { TokenFeatures } from "metabase-types/api";
import {
  createMockSettings,
  createMockTokenFeatures,
  createMockTokenStatus,
} from "metabase-types/api/mocks";

import { StoragePurchaseModal } from "./StoragePurchaseModal";

interface SetupOpts {
  waitForUploadsEnabled?: boolean;
  tokenFeatures?: Partial<TokenFeatures>;
  uploadDbId?: number | null;
}

const setup = ({
  waitForUploadsEnabled = false,
  tokenFeatures = {},
  uploadDbId = null,
}: SetupOpts = {}) => {
  const onClose = jest.fn();

  const settingValues = {
    "token-features": createMockTokenFeatures(tokenFeatures),
    "uploads-settings": {
      db_id: uploadDbId,
      schema_name: null,
      table_prefix: null,
    },
  };

  setupPropertiesEndpoints(
    createMockSettings({
      ...settingValues,
      "token-status": createMockTokenStatus({
        features: tokenFeatures.attached_dwh ? ["attached-dwh"] : [],
      }),
    }),
  );
  fetchMock.post("path:/api/ee/cloud-add-ons/dwh-rent", 200);
  fetchMock.post(
    "path:/api/premium-features/token/refresh",
    createMockTokenStatus(),
  );

  renderWithProviders(
    <StoragePurchaseModal
      opened
      onClose={onClose}
      waitForUploadsEnabled={waitForUploadsEnabled}
    />,
    {
      storeInitialState: createMockState({
        settings: mockSettings(settingValues),
      }),
    },
  );

  return { onClose };
};

const clickAddStorage = () =>
  userEvent.click(screen.getByRole("button", { name: "Add storage" }));

describe("StoragePurchaseModal", () => {
  it("renders the minimal purchase layout with the disclaimer", () => {
    setup();

    expect(
      screen.getByText(
        "Get a fully managed data warehouse. Upload CSV files and sync with Google Sheets.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /You will not be charged until you reach 1M stored rows/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add storage" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("purchases the add-on and transitions to the setting-up state", async () => {
    setup();

    await clickAddStorage();

    expect(await screen.findByText("Setting up storage")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        fetchMock.callHistory.called("path:/api/ee/cloud-add-ons/dwh-rent", {
          method: "POST",
        }),
      ).toBe(true);
    });
  });

  it("shows the ready state once storage is attached", async () => {
    setup({ tokenFeatures: { attached_dwh: true } });

    await clickAddStorage();

    expect(await screen.findByText("Storage is ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
  });

  it("keeps waiting (and stays closable) when uploads are not enabled yet in the CSV context", async () => {
    const { onClose } = setup({
      waitForUploadsEnabled: true,
      tokenFeatures: { attached_dwh: true },
      uploadDbId: null,
    });

    await clickAddStorage();

    expect(await screen.findByText("Setting up storage")).toBeInTheDocument();
    expect(screen.queryByText("Storage is ready")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Done" }),
    ).not.toBeInTheDocument();

    // The setting-up step is dismissable so the user doesn't have to wait out the redeploy.
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the ready state once uploads are enabled in the CSV context", async () => {
    setup({
      waitForUploadsEnabled: true,
      tokenFeatures: { attached_dwh: true },
      uploadDbId: 1,
    });

    await clickAddStorage();

    expect(await screen.findByText("Storage is ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
  });
});
