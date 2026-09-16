import { Box, Divider, Group, Paper, Progress, SimpleGrid, Tabs, Text, Badge } from "@mantine/core";
import { IconShield } from "@tabler/icons-react";
import { GetCogsuitInfo } from "../../bindings/YATL/services/cogdisguiseservice.ts";
import { FastestByDepartment, SuitByDepartment, CogSuit } from "../../bindings/YATL/src/cogDisguise/models.ts";
import { useEffect, useState } from "react";
import { AppPalette } from "../themes/types.ts";
import { useAppTheme } from "../themes/ThemeContext.tsx";
import { ToonSession } from "../state.ts";
import { sanitizeRecord } from "../utils/sanitizeRecord.ts";

interface CogDisguisePageProps {
  toonSessions: ToonSession[];
  hasRunningInstance: boolean;
}

// --- Facility colour palette ---

function getFacilityColors(colors: AppPalette): Record<string, string> {
  return {
    "Final Fringe": colors.Peach,
    "First Fairway": colors.Yellow,
    "Five Story": colors.Maroon,
    "Four Story DDL or Brghh": colors.Flamingo,
    "Four Story": colors.Rosewater,
    "Three Story": colors.Pink,
    "Senior Wing": colors.Blue,
    "Junior Wing": colors.Sapphire,
    "five story": colors.Sky,
    "four story": colors.Lavender,
    "three story": colors.Mauve,
    "Bullion Mint": colors.Green,
    "Coin Mint": colors.Teal,
    "Full Steel": colors.Red,
    "Short Steel": colors.Maroon,
    "Short Scrap": colors.Flamingo,
    "Remaining": colors.Surface2,
  };
}

const DEPT_LABELS: Record<string, string> = {
  c: "Bossbot",
  l: "Lawbot",
  M: "Cashbot",
  S: "Sellbot",
};

function getDeptAccent(colors: AppPalette): Record<string, string> {
  return {
    c: colors.Peach,
    l: colors.Blue,
    M: colors.Green,
    S: colors.Red,
  };
}

const FACILITY_POINTS: Record<"c" | "l" | "M" | "S", Record<string, number>> = {
  c: {
    "Final Fringe": 2097,
    "First Fairway": 882,
    "Five Story": 235,
    "Four Story DDL or Brghh": 153,
    "Four Story": 135,
    "Three Story": 83,
  },
  l: {
    "Senior Wing": 1854,
    "Junior Wing": 781,
    "five story": 235,
    "Four Story DDL or Brghh": 153,
    "four story": 135,
    "three story": 83,
  },
  M: {
    "Bullion Mint": 1854,
    "Coin Mint": 781,
    "Five Story": 235,
    "Four Story DDL or Brghh": 153,
    "Four Story": 135,
    "Three Story": 83,
  },
  S: {
    "Full Steel": 1525,
    "Short Steel": 867,
    "Short Scrap": 350,
  },
};

// --- Single cog suit card ---

interface SuitCardProps {
  deptKey: "c" | "l" | "M" | "S";
  suit: CogSuit;
  fastest: Record<string, number>;
}

