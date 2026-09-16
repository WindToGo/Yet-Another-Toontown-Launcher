import { MTProfile, MTSession } from "./modules/multiToon//logic/MultiToonTypes";

export type ToonSession = {
  port: number;
  toonName: string;
  pid: number;
};

export type PatchFileState = {
  file: string;
  bytesDownloaded: number;
  totalBytes: number; // <= 0 means unknown
  status: "downloading" | "error";
};

export type PatchSession = {
  totalFiles: number;
  files: Record<string, PatchFileState>;
};

export type YATLState = {
  accounts: string[];
  MTSessions: MTSession[];
  processIDs: Record<string, number>;
  MTProfiles: MTProfile[];
  toonSessions: ToonSession[]; // active in-game toons, port → toon name, no username tie
  patchSessions: Record<string, PatchSession>; // username → in-progress update, absent when not updating
}

export enum YATLActionType {
  SET_ACCOUNTS = "SET_ACCOUNTS",
  ADD_ACCOUNT = "ADD_ACCOUNT",
  REMOVE_ACCOUNT = "REMOVE_ACCOUNT",
  ADD_PID = "ADD_PID",
  REMOVE_PID = "REMOVE_PID",
  SET_TOON_SESSIONS = "SET_TOON_SESSIONS",
  CLEAR_TOON_SESSIONS = "CLEAR_TOON_SESSIONS",
  ADD_TOON_SESSION = "ADD_TOON_SESSION",
  ADD_MT_SESSION = "ADD_MT_SESSION",
  REMOVE_MT_SESSION = "REMOVE_MT_SESSION",
  EDIT_MT_PROFILE = "EDIT_MT_PROFILE",
  ADD_MT_PROFILE = "ADD_MT_PROFILE",
  REMOVE_MT_PROFILE = "REMOVE_MY_PROFILE",
  PATCH_STARTED = "PATCH_STARTED",
  PATCH_FILE_PROGRESS = "PATCH_FILE_PROGRESS",
  PATCH_FILE_COMPLETE = "PATCH_FILE_COMPLETE",
  PATCH_FILE_ERROR = "PATCH_FILE_ERROR",
  PATCH_SESSION_ENDED = "PATCH_SESSION_ENDED",
}

export type YATLAction =
  | { type: YATLActionType.SET_ACCOUNTS; accounts: string[] }
  | { type: YATLActionType.ADD_ACCOUNT; account: string }
  | { type: YATLActionType.REMOVE_ACCOUNT; username: string }
  | { type: YATLActionType.ADD_PID; username: string; pid: number }
  | { type: YATLActionType.REMOVE_PID; pid: number }
  | { type: YATLActionType.SET_TOON_SESSIONS; sessions: ToonSession[] }
  | { type: YATLActionType.CLEAR_TOON_SESSIONS }
  | { type: YATLActionType.ADD_TOON_SESSION; session: ToonSession }
  | { type: YATLActionType.ADD_MT_SESSION; session: MTSession }
  | { type: YATLActionType.REMOVE_MT_SESSION; mt_session: number }
  | { type: YATLActionType.EDIT_MT_PROFILE; profile: MTProfile }
  | { type: YATLActionType.REMOVE_MT_PROFILE; name: string }
  | { type: YATLActionType.ADD_MT_PROFILE; profile: MTProfile }
  | { type: YATLActionType.PATCH_STARTED; username: string; totalFiles: number }
  | {
      type: YATLActionType.PATCH_FILE_PROGRESS;
      username: string;
      file: string;
      bytesDownloaded: number;
      totalBytes: number;
    }
  | { type: YATLActionType.PATCH_FILE_COMPLETE; username: string; file: string }
  | { type: YATLActionType.PATCH_FILE_ERROR; username: string; file: string }
  | { type: YATLActionType.PATCH_SESSION_ENDED; username: string }

export const initialYatlState: YATLState = {
  accounts: [],
  MTSessions: [],
  processIDs: {},
  MTProfiles: [],
  toonSessions: [],
  patchSessions: {},
};

