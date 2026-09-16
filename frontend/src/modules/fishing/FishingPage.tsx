import { useEffect, useState } from "react";
import { Box, Divider, Paper, SimpleGrid, Tabs, Text } from "@mantine/core";
import { IconFish } from "@tabler/icons-react";
import { useAppTheme } from "../../themes/ThemeContext.tsx";
import { ToonSession } from "../../state.ts";
import { GetFishData } from "../../../bindings/YATL/services/apiservice.ts";
import FishCalculator, { LocationRank } from "./FishCalculator.ts";

interface FishingPageProps {
  toonSessions: ToonSession[];
  hasRunningInstance: boolean;
}

interface BestLocationCardProps {
  rank: number;
  location: string;
  rank_data: LocationRank;
}

function BestLocationCard({ rank, location, rank_data }: BestLocationCardProps) {
  const { colors } = useAppTheme();
  const RANK_ACCENT = [colors.Yellow, colors.Sapphire, colors.Peach];
  const accent = RANK_ACCENT[rank] ?? colors.Overlay1;
  const chance = (rank_data.total * 100).toFixed(2);

  return (
    <Paper p="md" radius="md" style={{ background: `${colors.Crust}`, boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'}}>
      <Text fw={700} c="dimmed" fz="xs" tt="uppercase" style={{ letterSpacing: "0.04em" }}>
        #{rank + 1} Best Pond
      </Text>
      <Text fw={700} fz="lg" mb={4}>{location}</Text>
      <Text c={accent} fw={700} fz="xl" mb="xs">{chance}% chance / cast</Text>

      {rank_data.topFish.length > 0 && (
        <>
          <Divider my="xs" />
          <Text fw={700} c="dimmed" fz="xs" tt="uppercase" mb={4} style={{ letterSpacing: "0.04em" }}>
            Likely Catches
          </Text>
          {rank_data.topFish.map((fish) => (
            <Text key={fish.name} fz="sm" mb={2}>
              {fish.name}{" "}
              <Text span c="dimmed" fz="xs">
                ({fish.chance * 100}%)
              </Text>
            </Text>
          ))}
        </>
      )}

      <Divider my="xs" />

      <Text fz="sm" c="dimmed">
        ~{rank_data.buckets.avgBuckets} buckets ({rank_data.buckets.avgTime} min) on average
      </Text>
      <Text fz="sm" c="dimmed">
        ~{rank_data.buckets.confBuckets} buckets ({rank_data.buckets.confTime} min) for 90% confidence
      </Text>
    </Paper>
  );
}

// wails3 stuff
function decodeBase64Json(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

interface FishingPanelProps {
  port: number;
}

function FishingPanel({ port }: FishingPanelProps) {
  const { colors } = useAppTheme();
  const [topLocations, setTopLocations] = useState<[string, LocationRank][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    GetFishData(port)
      .then((raw) => {
        const json = decodeBase64Json(raw);
        const calculator = new FishCalculator(json);
        setTopLocations(calculator.sortBestLocation().slice(0, 3));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [port]);

  if (loading) return <Text c="dimmed">Loading fishing data…</Text>;
  if (error) return <Text c={colors.Red}>{error}</Text>;
  if (!topLocations || topLocations.length === 0) {
    return <Text c="dimmed">No new fish locations found — you may have caught everything your rod allows!</Text>;
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
      {topLocations.map(([location, rank_data], i) => (
        <BestLocationCard key={location} rank={i} location={location} rank_data={rank_data} />
      ))}
    </SimpleGrid>
  );
}

interface EmptyStateProps {
  hasRunningInstance: boolean;
}

function EmptyState({ hasRunningInstance }: EmptyStateProps) {
  const { colors } = useAppTheme();
  const message = hasRunningInstance
    ? "Enable companion apps in settings then relaunch Toontown Rewritten."
    : "No instances of Toontown Rewritten are running.";

  return (
    <Box style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: "4rem" }}>
      <IconFish size={48} color={colors.Overlay1} />
      <Text fw={600} fz="lg" c="dimmed">No toons synced</Text>
      <Text fz="sm" c="dimmed" ta="center">{message}</Text>
    </Box>
  );
}

export default function FishingPage({ toonSessions, hasRunningInstance }: FishingPageProps) {
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (toonSessions.length === 0) {
      setActiveTab("");
      return;
    }
    const stillExists = toonSessions.some((s) => String(s.port) === activeTab);
    if (!stillExists) setActiveTab(String(toonSessions[0].port));
  }, [toonSessions]);

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
          <Text pr={"0.4rem"}>Fishing Guide</Text>
          <IconFish />
        </Box>
      </Box>
      <Divider pb={"1rem"} />

      {toonSessions.length === 0 ? (
        <EmptyState hasRunningInstance={hasRunningInstance} />
      ) : (
        <>
          <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? "")} mb="lg">
            <Tabs.List>
              {toonSessions.map((session) => (
                <Tabs.Tab key={session.port} value={String(session.port)}>
                  {session.toonName}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
          {toonSessions.map((session) =>
            activeTab === String(session.port) ? (
              <FishingPanel key={session.port} port={session.port} />
            ) : null
          )}
        </>
      )}
    </>
  );
}
