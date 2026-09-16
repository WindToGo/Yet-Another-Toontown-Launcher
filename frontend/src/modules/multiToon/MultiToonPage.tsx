import { Box, Button, Divider, Modal, Text, TextInput } from "@mantine/core";
import MultiToonSessionHolder from "./components/MultiToonSessionHolder";
import ClickSyncPanel from "./components/clickSyncPanel";
import { MultiToonPageProps } from "./logic/MultiToonTypes"
import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { IconDeviceFloppy, IconManualGearbox, IconPlus, IconQuestionMark, IconUserCog } from "@tabler/icons-react";
import { FloatingButton } from "../../components/buttons";
import { newProfile, saveProfiles } from "./logic/multiUtils";
import { notifications } from "@mantine/notifications";

const MultiToonPage: React.FC<MultiToonPageProps> = ({ MTSessions, AddMTSession, AddMTProfile, yatlProfiles, EditMTProfile, RemoveMTProfile, accounts, clickSync, SetClickSyncKey, SetClickSyncListening }: MultiToonPageProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [profileName, setProfilename] = useState<string>("");
  const profiles = yatlProfiles

  const handleAddNewProfile = async () => {
    const trimmedName = profileName.trim();
    if (!trimmedName) return;

    if (yatlProfiles.some(p => p.name === trimmedName)) {
      notifications.show({
        title: "Error Creating Profile",
        message: "Profile Name Already In Use",
        color: 'red',
      });
      return;
    }

    const profile = await newProfile(trimmedName);

    AddMTProfile(profile);
    setProfilename("");
    close();
  }

  return (
    <>
      <Box
        pb={"1rem"}
        style={{
          display: "flex",
          justifyContent: "space-between"
        }}
      >
        <Box style={{ display: "flex" }}>
          <Text pr={"0.4rem"}>Yet Another Toontown Launcher</Text>
          <IconManualGearbox />
        </Box>
      </Box>
      <Divider pb={"1rem"} />
      <Box pb={"1rem"}>
        <ClickSyncPanel
          sessions={MTSessions}
          clickSync={clickSync}
          setKey={SetClickSyncKey}
          setListening={SetClickSyncListening}
        />
      </Box>
      {profiles.map((profile) => {
        return (
          <Box pb={"0.5rem"} pt={"0.5rem"}>
            <MultiToonSessionHolder
              profile={profile}
              EditMTProfile={EditMTProfile}
              RemoveMTProfile={RemoveMTProfile}
              addMTSession={AddMTSession}
              yatlSessions={MTSessions}
              accounts={accounts}
            />
          </Box>
        )
      })}
      <Modal
        title={"New Multi-Toon Profile"}
        opened={opened}
        onClose={() => {
          setProfilename("");
          close()
        }}
        size={'lg'}
      >
        <TextInput
          data-autofocus
          value={profileName}
          placeholder="Profile Name"
          onChange={(e) => setProfilename(e.target.value)}
          pb={"1.2rem"}
        />
        <Button
          variant="light"
          leftSection={<IconUserCog />}
          onClick={handleAddNewProfile}
        >
          Create Profile
        </Button>
      </Modal>
      <FloatingButton right={"14rem"} onClick={() => { }}>
        <IconQuestionMark size="2.5rem" />
      </FloatingButton>

      <FloatingButton right="8rem" onClick={async () => await saveProfiles(profiles)}>
        <IconDeviceFloppy size="2.5rem" />
      </FloatingButton>

      <FloatingButton right="2rem" onClick={open}>
        <IconPlus size="2.5rem" />
      </FloatingButton>
    </>
  )
}


export default MultiToonPage
