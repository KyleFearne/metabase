import { useCallback, useState } from "react";
import { t } from "ttag";

import { useGetSettingsQuery } from "metabase/api";
import { usePurchaseCloudAddOnMutation } from "metabase/api/cloud-add-ons";
import { useTokenRefreshUntil } from "metabase/api/utils";
import { useHasTokenFeature, useSetting } from "metabase/common/hooks";
import { useMetadataToasts } from "metabase/metadata/hooks/useMetadataToasts";
import {
  Box,
  Button,
  Flex,
  Icon,
  Loader,
  Modal,
  type ModalProps,
  Stack,
  Text,
  Title,
} from "metabase/ui";

import { STORAGE_PRODUCT_TYPE } from "./use-storage-billing";

type Step = "initial" | "settingUp";

type StoragePurchaseModalProps = Pick<ModalProps, "opened" | "onClose"> & {
  /**
   * When opened from the CSV tab the user can only upload once uploads are actually enabled
   * (`uploads-settings.db_id` is populated). The `attached_dwh` token feature flips at runtime,
   * but the uploads database only appears after the instance redeploys and re-reads its config,
   * so this can take a few minutes. When set, the "ready" state waits for uploads, not just the
   * token feature.
   */
  waitForUploadsEnabled?: boolean;
};

export const StoragePurchaseModal = ({
  opened,
  onClose,
  waitForUploadsEnabled = false,
}: StoragePurchaseModalProps) => {
  const [step, setStep] = useState<Step>("initial");
  const { sendErrorToast } = useMetadataToasts();
  const [purchaseCloudAddOn, { isLoading: isPurchasing }] =
    usePurchaseCloudAddOnMutation();

  const handlePurchase = useCallback(async () => {
    setStep("settingUp");
    try {
      await purchaseCloudAddOn({ product_type: STORAGE_PRODUCT_TYPE }).unwrap();
      // On success the setting-up step polls for the `attached_dwh` token feature (and, in the CSV
      // context, for uploads to be enabled) before showing the ready state. Errors fall back to a toast.
    } catch {
      setStep("initial");
      sendErrorToast(
        t`It looks like something went wrong. Please refresh the page and try again.`,
      );
    }
  }, [purchaseCloudAddOn, sendErrorToast]);

  const isSettingUp = step === "settingUp";

  // eslint-disable-next-line metabase/no-literal-metabase-strings -- Upsell for Metabase Storage, only visible to admins
  const modalTitle = t`Add Metabase Storage`;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="30rem"
      padding="2.5rem"
      title={isSettingUp ? undefined : modalTitle}
      // The setting-up step is dismissable via its own "Close"/"Done" button (provisioning finishes
      // server-side after an instance redeploy), so we drop the header X to avoid a duplicate control.
      withCloseButton={!isSettingUp}
      closeOnClickOutside={!isSettingUp}
    >
      {isSettingUp ? (
        <SettingUpStep
          waitForUploadsEnabled={waitForUploadsEnabled}
          onClose={() => onClose?.()}
        />
      ) : (
        <InitialStep
          isPurchasing={isPurchasing}
          onPurchase={handlePurchase}
          onCancel={() => onClose?.()}
        />
      )}
    </Modal>
  );
};

const StorageIcon = ({ settingUp = false }: { settingUp?: boolean }) => (
  <Box h={96} pos="relative" w={96}>
    <Flex
      align="center"
      justify="center"
      h="100%"
      w="100%"
      bg="background-secondary"
      style={{ borderRadius: "50%" }}
    >
      <Icon name="database" size={48} c="core-brand" />
    </Flex>

    {settingUp && (
      <Flex
        bottom={0}
        align="center"
        direction="row"
        gap={0}
        justify="center"
        pos="absolute"
        right={0}
        wrap="nowrap"
        bg="white"
        fz={0}
        p="sm"
        ta="center"
        style={{
          borderRadius: "100%",
          boxShadow: `0 1px 6px 0 var(--mb-color-shadow)`,
        }}
      >
        <Loader size="xs" ml={1} mt={1} />
      </Flex>
    )}
  </Box>
);

type InitialStepProps = {
  isPurchasing: boolean;
  onPurchase: () => void;
  onCancel: () => void;
};

const InitialStep = ({
  isPurchasing,
  onPurchase,
  onCancel,
}: InitialStepProps) => (
  <Stack align="center" gap="lg" mt="md">
    <StorageIcon />

    <Text c="text-secondary" ta="center" lh={1.43}>
      {t`Get a fully managed data warehouse. Upload CSV files and sync with Google Sheets.`}
    </Text>

    <Stack w="100%" gap="sm">
      <Button variant="filled" loading={isPurchasing} onClick={onPurchase}>
        {t`Add storage`}
      </Button>
      <Button variant="outline" onClick={onCancel}>
        {t`Cancel`}
      </Button>
    </Stack>

    <Text c="text-secondary" size="sm" lh={1.4} ta="center">
      {t`By clicking Add storage, you agree to be charged in accordance with our terms of service. You will not be charged until you reach 1M stored rows.`}
    </Text>
  </Stack>
);

type SettingUpStepProps = {
  waitForUploadsEnabled: boolean;
  onClose: () => void;
};

const SettingUpStep = ({
  waitForUploadsEnabled,
  onClose,
}: SettingUpStepProps) => {
  // The gate uses the underscore token feature; the poll uses the hyphenated token-status feature.
  useTokenRefreshUntil("attached-dwh", { intervalMs: 1000 });
  const hasStorage = useHasTokenFeature("attached_dwh");
  const areUploadsEnabled = !!useSetting("uploads-settings")?.db_id;

  // The `attached_dwh` token feature flips at runtime, but uploads only turn on once the instance
  // redeploys and re-reads its config (which creates the DWH database with `uploads_enabled`).
  // In the CSV context keep polling session-properties across that redeploy until uploads exist.
  useGetSettingsQuery(undefined, {
    pollingInterval: waitForUploadsEnabled && !areUploadsEnabled ? 1000 : 0,
  });

  const isReady =
    hasStorage && (waitForUploadsEnabled ? areUploadsEnabled : true);

  if (isReady) {
    return (
      <Stack align="center" gap="lg" my="4.5rem">
        <StorageIcon />

        <Box ta="center">
          <Title c="text-primary" fz="lg">
            {t`Storage is ready`}
          </Title>
          <Text c="text-secondary" fz="md" lh={1.43}>
            {t`You can now upload CSVs and sync Google Sheets.`}
          </Text>
        </Box>

        {/* The instance just redeployed, so cached data (e.g. the databases list) is stale; a
            reload is the reliable way to land in a working state. */}
        <Button
          variant="filled"
          size="md"
          onClick={() => {
            onClose();
            window.location.reload();
          }}
        >
          {t`Done`}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack align="center" gap="lg" my="4.5rem">
      <StorageIcon settingUp />

      <Box ta="center">
        <Title c="text-primary" fz="lg">
          {t`Setting up storage`}
        </Title>
        <Text c="text-secondary" fz="md" lh={1.43}>
          {t`This can take a few minutes.`}
        </Text>
      </Box>

      <Button variant="outline" size="md" onClick={onClose}>
        {t`Close`}
      </Button>
    </Stack>
  );
};
