import React, { useEffect, useState } from "react";
import { Box, Text } from "@mantine/core";
import { GetTTRVersion } from "../../../../bindings/YATL/services/apiservice";
import { useAppTheme } from "../../../themes/ThemeContext";

const VersionFooter: React.FC = () => {
  const { colors } = useAppTheme();
  // TTR has no published semantic version — this is a short hash of its
  // main engine executable pulled from the public patch manifest, so it's
  // left blank (rather than shown as an error) if that lookup fails.
  const [ttrVersion, setTtrVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    GetTTRVersion()
      .then((version) => {
        if (!cancelled) setTtrVersion(version);
      })
      .catch((err) => console.error("Failed to fetch TTR version", err));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box
      style={{
        position: "fixed",
        left: "0.75rem",
        bottom: "0.5rem",
        zIndex: 2,
        pointerEvents: "none",
      }}
    >
      <Text fz="xs" c={colors.Overlay1}>
        YATL v{__YATL_VERSION__}
        {ttrVersion ? ` · TTR ${ttrVersion}` : ""}
      </Text>
    </Box>
  );
};

export default VersionFooter;
