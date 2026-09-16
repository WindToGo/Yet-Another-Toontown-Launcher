import { Box, Button, Group, Modal, Text } from "@mantine/core"
import { MTProfile, MTSession } from "../logic/MultiToonTypes"
import { IconKey, IconLink, IconPlugConnected, IconPlugOff, IconTrash } from "@tabler/icons-react"
import KeybindButtons from "./keybindButtons"
import { useDisclosure } from "@mantine/hooks"
import { useAppTheme } from "../../../themes/ThemeContext"
import { createSessionWithClick, removeProfile } from "../logic/multiUtils"
import { notifications } from "@mantine/notifications"
import AttatchMenu from "./attatchMenu"

export type MultiToonSessionHolderProps = {
  profile: MTProfile;
  yatlSessions: MTSession[];
  accounts: string[];
  EditMTProfile: (profile: MTProfile) => void;
  RemoveMTProfile: (name: string) => void;
  addMTSession: (session: MTSession) => void;
}

const MultiToonSessionHolder: React.FC<MultiToonSessionHolderProps> = ({ profile, EditMTProfile, RemoveMTProfile, addMTSession, yatlSessions, accounts }: MultiToonSessionHolderProps) => {
  const { colors } = useAppTheme();
  const [opened, { open, close }] = useDisclosure(false);
  const [attatchedModalOpened, attatchedModal] = useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const sessions = yatlSessions;
  var connectedSessions = 0;
  const isSessionConnected = sessions.some((session) => {
    return session.profile.name === profile.name
  })

  for (const session of sessions) {
    if (session.profile.name === profile.name) {
      connectedSessions++
    }
  }

  const handleConnectSession = async () => {
    const session: MTSession = await createSessionWithClick(profile)
    addMTSession(session)
    notifications.show({
      title: `Created New MultiToon Session ${session.mt_session}`,
      message: `On Profile ${profile.name} for window ${session.window}`
    })
  }

  const confirmRemoveProfile = async () => {
    closeDelete();
    const success = await removeProfile(profile.name);
    if (success) RemoveMTProfile(profile.name);
  }

  return (
    <>
      <Box
        style={{
          borderRadius: 10,
          borderColor: colors.Surface2,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
          display: "flex",
          justifyContent: "space-between",
          backgroundColor: colors.Crust,
          padding: "0.7rem 1rem",
        }}
      >
        <Text fw={500} style={{ flex: 1 }} size="lg">
          {profile.name}
        </Text>

        <Group>
          <Button
            size="xs"
            leftSection={isSessionConnected ?
              <IconPlugConnected size={"1rem"} color={colors.Mantle} /> :
              <IconPlugOff size={"1rem"} color={colors.Mantle} />
            }
            color={isSessionConnected ? colors.Green : colors.Blue}
            onClick={handleConnectSession}
          >
            <Text c={colors.Mantle} fw={600}>{isSessionConnected ? `${connectedSessions} Connected` : `Connect Session`}</Text>
          </Button>
          <Button
            size="xs"
            color={colors.Blue}
            onClick={attatchedModal.open}
            leftSection={<IconLink size={"1rem"} color={colors.Mantle} />}
          >
            <Text c={colors.Mantle} fw={600}>Attatch Profile</Text>
          </Button>
          <Button
            size="xs"
            color={colors.Blue}
            leftSection={<IconKey size={"1rem"} color={colors.Mantle} />}
            onClick={open}
          >
            <Text c={colors.Mantle} fw={600}>Edit Keymap</Text>
          </Button>
          <Button
            size="xs"
            color={colors.Red}
            onClick={openDelete}
          >
            <IconTrash size={"1rem"} color={colors.Mantle} />
          </Button>
        </Group>
      </Box >
      <Modal size='lg' opened={opened} onClose={close} title={profile.name + " Key Binds"}>
        {<KeybindButtons profile={profile} EditMTProfile={EditMTProfile} />}
      </Modal>
      <Modal size={'lg'} opened={attatchedModalOpened} onClose={attatchedModal.close} title={`Attatching Profile: ${profile.name}`}>
        <AttatchMenu accounts={accounts} EditMTProfile={EditMTProfile} profile={profile}/>
      </Modal>
      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete Profile" centered>
        <Text>Are you sure you want to delete {profile.name}?</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeDelete}>
            Cancel
          </Button>
          <Button color={colors.Red} onClick={confirmRemoveProfile}>
            Delete
          </Button>
        </Group>
      </Modal>
    </>
  )
}

export default MultiToonSessionHolder
