import React from "react";
import gagsData from "../../../data/gags.json" with {type: "json"}
import { Gag, GagMenuProps } from "../logic/types.ts";
import { Box, Button, Grid, Image } from "@mantine/core";
import { useAppTheme } from "../../../themes/ThemeContext.tsx";
import * as motion from "motion/react-client"


const GagMenu: React.FC<GagMenuProps> = ({ onSelectedGags, handlegagMenuHoverEnd, handlegagMenuHover, isLured }) => {
  const { colors } = useAppTheme();
  const gags: Gag[] = gagsData
  const rowColors = [
    colors.Yellow,
    colors.Green,
    colors.Blue,
    colors.Peach,
    colors.Mauve,
    colors.Sky];
  let colorCounter = -1


  return (
    <Box p='lg'
      style={{
        borderRadius: 10,
        backgroundColor: colors.Crust,
        borderColor: colors.Surface2,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
      }}
    >
      <Grid columns={14} gutter={0}>
        {gags.slice(7).map((gag, i) => {
          if (i % 7 == 0) {
            colorCounter++
          }
          // Disable trap gags if starting turn lured
          const disabled = isLured && i < 7;
          return (
            <Grid.Col span={2} key={i}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Box h={50} m={5}>
                  <Button
                    variant="subtle"
                    fullWidth
                    h='100%'
                    disabled={disabled}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      onSelectedGags({ Gag: gags[i + 7], IsOrg: true, IsSOS: false })
                    }}
                    onClick={() => !disabled && onSelectedGags({ Gag: gags[i + 7], IsOrg: false, IsSOS: false })}
                    onMouseEnter={() => !disabled && handlegagMenuHover({ Gag: gag, IsOrg: false, IsSOS: false })}
                    onMouseLeave={handlegagMenuHoverEnd}
                    style={{
                      borderWidth: 0,
                      opacity: 0.9,
                      background: disabled ? colors.Subtext1 : rowColors[colorCounter],
                    }}
                  >
                    <Image src={gag.Resource} height={"41rem"} fit="contain" draggable={false} />
                  </Button>
                </Box>
              </motion.div>
            </Grid.Col>
          )
        })}
      </Grid>
    </Box>
  );
};

export default GagMenu;
