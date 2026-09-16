import { Box, Divider, Paper, SimpleGrid, Text } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { CatppuccinColors } from "../../themes/CatppuccinMocha.ts";

interface ThemeOptionProps {
  label: string;
}

function ThemeOption({ label }: ThemeOptionProps) {
  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      style={{ background: CatppuccinColors.Surface0, cursor: "default" }}
    >
      <Text fw={600} tt="capitalize">{label}</Text>
    </Paper>
  );
}

export default function SettingsPage() {
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

      <Paper withBorder p="md" radius="md" style={{ background: CatppuccinColors.Crust }}>
        <Text fw={700} fz="lg" mb="md">Themes</Text>
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <ThemeOption label="dreamland" />
          <ThemeOption label="brrrgh" />
        </SimpleGrid>
      </Paper>
    </>
  );
}
