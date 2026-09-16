export interface MTProfile {
  name: string,
  autoAttatchAccounts: string[];
  keyMap: Record<string, string>
}

export interface MTSession {
  mt_session: number,
  window: number,
  attatchedUser: string,
  profile: MTProfile,
}

export type MultiToonPageProps = {
  MTSessions: MTSession[];
  AddMTSession: (session: MTSession) => void;
  AddMTProfile: (profile: MTProfile) => void;
  EditMTProfile: (profile: MTProfile) => void;
  RemoveMTProfile: (name: string) => void;
  yatlProfiles: MTProfile[];
  accounts: string[];
}

export const groups: Record<string, string[]> = {
  Gameplay: [
    'forward',
    'reverse',
    'left',
    'right',
    'jump',
    'walk',
    'performAction',
    'lowThrow',
    'stickerBook',
    'exitActivity'
  ],
  Camera: [
    'cameraNext',
    'cameraPrev',
    'lookUp',
    'lookDown',
    'printCameraPos'
  ],
  Chat: [
    'chat',
    'groupChat',
    'friendsList'
  ],
  UI: [
    'showMap',
    'showTasks',
    'showGags',
  ],
  Debug: [
    'detectGarbage',
    'toggleGui',
    'toggleNametags',
    'options',
    'screenshot',
    'screenshotDebug',
    'synchronizeTime',
    'thinkCogHQFacilities',
    'thinkDebug',
  ],
};