export default function YATLReducer(state: YATLState, action: YATLAction): YATLState {
  switch (action.type) {
    case YATLActionType.SET_ACCOUNTS: {
      return { ...state, accounts: action.accounts };
    }
    case YATLActionType.ADD_ACCOUNT: {
      return { ...state, accounts: [...state.accounts, action.account] };
    }
    case YATLActionType.REMOVE_ACCOUNT: {
      const updatedProcessIDs = { ...state.processIDs };
      delete updatedProcessIDs[action.username];
      const updatedPatchSessions = { ...state.patchSessions };
      delete updatedPatchSessions[action.username];
      return {
        ...state,
        accounts: state.accounts.filter((username) => username !== action.username),
        processIDs: updatedProcessIDs,
        patchSessions: updatedPatchSessions,
      };
    }
    case YATLActionType.ADD_PID: {
      return {
        ...state,
        processIDs: { ...state.processIDs, [action.username]: action.pid },
      };
    }
    case YATLActionType.REMOVE_PID: {
      if (action.pid === -1) return state;
      let removedUser = "";
      const updatedProcessIDs = { ...state.processIDs };
      for (const [username, pid] of Object.entries(updatedProcessIDs)) {
        if (pid === action.pid) {
          updatedProcessIDs[username] = -1;
          removedUser = username;
          break;
        }
      }
      const updatedMTSession = state.MTSessions.filter(
        (session) => session.attatchedUser !== removedUser
      );
      const updatedToonSessions = state.toonSessions.filter(
        (session) => session.pid !== action.pid
      );
      return {
        ...state,
        processIDs: updatedProcessIDs,
        MTSessions: updatedMTSession,
        toonSessions: updatedToonSessions,
      };
    }
    case YATLActionType.ADD_TOON_SESSION: {
      const exists = state.toonSessions.some((s) => s.port === action.session.port);
      const updatedToonSessions = exists
        ? state.toonSessions.map((s) =>
          s.port === action.session.port ? action.session : s
        )
        : [...state.toonSessions, action.session];
      return { ...state, toonSessions: updatedToonSessions };
    }
    case YATLActionType.SET_TOON_SESSIONS: {
      return { ...state, toonSessions: action.sessions };
    }
    case YATLActionType.CLEAR_TOON_SESSIONS: {
      return { ...state, toonSessions: [] };
    }
    case YATLActionType.ADD_MT_SESSION: {
      return { ...state, MTSessions: [...state.MTSessions, action.session] };
    }
    case YATLActionType.REMOVE_MT_SESSION: {
      return {
        ...state,
        MTSessions: state.MTSessions.filter((s) => s.mt_session !== action.mt_session),
      };
    }
    case YATLActionType.EDIT_MT_PROFILE: {
      console.log('REDUCER EDIT_MT_PROFILE action.profile=', action.profile);
      return {
        ...state,
        MTSessions: state.MTSessions.map((session) =>
          session.profile.name === action.profile.name
            ? { ...session, profile: action.profile }
            : session
        ),
      };
    }
    case YATLActionType.ADD_MT_PROFILE: {
      if (state.MTProfiles.some(p => p.name === action.profile.name)) return state;
      return { ...state, MTProfiles: [...state.MTProfiles, action.profile] };
    }
    case YATLActionType.REMOVE_MT_PROFILE: {
      return {
        ...state,
        MTProfiles: state.MTProfiles.filter(p => p.name !== action.name),
        MTSessions: state.MTSessions.filter(s => s.profile.name !== action.name),
      };
    }
    case YATLActionType.PATCH_STARTED: {
      return {
        ...state,
        patchSessions: {
          ...state.patchSessions,
          [action.username]: { totalFiles: action.totalFiles, files: {} },
        },
      };
    }
    case YATLActionType.PATCH_FILE_PROGRESS: {
      const session = state.patchSessions[action.username];
      if (!session) return state;
      return {
        ...state,
        patchSessions: {
          ...state.patchSessions,
          [action.username]: {
            ...session,
            files: {
              ...session.files,
              [action.file]: {
                file: action.file,
                bytesDownloaded: action.bytesDownloaded,
                totalBytes: action.totalBytes,
                status: "downloading",
              },
            },
          },
        },
      };
    }
    case YATLActionType.PATCH_FILE_COMPLETE: {
      const session = state.patchSessions[action.username];
      if (!session) return state;
      const files = { ...session.files };
      delete files[action.file];
      return {
        ...state,
        patchSessions: { ...state.patchSessions, [action.username]: { ...session, files } },
      };
    }
    case YATLActionType.PATCH_FILE_ERROR: {
      const session = state.patchSessions[action.username];
      if (!session) return state;
      return {
        ...state,
        patchSessions: {
          ...state.patchSessions,
          [action.username]: {
            ...session,
            files: {
              ...session.files,
              [action.file]: { file: action.file, bytesDownloaded: 0, totalBytes: 0, status: "error" },
            },
          },
        },
      };
    }
    case YATLActionType.PATCH_SESSION_ENDED: {
      const updatedPatchSessions = { ...state.patchSessions };
      delete updatedPatchSessions[action.username];
      return { ...state, patchSessions: updatedPatchSessions };
    }
    default:
      return state;
  }
}
