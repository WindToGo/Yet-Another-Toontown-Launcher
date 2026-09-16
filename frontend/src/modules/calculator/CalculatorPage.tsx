import React, { useEffect, useMemo, useReducer, useState } from "react";
import { GagAttack, StatusName } from "./logic/types.ts";
import CogStatusMenu from "./components/CogStatusMenu.tsx";
import { Box, Button, Drawer, Grid, Group, Image, Slider, Stack, Switch, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import GagMenu from "./components/GagMenu.tsx";
import SOSMenu from "./components/SOSMenu.tsx";
import { CatppuccinColors } from "../../themes/CatppuccinMocha.ts";
import CogHealthBar from "./components/cogHealthBar.tsx";
import AccuracyBar from "./components/AccuracyBar.tsx";
import { AttackAnalysis } from "../../../bindings/YATL/src/calculator/models.ts";
import calcReducer, { CalcActionType, CalcState } from "./hooks/useCalculator.ts";
import { addDamageNumbers, calculateAccuracy, calculateAnalyzedAttacks, getCogHealthModifier } from "./logic/calculatorUtils.ts";
import * as motion from "motion/react-client"
import { FloatingButton } from "../../components/buttons.tsx";
import { IconQuestionMark } from "@tabler/icons-react";

const Calculator: React.FC = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [showSOSMenu, setShowSOSMenu] = useState<boolean>(false);
  const [analyzedAttacks, setAnalyzedAttacks] = useState<Array<AttackAnalysis>>([]);
  const [tempDamage, setTempDamage] = useState<number>(0);
  const [tempAccuracy, setTempAccuracy] = useState<number>(0);

  const initialStatuses: Record<StatusName, boolean> =
    Object.values(StatusName).reduce((acc, status) => {
      acc[status as StatusName] = false;
      return acc;
    }, {} as Record<StatusName, boolean>);

  const initialCalcState: CalcState = {
    cogLevel: 12,
    boilerLevel: 1,
    isLured: false,
    selectedGags: [],
    checkedStatuses: initialStatuses,
  }

  const [calcState, calcDispatch] = useReducer(calcReducer, initialCalcState);

  const cogHealthModifier = useMemo(() => getCogHealthModifier(calcState.checkedStatuses), [calcState.checkedStatuses])
  const finalDamage = useMemo(() => addDamageNumbers(analyzedAttacks), [analyzedAttacks])
  const finalAccuracy = useMemo(() => calculateAccuracy(analyzedAttacks), [analyzedAttacks])

  useEffect(() => {
    const fetchData = async () => {
      const result = await calculateAnalyzedAttacks(calcState)
      setAnalyzedAttacks(() => [...result])
    }

    fetchData();
  }, [calcState.selectedGags, calcState.cogLevel, calcState.checkedStatuses, calcState.boilerLevel, calcState.isLured]);

  const handlegagMenuHoverEnd = () => {
    setTempDamage(0);
  };

  const handleGagMenuHover = async (gag: GagAttack) => {
    const tempGags = [...calcState.selectedGags, gag];
    const result = await calculateAnalyzedAttacks({ ...calcState, selectedGags: tempGags })
    const tempTotalDamage = addDamageNumbers(result)
    const tempTotalAccuracy = calculateAccuracy(result)
    setTempDamage(tempTotalDamage);
    setTempAccuracy(Number(tempTotalAccuracy));
  };

  return (
    <div>
      <CogHealthBar
        finalDamage={finalDamage}
        cogHealthModifier={cogHealthModifier}
        tempDamage={tempDamage}
      />
      <Box p='md' style={{ display: 'grid' }}>
        <Box
          style={{
            gridArea: '1 / 1',
            visibility: showSOSMenu ? 'hidden' : 'visible',
            pointerEvents: showSOSMenu ? 'none' : 'auto',
          }}
        >
          <GagMenu
            onSelectedGags={(gag: GagAttack) => calcDispatch({ type: CalcActionType.ADD_GAG, gag })}
            handlegagMenuHover={handleGagMenuHover}
            handlegagMenuHoverEnd={handlegagMenuHoverEnd}
            isLured={calcState.isLured}
          />
        </Box>
        <Box
          style={{
            gridArea: '1 / 1',
            visibility: showSOSMenu ? 'visible' : 'hidden',
            pointerEvents: showSOSMenu ? 'auto' : 'none',
          }}
        >
          <SOSMenu
            onSelectedGags={(gag: GagAttack) => calcDispatch({ type: CalcActionType.ADD_GAG, gag })}
            handlegagMenuHover={handleGagMenuHover}
            handlegagMenuHoverEnd={handlegagMenuHoverEnd}
            isLured={calcState.isLured}
          />
        </Box>
      </Box>

      <Grid
        className="selected-gags"
        columns={14}
        h={75}
        justify="center"
        align="center"
        p='sm'
      >
        {calcState.selectedGags.map((gag, i) => {
          return (
            <Grid.Col span={2} key={i}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="default"
                  fullWidth
                  h={50}
                  radius='md'
                  onContextMenu={(e) => {
                    e.preventDefault()
                  }}
                  onClick={() => calcDispatch({ type: CalcActionType.REMOVE_GAG, gag })}
                  style={{
                    background: gag.IsOrg ? CatppuccinColors.Green : CatppuccinColors.Blue,
                    border: 0
                  }}
                >
                  <Image src={gag.Gag.Resource} height={40} width={40} fit="contain" draggable={false} />
                </Button>
              </motion.div>
            </Grid.Col>
          )
        })}
      </Grid>

      <Group justify="center" mb="lg">
        <Button variant="default"
          onClick={open}
          onContextMenu={(e) => e.preventDefault()}
          m='sm'
        >
          Cog Settings
        </Button>
        <Button variant={showSOSMenu ? "filled" : "default"}
          onClick={() => setShowSOSMenu((prev) => !prev)}
          onContextMenu={(e) => e.preventDefault()}
          m='sm'
        >
          SOS Cards
        </Button>

        <Button variant="default"
          onClick={() => calcDispatch({ type: CalcActionType.CLEAR_GAGS })}
          onContextMenu={(e) => e.preventDefault()}
          m='sm'
        >
          Clear Gags
        </Button>
        <Switch
          checked={calcState.isLured}
          onChange={(event) => calcDispatch({ type: CalcActionType.SET_LURED, isLured: event.currentTarget.checked })}
          label="Start Turn Lured"
        />
        <AccuracyBar
          finalAccuracy={finalAccuracy}
          tempAccuracy={tempAccuracy}
        />
      </Group>

      <Drawer
        opened={opened}
        onClose={close}
        position="left"
        offset={8}
        radius="md"
      >
        <Stack>
          <Text fw={500}>Cog Level: {calcState.cogLevel}</Text>
          <Slider
            value={Number(calcState.cogLevel)}
            onChange={(cogLevel: number | string) => calcDispatch({ type: CalcActionType.SET_COG_LEVEL, level: cogLevel })}
            min={1}
            max={20}
            step={1}
            marks={[
              { value: 1, label: "1" },
              { value: 12, label: "12" },
              { value: 20, label: "20" },
            ]}
          />
        </Stack>
        <Box h={25} />
        <CogStatusMenu
          checkedStatuses={calcState.checkedStatuses}
          onStatusCheck={(status: StatusName) => calcDispatch({ type: CalcActionType.TOGGLE_STATUS, status: status })}
          setBoilerLevel={(level: number) => calcDispatch({ type: CalcActionType.SET_BOILER_LEVEL, level: level })}
          boilerLevel={calcState.boilerLevel}
        />
      </Drawer>
      <FloatingButton right={"2rem"} onClick={() => {}}>
        <IconQuestionMark size="2.5rem"/>
      </FloatingButton>
    </div>
  );
};

export default Calculator;
