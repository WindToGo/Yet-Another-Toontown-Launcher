import { GagAttack, StatusName } from "../logic/types"

export type CalcState = {
  cogLevel: number;
  boilerLevel: number;
  isLured: boolean;
  selectedGags: Array<GagAttack>;
  checkedStatuses: Record<StatusName, boolean>;
}

export enum CalcActionType {
  SET_COG_LEVEL = "SET_COG_LEVEL",
  SET_BOILER_LEVEL = "SET_BOILER_LEVEL",
  TOGGLE_STATUS = "TOGGLE_STATUS",
  ADD_GAG = "ADD_GAG",
  REMOVE_GAG = "REMOVE_GAG",
  CLEAR_GAGS = "CLEAR_GAGS",
  SET_LURED = "SET_LURED"
}

type CalcAction =
  | { type: CalcActionType.SET_COG_LEVEL; level: number | string }
  | { type: CalcActionType.SET_BOILER_LEVEL; level: number }
  | { type: CalcActionType.TOGGLE_STATUS; status: StatusName }
  | { type: CalcActionType.ADD_GAG; gag: GagAttack }
  | { type: CalcActionType.REMOVE_GAG; gag: GagAttack }
  | { type: CalcActionType.CLEAR_GAGS; }
  | { type: CalcActionType.SET_LURED; isLured: boolean }

export default function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case CalcActionType.SET_COG_LEVEL: {
      const num = Number(action.level)
      if (!isNaN(num))
        return {
          ...state,
          cogLevel: num
        }
      return state
    }
    case CalcActionType.SET_BOILER_LEVEL: {
      return {
        ...state,
        boilerLevel: action.level
      }
    }
    case CalcActionType.TOGGLE_STATUS: {
      return {
        ...state,
        checkedStatuses: {
          ...state.checkedStatuses,
          [action.status]: !state.checkedStatuses[action.status]
        }
      }
    }
    case CalcActionType.ADD_GAG: {
      return {
        ...state,
        selectedGags: state.selectedGags.length >= 4
          ? [action.gag]
          : [...state.selectedGags, action.gag]
      }
    }
    case CalcActionType.REMOVE_GAG: {
      const index = state.selectedGags.findIndex(
        g => g.Gag.GagName === action.gag.Gag.GagName && g.IsOrg === action.gag.IsOrg && g.IsSOS === action.gag.IsSOS
      );
      if (index === -1) return state; // no change if gag not found

      const newGags = [...state.selectedGags];
      newGags.splice(index, 1);

      return {
        ...state,
        selectedGags: newGags
      };
    }
    case CalcActionType.CLEAR_GAGS: {
      return {
        ...state,
        selectedGags: []
      }
    }
    case CalcActionType.SET_LURED: {
      return {
        ...state,
        isLured: action.isLured
      }
    }
    default:
      return state
  }
}
