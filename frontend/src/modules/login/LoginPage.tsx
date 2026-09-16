import React, { useEffect, useRef, useState } from "react";
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
import PopulationBar from "./components/populationBar";
import VersionFooter from "./components/versionFooter";
import { FloatingButton } from "../../components/buttons";

// Gap left between the divider and the top of the test image.
const IMAGE_TOP_GAP = 10;

const LoginPage: React.FC<LoginProps> = ({
  handlePlay,
  handleRemoveAccount,
  handleAddAccount,
  processIDs,
  accounts,
  patchSessions,
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [pageMode, setPageMode] = useState<string>('accounts')
  const dividerRef = useRef<HTMLDivElement>(null);
  const [imageHeight, setImageHeight] = useState(0);

  useEffect(() => {
    const updateImageHeight = () => {
      if (!dividerRef.current) return;
      const dividerBottom = dividerRef.current.getBoundingClientRect().bottom;
      setImageHeight(Math.max(0, window.innerHeight - dividerBottom - IMAGE_TOP_GAP));
    };

    updateImageHeight();
    window.addEventListener("resize", updateImageHeight);
    return () => window.removeEventListener("resize", updateImageHeight);
  }, []);

  // TODO: Add button for restart
  return (
    <>
      <img
        src="/NSP_Test.png"
        alt=""
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          zIndex: 0,
          height: imageHeight,
          width: "auto",
          pointerEvents: "none",
        }}
      />
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
        <NewAccount onAccountAdded={handleAddAccount} />
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
      <Divider ref={dividerRef} />
      <AccountPanel
        handlePlay={handlePlay}
        handleRemoveAccount={handleRemoveAccount}
        accounts={accounts}
        processIDs={processIDs}
        patchSessions={patchSessions}
      />
      <PopulationBar />
      <VersionFooter />
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
