import { Box, RingProgress, Text } from "@mantine/core";
import { AccuracyBarProps } from "../logic/types";
import { useAppTheme } from "../../../themes/ThemeContext";

const AccuracyBar: React.FC<AccuracyBarProps> = ({ finalAccuracy }) => {
  const { colors } = useAppTheme();

  return (
    <Box pb='sm'>
      <RingProgress
        size={90}
        thickness={8}
        roundCaps
        transitionDuration={250}
        sections={[{ value: finalAccuracy, color: finalAccuracy > 90 ? colors.Green : finalAccuracy > 70 ? colors.Yellow : colors.Red }]}
        label={
          <Text size="sm">
            {`${finalAccuracy.toFixed(2)}%`}
          </Text>
        }
      />
    </Box>
  )
};

export default AccuracyBar;
