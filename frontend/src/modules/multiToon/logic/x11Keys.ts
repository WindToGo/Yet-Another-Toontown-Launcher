// Browser KeyboardEvent.key values that don't match their X11 keysym name.
// Single-character keys (letters, digits, most symbols) pass through
// unchanged, since XStringToKeysym resolves those directly.
const jsKeyToX11: Record<string, string> = {
  " ": "space",
  Shift: "Shift_L",
  Control: "Control_L",
  Alt: "Alt_L",
  Meta: "Super_L",
  CapsLock: "Caps_Lock",
  NumLock: "Num_Lock",
  ScrollLock: "Scroll_Lock",
  Enter: "Return",
  Backspace: "BackSpace",
  Escape: "Escape",
  Tab: "Tab",
  Delete: "Delete",
  Insert: "Insert",
  Home: "Home",
  End: "End",
  PageUp: "Page_Up",
  PageDown: "Page_Down",
  PrintScreen: "Print",
  Pause: "Pause",
  ContextMenu: "Menu",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  ArrowDown: "Down",
};

// Converts a browser KeyboardEvent.key into the X11 keysym name that
// mtlib_listen_and_sync_clicks expects on Linux (see mtlib.h — this API
// takes a host hotkey, not a Panda3D control name).
export function toX11KeyName(jsKey: string): string | undefined {
  if (jsKey.length === 1) return jsKey;
  return jsKeyToX11[jsKey];
}
