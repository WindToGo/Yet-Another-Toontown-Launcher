import type { Dispatch } from "react";
import { notifications } from "@mantine/notifications";
import { YATLAction, YATLActionType } from "../../../state";

// Mirrors patcher.PatchEvent + the username it was scoped to (see
// patchEventPayload in src/login/login.go). Emitted on the "patch:event"
// Wails event while an account is being updated.
export type PatchEventPayload = {
  username: string;
  type: "started" | "file-progress" | "file-complete" | "file-error" | "complete" | "error";
  file?: string;
  bytesDownloaded?: number;
  totalBytes?: number;
  totalFiles?: number;
  message?: string;
};

// Turns a raw patch:event payload into state updates (and, for terminal
// failures, a toast notification).
export function handlePatchEvent(payload: PatchEventPayload, dispatch: Dispatch<YATLAction>): void {
  switch (payload.type) {
    case "started":
      dispatch({ type: YATLActionType.PATCH_STARTED, username: payload.username, totalFiles: payload.totalFiles ?? 0 });
      break;

    case "file-progress":
      if (!payload.file) break;
      dispatch({
        type: YATLActionType.PATCH_FILE_PROGRESS,
        username: payload.username,
        file: payload.file,
        bytesDownloaded: payload.bytesDownloaded ?? 0,
        totalBytes: payload.totalBytes ?? 0,
      });
      break;

    case "file-complete":
      if (!payload.file) break;
      dispatch({ type: YATLActionType.PATCH_FILE_COMPLETE, username: payload.username, file: payload.file });
      break;

    case "file-error":
      if (payload.file) {
        dispatch({ type: YATLActionType.PATCH_FILE_ERROR, username: payload.username, file: payload.file });
      }
      notifications.show({
        color: "red",
        title: "Download Failed",
        message: payload.message || `Failed to download ${payload.file ?? "a file"}.`,
      });
      break;

    case "complete":
      dispatch({ type: YATLActionType.PATCH_SESSION_ENDED, username: payload.username });
      break;

    case "error":
      dispatch({ type: YATLActionType.PATCH_SESSION_ENDED, username: payload.username });
      notifications.show({
        color: "red",
        title: "Update Failed",
        message: payload.message || "Failed to update Toontown Rewritten.",
      });
      break;
  }
}
