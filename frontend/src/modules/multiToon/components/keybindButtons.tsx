import { useState } from "react";
import { groups, MTProfile } from "../logic/MultiToonTypes";
import { Box, Button, Divider, Group, Text } from "@mantine/core";
import { saveProfile } from "../logic/multiUtils";
import { useAppTheme } from "../../../themes/ThemeContext";

export type KeybindButtonProps = {
  profile: MTProfile
  EditMTProfile: (profile: MTProfile) => void;
}

const KeybindButtons: React.FC<KeybindButtonProps> = ({ profile, EditMTProfile }: KeybindButtonProps) => {
  const { colors } = useAppTheme();
  const [listeningFor, setListeningFor] = useState<string | null>(null);
  const handleButtonClick = (action: string) => {
    setListeningFor(action);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!listeningFor) return;

    event.preventDefault();
    const key = event.key;

    profile.keyMap[listeningFor] = key;

    EditMTProfile(profile);

    setListeningFor(null);
  };

  const handleClearKey = (action: string) => {
    profile.keyMap[action] = "";
    EditMTProfile(profile);
  }

  return (
    <>
      {Object.entries(groups).map(([groupName, actions]) => (
        <Box key={groupName} onKeyDown={handleKeyDown}>
          <Text
            fw={700}
            size="lg"
            pt={"1rem"}
            pb={"1.5rem"}
          >{groupName}</Text>
          {actions.map(action => (
            <Box key={action} w="100%" pb={"1rem"} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>{action}</Text>
              <Group>
                <Button
                  w={"10rem"}
                  key={action}
                  variant={listeningFor === action ? 'filled' : 'outline'}
                  color={listeningFor === action ? 'blue' : 'gray'}
                  onClick={() => handleButtonClick(action)}
                >
                  <Text>{listeningFor === action ? '...' : profile.keyMap[action]}</Text>
                </Button>
                <Button variant="outline" onClick={() => handleClearKey(action)}>
                  Clear
                </Button>
              </Group>
            </Box>
          ))}
          {groupName !== "Debug" && <Divider />}
        </Box>
      ))}
      <Box
        w="100%"
        pos="sticky"
        pt={"0.5rem"}
        pb={"0.5rem"}
        bg={colors.Base}
        bottom={0}
        style={{
          zIndex: 10,
          justifyContent: 'right',
          display: 'flex',
        }}
      >
        <Button onClick={async () => await saveProfile(profile)}>
          Save
        </Button>
      </Box>
    </>
  );
}

export default KeybindButtons
