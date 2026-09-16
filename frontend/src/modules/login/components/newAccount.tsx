import { useState } from "react";
import { Box, Button, Stack, Stepper, Text, TextInput } from "@mantine/core";
import { IconCake, IconShieldCheck, IconUserCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { addAccount, verifyCredentials, verifyToonguard } from "../logic/newAccountLogic";

type NewAccountProps = {
  onAccountAdded?: (username: string) => void;
};

const NewAccount: React.FC<NewAccountProps> = ({ onAccountAdded }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [toonGuard, setToonGuard] = useState<string>("");
  const [responseToken, setResponseToken] = useState<string>("");
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const result = await verifyCredentials(username, password);
    setLoading(false);

    switch (result.status) {
      case "success":
        setActive(2);
        break;
      case "toonguard":
        setResponseToken(result.responseToken);
        setActive(1);
        break;
      case "error":
        notifications.show({ color: "red", title: "Login Failed", message: result.message });
        break;
    }
  };

  const handleVerifyToonguard = async () => {
    setLoading(true);
    const result = await verifyToonguard(username, responseToken, toonGuard);
    setLoading(false);

    if (result.status === "error") {
      notifications.show({ color: "red", title: "Verification Failed", message: result.message });
      return;
    }
    setActive(2);
  };

  const handleAddAccount = async () => {
    setLoading(true);
    const success = await addAccount(username, password);
    setLoading(false);

    if (!success) {
      notifications.show({
        color: "red",
        title: "Failed to Add Account",
        message: "Could not save the account to your keychain.",
      });
      return;
    }

    notifications.show({ title: "Account Added", message: username });
    onAccountAdded?.(username);
    setActive(3);
  };

  return (
    <>
      <Stepper active={active} pl={10} pr={10}>
        <Stepper.Step icon={<IconUserCheck />} label="Login" description="Create an account">
          <Stack pt={20}>
            <Text>Login to TTR</Text>
            <TextInput
              value={username}
              placeholder="Username"
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextInput
              type="password"
              value={password}
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button onClick={handleLogin} loading={loading} disabled={!username || !password} variant="light">
              Login
            </Button>
          </Stack>
        </Stepper.Step>
        <Stepper.Step icon={<IconShieldCheck />} label="Verification" description="Toonguard">
          <Stack pt={20}>
            <Text>Please enter your toonguard code (Check your emails)</Text>
            <TextInput
              value={toonGuard}
              placeholder="Toon Guard Code"
              onChange={(e) => setToonGuard(e.target.value)}
            />
            <Button onClick={handleVerifyToonguard} loading={loading} disabled={!toonGuard} variant="light">
              Verify
            </Button>
          </Stack>
        </Stepper.Step>
        <Stepper.Step icon={<IconCake />} label="Confirmation" description="Add Account to YATL">
          <Box pt={20} pb={20}>
            <Text pb={20}>Everything Checks Out!</Text>
            <Button onClick={handleAddAccount} loading={loading} variant="light">
              Add Account
            </Button>
          </Box>
        </Stepper.Step>
        <Stepper.Completed>
          <Text pt={20}>Account Added To YATL!</Text>
        </Stepper.Completed>
      </Stepper>
    </>
  );
};

export default NewAccount;
