import { useState } from "react";
import { Box, Button, Group, Text } from "@mantine/core";
import { IconClick } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { ClickSyncState, MTSession } from "../logic/MultiToonTypes";
import { startClickSync, stopClickSync } from "../logic/multiUtils";
import { useAppTheme } from "../../../themes/ThemeContext";

export type ClickSyncPanelProps = {
  sessions: MTSession[];
  clickSync: ClickSyncState;
  setKey: (key: string) => void;
  setListening: (listening: boolean, controllerSession: number | null) => void;
}

const ClickSyncPanel: React.FC<ClickSyncPanelProps> = ({ sessions, clickSync, setKey, setListening }: ClickSyncPanelProps) => {
  const { colors } = useAppTheme();
  const [capturingKey, setCapturingKey] = useState<boolean>(false);
  const { key, listening } = clickSync;

  const windows = Array.from(new Set(sessions.map((s) => s.window)));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!capturingKey) return;
    event.preventDefault();
    setKey(event.key);
    setCapturingKey(false);
  };

  const handleStart = async () => {
    if (!key || windows.length < 2) return;

    const controller = sessions[0].mt_session;
    try {
      await startClickSync(controller, key, windows);
    } catch (err) {
      notifications.show({ color: "red", title: "Click Sync Failed to Start", message: String(err) });
      return;
    }
    setListening(true, controller);
    notifications.show({
      title: "Click Sync Started",
      message: `Hold '${key}' and click any of ${windows.length} windows to mirror the click`,
    });
  };

  const handleStop = async () => {
    if (clickSync.controllerSession === null) return;
    await stopClickSync(clickSync.controllerSession);
    setListening(false, null);
    notifications.show({ title: "Click Sync Stopped", message: "" });
  };

  return (
    <Box
      onKeyDown={handleKeyDown}
      style={{
        borderRadius: 10,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.Crust,
        padding: "0.7rem 1rem",
      }}
    >
      <Group>
        <IconClick color={colors.Blue} />
        <Text fw={500}>Click Sync</Text>
        <Text c={colors.Subtext0} size="sm">
          {windows.length < 2
            ? "Connect at least 2 sessions to sync clicks"
            : `${windows.length} window(s) connected`}
        </Text>
      </Group>
      <Group>
        <Button
          w={"8rem"}
          variant={capturingKey ? "filled" : "outline"}
          color={capturingKey ? "blue" : "gray"}
          disabled={listening}
          onClick={() => setCapturingKey(true)}
        >
          <Text>{capturingKey ? "..." : key || "Set Key"}</Text>
        </Button>
        <Button
          color={listening ? colors.Red : colors.Blue}
          disabled={!listening && (!key || windows.length < 2)}
          onClick={listening ? handleStop : handleStart}
        >
          {listening ? "Stop Listener" : "Start Listener"}
        </Button>
      </Group>
    </Box>
  );
}

export default ClickSyncPanel
