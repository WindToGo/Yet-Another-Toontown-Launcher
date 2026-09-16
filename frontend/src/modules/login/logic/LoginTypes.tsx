import { PatchSession } from "../../../state";

export interface LoginProps {
  handlePlay: (username: string) => Promise<void>;
  handleRemoveAccount: (username: string) => Promise<void>;
  handleAddAccount: (username: string) => void;
  processIDs: Record<string, number>;
  accounts: Array<string>;
  patchSessions: Record<string, PatchSession>;
}
