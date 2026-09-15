import { Box, Group, Text } from "@mantine/core";
import { IconGripVertical, IconPlayerPlay, IconRefresh, IconTrash } from "@tabler/icons-react";
import { Button } from "@mantine/core";
import { Reorder, useDragControls } from "framer-motion";
import { useEffect, useState } from "react";
import * as motion from "motion/react-client";
import dreamlandTheme from "../../../themes/DreamlandTheme";
import { CatppuccinColors } from "../../../themes/CatppuccinMocha";

type AccountPanelProps = {
  handlePlay: (username: string) => Promise<void>;
  accounts: string[];
  processIDs: Record<string, number>;
};

const AccountPanel: React.FC<AccountPanelProps> = ({
  handlePlay,
  accounts,
  processIDs,
}) => {
  const [localAccounts, setLocalAccounts] = useState(accounts);

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  return (
    <Box>
      <Reorder.Group
        axis="y"
        values={localAccounts}
        onReorder={setLocalAccounts}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        {localAccounts.map((username) => (
          <AccountItem
            username={username}
            handlePlay={handlePlay}
            processIDs={processIDs}
            key={`${username}-${processIDs[username] ?? 0}`}
          />
        ))}
      </Reorder.Group>
    </Box>
  );
};

type AccountItemProps = {
  username: string;
  handlePlay: (username: string) => Promise<void>;
  processIDs: Record<string, number>;
};

const AccountItem: React.FC<AccountItemProps> = ({ username, handlePlay, processIDs }) => {
  const controls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);
  const isPlaying = processIDs[username] >= 0;

  return (
    <motion.div whileTap={isDragging ? { scale: 1.01 } : { scale: 1 }}>
      <Box pb={5}>
        <Reorder.Item
          value={username}
          dragListener={false}
          dragControls={controls}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "0.7rem 1rem",
            borderRadius: 10,
            backgroundColor: dreamlandTheme.colors!.dark![9],
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
          }}
        >
          <Box
            onPointerDown={(e) => controls.start(e)}
            style={{ cursor: isDragging ? "grabbing" : "grab", marginRight: 12 }}
          >
            <IconGripVertical size={20} />
          </Box>
          <Text fw={500} style={{ flex: 1 }} size="lg">
            {username}
          </Text>
          <Group>
            {isPlaying ? (
              <Button
                size="xs"
                color={CatppuccinColors.Green}
                leftSection={<IconRefresh size={"1rem"} color={CatppuccinColors.Mantle} />}
                onClick={() => {}}
              >
                <Text c={CatppuccinColors.Mantle} fw={600}>Restart</Text>
              </Button>
            ) : (
              <Button
                size="xs"
                color={CatppuccinColors.Blue}
                leftSection={<IconPlayerPlay size={"1rem"} color={CatppuccinColors.Mantle} />}
                onClick={() => void handlePlay(username)}
              >
                <Text c={CatppuccinColors.Mantle} fw={600}>Play</Text>
              </Button>
            )}
            <Button size="xs" color={CatppuccinColors.Red}>
              <IconTrash size={"1rem"} color={CatppuccinColors.Mantle} />
            </Button>
          </Group>
        </Reorder.Item>
      </Box>
    </motion.div>
  );
};

export default AccountPanel;