function SuitCard({ deptKey, suit, fastest }: SuitCardProps) {
  const { colors } = useAppTheme();
  const FACILITY_COLORS = getFacilityColors(colors);
  const DEPT_ACCENT = getDeptAccent(colors);
  const accent = DEPT_ACCENT[deptKey];
  const deptLabel = DEPT_LABELS[deptKey];
  const isMax = suit.level >= 50;
  const isV2 = suit.version === 2;
  const pointsMap = FACILITY_POINTS[deptKey] ?? {};

  if (!suit.hasDisguise) {
    return (
      <Paper withBorder p="md" radius="md" style={{ borderLeft: `3px solid ${accent}` }}>
        <Group justify="space-between" mb="xs">
          <Text fw={700} c="dimmed">{deptLabel}</Text>
          <Badge color="gray" variant="light">No disguise</Badge>
        </Group>
        <Text fz="sm" c="dimmed">No cog disguise obtained yet.</Text>
      </Paper>
    );
  }

  const facilityEntries = Object.entries(fastest).filter(([k]) => k !== "Remaining");
  const remaining = fastest["Remaining"] ?? 0;
  const earnedPoints = suit.promotion.current;
  const totalPoints = suit.promotion.target;
  const neededPoints = totalPoints - earnedPoints;

  const weighted = facilityEntries.map(([name, count]) => {
    const pointValue = pointsMap[name] ?? 0;
    return { name, count, pointValue, points: count * pointValue };
  });

  const totalFacilityPoints = weighted.reduce((sum, w) => sum + w.points, 0);

  const overshootPoints = Math.max(0, totalFacilityPoints - neededPoints);

  const denom = Math.max(totalFacilityPoints + remaining, neededPoints, 1);

  const segments = isMax ? [] : weighted.map((w) => ({
    label: w.name,
    count: w.count,
    points: w.points,
    part: Math.round((w.points / denom) * 100),
    color: FACILITY_COLORS[w.name] ?? colors.Overlay1,
  }));

  const remainingPart = Math.round((remaining / denom) * 100);

  const progressSegments = segments.map((seg) => (
    <Progress.Section key={seg.label} value={seg.part} color={seg.color} aria-label={seg.label}>
      {seg.part > 12 && <Progress.Label style={{ fontSize: 11 }}>{seg.count}×</Progress.Label>}
    </Progress.Section>
  ));

  const descriptions = segments.map((seg) => (
    <Box key={seg.label} style={{ borderBottom: `3px solid ${seg.color}`, paddingBottom: 4 }}>
      <Text tt="uppercase" fz="xs" c="dimmed" fw={700} style={{ letterSpacing: "0.04em" }}>
        {seg.label}
      </Text>
      <Group justify="space-between" align="flex-end" gap={0}>
        <Text fw={700}>{seg.count}× <Text span fz="xs" c="dimmed" fw={400}>({seg.points.toLocaleString()} pts)</Text></Text>
        <Text c={seg.color} fw={700} fz="sm">{seg.part}%</Text>
      </Group>
    </Box>
  ));

  return (
    <Paper p="md" radius="md" style={{background: `${colors.Crust}`, boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'}}>
      <Group justify="space-between" mb={4}>
        <Group gap="xs" align="center">
          <Text fw={700} fz="lg">{deptLabel}</Text>
          {isV2 && <Badge color="orange" variant="light" size="sm">v2.0</Badge>}
        </Group>
        <Group gap="xs">
          <Badge color={isMax ? "teal" : "gray"} variant={isMax ? "filled" : "light"} size="sm">
            {isMax ? "MAX" : `Lv ${suit.level}`}
          </Badge>
          <Text fz="xs" c="dimmed">{suit.suit.name}</Text>
        </Group>
      </Group>

      {!isMax && (
        <Text fz="sm" c="dimmed" mb="md">
          {earnedPoints.toLocaleString()} / {totalPoints.toLocaleString()} pts
          &nbsp;·&nbsp;
          <Text span fw={600} c={accent}>{neededPoints.toLocaleString()} remaining</Text>
        </Text>
      )}

      {isMax ? (
        <Box style={{ background: `${colors.Teal}22`, borderRadius: 8, padding: "1rem", textAlign: "center" }}>
          <Text fw={700} c={colors.Teal} fz="xl">✦ MAX LEVEL ✦</Text>
          <Text fz="sm" c="dimmed">{suit.suit.name} · Lv 50</Text>
        </Box>
      ) : neededPoints === 0 ? (
        <Box style={{ background: `${colors.Green}22`, borderRadius: 8, padding: "1rem", textAlign: "center" }}>
          <Text fw={700} c={colors.Green} fz="xl">✦ READY FOR PROMOTION ✦</Text>
          <Text fz="sm" c="dimmed">{suit.suit.name} · Lv {suit.level}</Text>
        </Box>
      ) : (
        <>
          <Progress.Root size={32} radius="sm" mt="xs" mb={overshootPoints > 0 ? 4 : "xl"}>
            {progressSegments}
            {remaining > 0 && (
              <Progress.Section
                value={remainingPart}
                color={FACILITY_COLORS["Remaining"]}
                aria-label="Partial remainder"
              >
                {remainingPart > 8 && <Progress.Label style={{ fontSize: 11 }}>{remaining} pts</Progress.Label>}
              </Progress.Section>
            )}
          </Progress.Root>
          {overshootPoints > 0 && (
            <Text fz="xs" c={colors.Subtext0} mb="xl">
              Overshoots {overshootPoints.toLocaleString()} pts past the promotion target.
            </Text>
          )}
          {descriptions.length > 0 ? (
            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} mt="sm">
              {descriptions}
              {remaining > 0 && (
                <Box style={{ borderBottom: `3px solid ${FACILITY_COLORS["Remaining"]}`, paddingBottom: 4 }}>
                  <Text tt="uppercase" fz="xs" c="dimmed" fw={700} style={{ letterSpacing: "0.04em" }}>Remainder</Text>
                  <Group justify="space-between" align="flex-end" gap={0}>
                    <Text fw={700}>{remaining} pts</Text>
                    <Text c={FACILITY_COLORS["Remaining"]} fw={700} fz="sm">{remainingPart}%</Text>
                  </Group>
                </Box>
              )}
            </SimpleGrid>
          ) : (
            <Text fz="sm" c="dimmed">No facilities needed — already at target!</Text>
          )}
        </>
      )}
    </Paper>
  );
}

// --- Per-toon data panel ---

interface ToonPanelProps {
  port: number;
}

function ToonPanel({ port }: ToonPanelProps) {
  const { colors } = useAppTheme();
  const [fastest, setFastest] = useState<FastestByDepartment | null>(null);
  const [suitInfo, setSuitInfo] = useState<SuitByDepartment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    GetCogsuitInfo(port)
      .then(([fast, suit]) => {
        setFastest(fast);
        setSuitInfo(suit);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [port]);

  if (loading) return <Text c="dimmed">Loading cog suit data…</Text>;
  if (error) return <Text c={colors.Red}>{error}</Text>;
  if (!fastest || !suitInfo) return <Text c="dimmed">No data available.</Text>;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <SuitCard deptKey="S" suit={suitInfo.S} fastest={sanitizeRecord(fastest.S)} />
      <SuitCard deptKey="M" suit={suitInfo.M} fastest={sanitizeRecord(fastest.M)} />
      <SuitCard deptKey="l" suit={suitInfo.l} fastest={sanitizeRecord(fastest.L)} />
      <SuitCard deptKey="c" suit={suitInfo.c} fastest={sanitizeRecord(fastest.C)} />
    </SimpleGrid>
  );
}

// --- Empty state ---

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
      <IconShield size={48} color={colors.Overlay1} />
      <Text fw={600} fz="lg" c="dimmed">No toons synced</Text>
      <Text fz="sm" c="dimmed" ta="center">{message}</Text>
    </Box>
  );
}

// --- Page ---

export default function CogDisguisePage({ toonSessions, hasRunningInstance }: CogDisguisePageProps) {
  const [activeTab, setActiveTab] = useState<string>("");

  // Keep active tab valid as sessions change
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
          <Text pr={"0.4rem"}>Cog Disguise Tracker</Text>
          <IconShield />
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
              <ToonPanel key={session.port} port={session.port} />
            ) : null
          )}
        </>
      )}
    </>
  );
}
