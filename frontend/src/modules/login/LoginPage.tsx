import React, { useState } from "react";
import {
  Box,
  Divider,
  Modal,
  SegmentedControl,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { LoginProps } from "./logic/LoginTypes";
import NewAccount from "./components/newAccount";
import { IconManualGearbox, IconPlus, IconQuestionMark } from "@tabler/icons-react";
import AccountPanel from "./components/accountPanel";
import { FloatingButton } from "../../components/buttons";

const LoginPage: React.FC<LoginProps> = ({
  handlePlay,
  processIDs,
  accounts,
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [pageMode, setPageMode] = useState<string>('accounts')
  // TODO: Add button for restart
  return (
    <>
      <div style={{ zIndex: 2, position: "relative"}} >
      <Modal
        opened={opened}
        onClose={close}
        size={'lg'}
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      >
        <NewAccount />
      </Modal>
      <Box
        pb={5}
        style={{
          display: "flex",
          justifyContent: "space-between"
        }}
      >
        <Box style={{ display: "flex" }}>
          <Text pr={"0.4rem"}>Yet Another Toontown Launcher</Text>
          <IconManualGearbox />
        </Box>
        <SegmentedControl
          value={pageMode}
          onChange={setPageMode}
          data={[
            { label: 'Accounts', value: 'accounts' },
            { label: 'Groups', value: 'groups' },
          ]}
        />
      </Box>
      <Divider />
      <AccountPanel
        handlePlay={handlePlay}
        accounts={accounts}
        processIDs={processIDs}
      />
      <FloatingButton right={"8rem"} onClick={() => {}}>
        <IconQuestionMark size="2.5rem"/>
      </FloatingButton>
      <FloatingButton right="2rem" onClick={open}>
        <IconPlus size="2.5rem" />
      </FloatingButton>
      </div>
    </>
  );
};
export default LoginPage;
