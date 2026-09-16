import React, { useEffect, useState } from "react";
import { Box, Text } from "@mantine/core";
import { GetPopulation } from "../../../../bindings/YATL/services/apiservice";
import { CatppuccinColors } from "../../../themes/CatppuccinMocha";

// Matches the backend cache TTL (src/ttrAPI/population.go) — polling more
// often than that would just re-request a value TTR hasn't refreshed yet.
const POLL_INTERVAL_MS = 5 * 60 * 1000;

const PopulationBar: React.FC = () => {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPopulation = async () => {
      try {
        const population = await GetPopulation();
        if (cancelled || !population) return;
        setTotal(population.total);
      } catch (err) {
        console.error("Failed to fetch TTR population", err);
      }
    };

    fetchPopulation();
    const interval = setInterval(fetchPopulation, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Box mt="md" style={{ width: "55%" }}>
      <Text fw={700} c={CatppuccinColors.Subtext0}>
        {total === null ? "— Toons Online" : `${total.toLocaleString()} Toons Online`}
      </Text>
    </Box>
  );
};

export default PopulationBar;
