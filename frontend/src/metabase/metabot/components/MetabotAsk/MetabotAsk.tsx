import { useEffect } from "react";

import type { MetabotConfig } from "metabase/metabot/components/Metabot";
import { MetabotChat } from "metabase/metabot/components/MetabotChat";
import { useMetabotAgent } from "metabase/metabot/hooks";
import { Box } from "metabase/ui";

import S from "./MetabotAsk.module.css";

const askConfig: MetabotConfig = {
  agentId: "ask",
  disclaimerUnderInput: true,
  fullPageLayout: true,
  preventClose: true,
  suggestionModels: [
    "dataset",
    "metric",
    "card",
    "table",
    "database",
    "dashboard",
  ],
};

export const MetabotAsk = () => {
  const { setVisible: setSidebarVisible } = useMetabotAgent("omnibot");

  useEffect(
    function closeSidebarOnMount() {
      setSidebarVisible(false);
    },
    [setSidebarVisible],
  );

  return (
    <Box className={S.page}>
      <Box className={S.chatContainer}>
        <MetabotChat config={askConfig} />
      </Box>
    </Box>
  );
};
