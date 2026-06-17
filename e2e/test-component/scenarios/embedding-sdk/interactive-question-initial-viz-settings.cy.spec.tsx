const { H } = cy;
import { InteractiveQuestion } from "@metabase/embedding-sdk-react";

import { getSdkRoot } from "e2e/support/helpers/e2e-embedding-sdk-helpers";
import { mountSdkContent } from "e2e/support/helpers/embedding-sdk-component-testing/component-embedding-sdk-helpers";
import { signInAsAdminAndEnableEmbeddingSdk } from "e2e/support/helpers/embedding-sdk-testing";
import { mockAuthProviderAndJwtSignIn } from "e2e/support/helpers/embedding-sdk-testing/embedding-sdk-helpers";

describe("scenarios > embedding-sdk > interactive-question > initialVisualizationSettings prop", () => {
  beforeEach(() => {
    signInAsAdminAndEnableEmbeddingSdk();

    H.createNativeQuestion(
      {
        name: "Orders Initial Viz Settings Test",
        native: { query: "SELECT * FROM ORDERS LIMIT 5" },
      },
      {
        wrapId: true,
        idAlias: "questionId",
      },
    );

    cy.signOut();

    mockAuthProviderAndJwtSignIn();
  });

  it("should render overridden column header when initialVisualizationSettings renames a column", () => {
    cy.get<number>("@questionId").then((questionId) => {
      mountSdkContent(
        <InteractiveQuestion
          questionId={questionId}
          initialVisualizationSettings={{
            column_settings: {
              '["name","ID"]': { column_title: "Overridden ID" },
            },
          }}
        />,
      );
    });

    cy.log("Wait for the question to load and table to appear");
    getSdkRoot().within(() => {
      cy.log("The seeded column header should be visible");
      cy.findByText("Overridden ID").should("be.visible");

      cy.log("The original column name should not appear as a header");
      cy.findByText("ID").should("not.exist");

      H.assertTableRowsCount(5);
    });
  });

  it("should render original column header when initialVisualizationSettings is not provided", () => {
    cy.get<number>("@questionId").then((questionId) => {
      mountSdkContent(<InteractiveQuestion questionId={questionId} />);
    });

    cy.log("Wait for the question to load and table to appear");
    getSdkRoot().within(() => {
      cy.log("The original column header should be visible");
      cy.findByText("ID").should("be.visible");

      cy.log("The seeded column name should not appear");
      cy.findByText("Overridden ID").should("not.exist");

      H.assertTableRowsCount(5);
    });
  });
});
