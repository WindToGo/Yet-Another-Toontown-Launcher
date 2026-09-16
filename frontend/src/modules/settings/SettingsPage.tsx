import { Box, Divider, Paper, Select, Text } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useAppTheme } from "../../themes/ThemeContext.tsx";
import { ThemeName } from "../../themes/types.ts";

export default function SettingsPage() {
  const { themeName, setThemeName, themeList, colors } = useAppTheme();

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
          <Text pr={"0.4rem"}>Settings</Text>
          <IconSettings />
        </Box>
      </Box>
      <Divider pb={"1rem"} />

      <Paper withBorder p="md" radius="md" style={{ background: colors.Crust }}>
        <Text fw={700} fz="lg" mb="md">Themes</Text>
        <Select
          data={themeList.map((theme) => ({ value: theme.name, label: theme.label }))}
          value={themeName}
          onChange={(value) => value && setThemeName(value as ThemeName)}
          allowDeselect={false}
          w={220}
        />
      </Paper>
    </>
  );
}
