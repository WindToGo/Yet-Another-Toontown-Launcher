import React from "react";
import sosToonsData from "../../../data/sos_toons.json" with {type: "json"}
import { Gag, GagAttack, GagMenuProps, SOSToon } from "../logic/types.ts";
import { Box, Button, Group, Image, Stack, Text } from "@mantine/core";
import { useAppTheme } from "../../../themes/ThemeContext.tsx";
import * as motion from "motion/react-client"

// Same left-to-right track order (and colors) as GagMenu, so the two menus
// feel like the same layout.
const TRACK_ORDER = ["Trap", "Lure", "Sound", "Throw", "Squirt", "Drop"];

// Stun dealt by a normal gag of each track, so a non-SOS gag chained after
// an SOS gag in the same attack still gets the right accuracy bonus.
const TRACK_STUN: Record<string, number> = {
  Trap: 50,
  Lure: 0,
  Sound: 25,
  Throw: 25,
  Squirt: 25,
  Drop: 25,
};

// SOS cards always hit — see IsSOS handling in IntoCalculateDamage — so the
// Accuracy here is informational only.
function toGag(toon: SOSToon): Gag {
  return {
    GagType: toon.type,
    GagName: toon.gag,
    Damage: toon.damage,
    OrgDamage: toon.damage,
    Accuracy: 100,
    Stun: TRACK_STUN[toon.type] ?? 0,
    Shorthand: toon.gag,
    Resource: toon.img,
  };
}

const SOSMenu: React.FC<GagMenuProps> = ({ onSelectedGags, handlegagMenuHoverEnd, handlegagMenuHover, isLured }) => {
  const { colors } = useAppTheme();
  const toons: SOSToon[] = sosToonsData;

  const rowColors = [
    colors.Yellow,
    colors.Green,
    colors.Blue,
    colors.Peach,
    colors.Mauve,
    colors.Sky,
  ];

  const tracks = TRACK_ORDER.map((type) =>
    toons.filter((toon) => toon.type === type).sort((a, b) => a.tier - b.tier)
  );

  return (
    <Box p='lg'
      style={{
        borderRadius: 10,
        backgroundColor: colors.Crust,
        borderColor: colors.Surface2,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
      }}
    >
      <Stack gap="sm">
        {tracks.map((track, rowIndex) => {
          if (track.length === 0) return null;
          const disabled = isLured && TRACK_ORDER[rowIndex] === "Trap";
          return (
            <Group justify="center" gap="sm" key={TRACK_ORDER[rowIndex]}>
              {track.map((toon) => {
                const gagAttack: GagAttack = { Gag: toGag(toon), IsOrg: false, IsSOS: true };
                return (
                  <motion.div
                    key={toon.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="subtle"
                      justify="flex-start"
                      w={190}
                      h={56}
                      p={6}
                      disabled={disabled}
                      onClick={() => !disabled && onSelectedGags(gagAttack)}
                      onMouseEnter={() => !disabled && handlegagMenuHover(gagAttack)}
                      onMouseLeave={handlegagMenuHoverEnd}
                      style={{
                        borderWidth: 0,
                        opacity: 0.9,
                        background: disabled ? colors.Subtext1 : rowColors[rowIndex],
                      }}
                    >
                      <Group gap={8} wrap="nowrap" align="center" w="100%">
                        <Image src={toon.img} h={44} w={44} fit="contain" radius="sm" draggable={false} />
                        <Stack gap={0} align="flex-start" style={{ minWidth: 0 }}>
                          <Text size="sm" fw={700} c={colors.Mantle} lh={1.2} truncate="end">
                            {toon.gag}
                          </Text>
                          <Text size="xs" c={colors.Mantle} lh={1.2}>
                            {toon.damage} {TRACK_ORDER[rowIndex] === "Lure" ? "turns" : "dmg"}
                          </Text>
                        </Stack>
                      </Group>
                    </Button>
                  </motion.div>
                )
              })}
            </Group>
          )
        })}
      </Stack>
    </Box>
  );
};

export default SOSMenu;
