import { Box, Collapse, Group, Modal, Progress, Stack, Text } from "@mantine/core";
import { IconPlayerPlay, IconRefresh, IconTrash } from "@tabler/icons-react";
import { Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppTheme } from "../../../themes/ThemeContext";
import { PatchSession } from "../../../state";
import { formatBytes } from "../../../utils/formatBytes";

type AccountPanelProps = {
  handlePlay: (username: string) => Promise<void>;
  handleRemoveAccount: (username: string) => Promise<void>;
  accounts: string[];
  processIDs: Record<string, number>;
  patchSessions: Record<string, PatchSession>;
};

const AccountPanel: React.FC<AccountPanelProps> = ({
  handlePlay,
  handleRemoveAccount,
  accounts,
  processIDs,
  patchSessions,
}) => {
  return (
    <Box mt="md" style={{ width: "55%" }}>
      <Stack gap={10}>
        {accounts.map((username) => (
          <AccountItem
            username={username}
            handlePlay={handlePlay}
            handleRemoveAccount={handleRemoveAccount}
            processIDs={processIDs}
            patchSession={patchSessions[username]}
            key={username}
          />
        ))}
      </Stack>
    </Box>
  );
};

type AccountItemProps = {
  username: string;
  handlePlay: (username: string) => Promise<void>;
  handleRemoveAccount: (username: string) => Promise<void>;
  processIDs: Record<string, number>;
  patchSession?: PatchSession;
};

const AccountItem: React.FC<AccountItemProps> = ({
  username,
  handlePlay,
  handleRemoveAccount,
  processIDs,
  patchSession,
}) => {
  const { colors } = useAppTheme();
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const isPlaying = processIDs[username] >= 0;
  const isUpdating = !!patchSession;
  const patchFiles = Object.values(patchSession?.files ?? {});

  const confirmRemoveAccount = () => {
    closeDelete();
    void handleRemoveAccount(username);
  };

  return (
    <>
      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete Account" centered>
        <Text>Are you sure you want to delete {username}?</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeDelete}>
            Cancel
          </Button>
          <Button color={colors.Red} onClick={confirmRemoveAccount}>
            Delete
          </Button>
        </Group>
      </Modal>
      <Box
        style={{
          padding: "0.7rem 1rem",
          borderRadius: 10,
          backgroundColor: colors.Crust,
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
        }}
      >
        <Box style={{ display: "flex", justifyContent: "space-between" }}>
          <Text fw={500} style={{ flex: 1 }} size="lg">
            {username}
          </Text>
          <Group>
            {isUpdating ? (
              <Button size="xs" color={colors.Peach} loading>
                <Text c={colors.Mantle} fw={600}>Updating</Text>
              </Button>
            ) : isPlaying ? (
              <Button
                size="xs"
                color={colors.Green}
                leftSection={<IconRefresh size={"1rem"} color={colors.Mantle} />}
                onClick={() => {}}
              >
                <Text c={colors.Mantle} fw={600}>Restart</Text>
              </Button>
            ) : (
              <Button
                size="xs"
                color={colors.Blue}
                leftSection={<IconPlayerPlay size={"1rem"} color={colors.Mantle} />}
                onClick={() => void handlePlay(username)}
              >
                <Text c={colors.Mantle} fw={600}>Play</Text>
              </Button>
            )}
            <Button size="xs" color={colors.Red} onClick={openDelete}>
              <IconTrash size={"1rem"} color={colors.Mantle} />
            </Button>
          </Group>
        </Box>
        <Collapse in={isUpdating}>
          <Stack gap={6} pt={10} pl={32}>
            {patchFiles.length === 0 ? (
              <Text size="xs" c="dimmed">Preparing update…</Text>
            ) : (
              patchFiles.map((f) => (
                <Box key={f.file}>
                  <Group justify="space-between" gap={4} mb={2} wrap="nowrap">
                    <Text
                      size="xs"
                      c={colors.Subtext0}
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {f.file}
                    </Text>
                    <Text size="xs" c={colors.Subtext0} style={{ flexShrink: 0 }}>
                      {f.status === "error"
                        ? "Failed"
                        : f.totalBytes > 0
                          ? `${formatBytes(f.bytesDownloaded)} / ${formatBytes(f.totalBytes)}`
                          : formatBytes(f.bytesDownloaded)}
                    </Text>
                  </Group>
                  <Progress
                    value={f.totalBytes > 0 ? Math.min(100, (f.bytesDownloaded / f.totalBytes) * 100) : 100}
                    color={f.status === "error" ? colors.Red : colors.Blue}
                    striped={f.status !== "error" && f.totalBytes <= 0}
                    animated={f.status !== "error" && f.totalBytes <= 0}
                    size="sm"
                  />
                </Box>
              ))
            )}
          </Stack>
        </Collapse>
      </Box>
    </>
  );
};

export default AccountPanel;
