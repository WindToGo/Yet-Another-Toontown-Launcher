import { notifications } from "@mantine/notifications";
import { LoadTTRControls, Mt_init, Mt_select_window, Mt_set_key_down, Mt_set_key_up, RemoveMTProfile, SaveMTProfile } from "../../../../bindings/YATL/services/multiservice";
import { MTProfile, MTSession } from "./MultiToonTypes";
import { sanitizeRecord } from "../../../utils/sanitizeRecord";

let ttrKeys: Record<string, string> = {};

export async function initTTRKeys(): Promise<void> {
  ttrKeys = sanitizeRecord(await LoadTTRControls());
}

export async function newProfile(profile_name: string): Promise<MTProfile> {
  const keys: Record<string, string> = {};
  for (const key in ttrKeys) {
    keys[key] = "";
  }
  keys["lowThrow"] = "";
  return {
    name: profile_name,
    keyMap: keys,
    autoAttatchAccounts: [],
  }
}

function getActionForKey(profileKeyMap: Record<string, string>, pressedKey: string): string | undefined {
  return Object.entries(profileKeyMap).find(([, key]) => key === pressedKey)?.[0];
}

function getTTRBindForAction(action: string): string | undefined {
  return ttrKeys[action];
}

function getPanda3DBindFromProfileKey(profileKey: string, profileKeyMap: Record<string, string>): string | undefined {
  const action = getActionForKey(profileKeyMap, profileKey);
  if (!action) return undefined;

  const ttrBind = getTTRBindForAction(action);
  if (!ttrBind) return undefined;

  return ttrBind;
}

export async function saveProfiles(profiles: MTProfile[]): Promise<void> {
  for (const profile of profiles) {
    await SaveMTProfile(profile.name, {KeyMap: profile.keyMap, Name: profile.name, AutoAttatchAccounts: profile.autoAttatchAccounts})
  }
  notifications.show({ title: "Saving Profiles", message: "to YATL config" })
}

export async function saveProfile(profile: MTProfile): Promise<void> {
  await SaveMTProfile(profile.name, {KeyMap: profile.keyMap, Name: profile.name, AutoAttatchAccounts: profile.autoAttatchAccounts})
  notifications.show({ title: `Saving Profile ${profile.name}`, message: `to YATL config` })
}

// Removes a profile from the YATL config. Returns true on success.
export async function removeProfile(name: string): Promise<boolean> {
  const result = await RemoveMTProfile(name);
  if (result !== 0) {
    notifications.show({ color: "red", title: "Failed to Delete Profile", message: name });
    return false;
  }
  notifications.show({ title: "Deleted Profile", message: name });
  return true;
}

export async function setKeyDown(key: string, session: MTSession): Promise<void> {
  const action = getActionForKey(session.profile.keyMap, key);
  if (!action) return;

  if (action === "lowThrow") {
    const performActionBind = getTTRBindForAction("performAction");
    if (!performActionBind) return;

    await Mt_set_key_down(session.mt_session, session.window, performActionBind);
    await Mt_set_key_up(session.mt_session, session.window, performActionBind);
    return;
  }

  const pandaKey = getTTRBindForAction(action);
  if (!pandaKey) return;

  await Mt_set_key_down(session.mt_session, session.window, pandaKey);
}

export async function setKeyUp(key: string, session: MTSession): Promise<void> {
  const pandaKey = getPanda3DBindFromProfileKey(key, session.profile.keyMap);
  if (!pandaKey) return;

  await Mt_set_key_up(session.mt_session, session.window, pandaKey);
}

export async function createSessionWithClick(profile: MTProfile): Promise<MTSession> {
  const session_id = await Mt_init();
  const window = await Mt_select_window(session_id);
  const session: MTSession = { mt_session: session_id, window: window, profile: profile, attatchedUser: "" }
  notifications.show({ title: `${window}`, message: `${session.profile.name}` })
  return session
}
