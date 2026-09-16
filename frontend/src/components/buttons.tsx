import { Box } from "@mantine/core";
import * as motion from "motion/react-client"
import { useAppTheme } from "../themes/ThemeContext";

export const FloatingButton = ({
  right,
  bottom = "2rem",
  onClick,
  children,
}: {
  right: string;
  bottom?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) => {
  const { colors } = useAppTheme();

  return (
    <Box pos="fixed" bottom={bottom} right={right}>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.8 }}
        transition={{
          duration: 0.4,
          scale: { type: "spring", visualDuration: 0.4, bounce: 0.5 },
        }}
        onClick={onClick}
        style={{
          width: "4rem",
          height: "4rem",
          backgroundColor: colors.Blue,
          color: colors.Base,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        {children}
      </motion.div>
    </Box>
  );
};

