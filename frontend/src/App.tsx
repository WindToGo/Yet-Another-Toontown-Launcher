import React, { useEffect, useReducer, useState } from "react";
import LoginPage from "./modules/login/LoginPage.tsx";
import Calculator from "./modules/calculator/CalculatorPage.tsx";
import { AppShell } from "@mantine/core";
import {
  GetAllAccounts,
  Login,
  RemoveAccount,
} from "../bindings/YATL/services/loginservice.ts";
import { SidebarItems } from "./components/navbar/NavbarTypes.ts";
import MultiToonPage from "./modules/multiToon/MultiToonPage.tsx";
import Navbar from "./components/navbar/NavbarLink.tsx";
import YATLReducer, { initialYatlState, YATLActionType } from "./state.ts";
import { MTProfile, MTSession } from "./modules/multiToon/logic/MultiToonTypes.ts";
import { LoadAllMTProfiles, Mt_get_window_from_pid, Mt_init } from "../bindings/YATL/services/multiservice.ts";
import dreamlandTheme from "./themes/DreamlandTheme.ts";
import { initTTRKeys } from "./modules/multiToon/logic/multiUtils.ts";
import { Events } from "@wailsio/runtime";
import InputWindow from "./modules/multiToon/components/inputWindow.tsx";
import CogDisguisePage from "./modules/CogSuitPage.tsx";
import { sanitizeRecord } from "./utils/sanitizeRecord.ts";
import { GetToonName, GetPortFromPID } from "../bindings/YATL/services/apiservice.ts";
import FishingPage from "./modules/fishing/FishingPage.tsx";
import SettingsPage from "./modules/settings/SettingsPage.tsx";
import { handlePatchEvent, PatchEventPayload } from "./modules/login/logic/patchEvents.ts";

const ComingSoonPage: React.FC<{ title: string }> = ({ title }) => (
  <div>{title} Page (coming soon)</div>
);

const App: React.FC = () => {
  const [selectedPage, setSelectedPage] = useState<SidebarItems>(
    SidebarItems.Launch,
  );

  const [yatlState, yatlDispatch] = useReducer(YATLReducer, initialYatlState)

  useEffect(() => {
    const fetchAccounts = async () => {
      const allAccounts = await GetAllAccounts();
      yatlDispatch({ type: YATLActionType.SET_ACCOUNTS, accounts: allAccounts });

      allAccounts.forEach((acc) => {
        yatlDispatch({ type: YATLActionType.ADD_PID, username: acc, pid: -1 })
      });
    };

    const fetchKeyBinds = async () => {
      const rawProfiles = await LoadAllMTProfiles();

      for (const [name, profile] of Object.entries(rawProfiles)) {
        if (!profile) continue;
        yatlDispatch({
          type: YATLActionType.ADD_MT_PROFILE,
          profile: {
            name,
            keyMap: sanitizeRecord(profile.KeyMap),
            autoAttatchAccounts: profile.AutoAttatchAccounts ?? [],
          },
        });
      }
    };

    const fetchTTRBinds = async () => {
      await initTTRKeys();
    }

    fetchAccounts();
    fetchKeyBinds();
    fetchTTRBinds();
  }, []);

  useEffect(() => {
    const removePID = (event: { data: { pid: number } }) => {
      const pid = event.data?.pid;
      if (pid == null) return;
      yatlDispatch({ type: YATLActionType.REMOVE_PID, pid });
    };
    const unsubscribe = Events.On("common:PID-killed", removePID);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onPatchEvent = (event: { data: PatchEventPayload }) => {
      if (!event.data?.username) return;
      handlePatchEvent(event.data, yatlDispatch);
    };
    const unsubscribe = Events.On("patch:event", onPatchEvent);
    return unsubscribe;
  }, []);

  const delay = (ms: number | undefined) => new Promise(res => setTimeout(res, ms));

  const tryToAttatchUsers = async (pid: number, username: string) => {
    let newSession = await Mt_init();

    for (const profile of yatlState.MTProfiles) {
      if (profile.autoAttatchAccounts.includes(username)) {
        let retries = 0;
        let w = 0;

        while (w === 0 && retries < 20) {
          w = await Mt_get_window_from_pid(newSession, pid);

          if (w !== 0) {
            const session: MTSession = { mt_session: newSession, window: w, profile: profile, attatchedUser: username }
            yatlDispatch({ type: YATLActionType.ADD_MT_SESSION, session: session })
          }

          retries++;
          await delay(500);
        }
      }
    }
  };

const bindToonSession = async (pid: number) => {
  const maxAttempts = 40; // 40 * 1.5s = 60s window to accept the consent prompt and select a toon
  const retryDelay = 1500;

  try {
    const port = await GetPortFromPID(pid);

    let toonName: string | null = null;
    let lastErr: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        toonName = await GetToonName(port);
        break;
      } catch (err) {
        lastErr = err;
        await delay(retryDelay);
      }
    }

    if (toonName === null) {
      throw lastErr ?? new Error("GetToonName never succeeded");
    }

    yatlDispatch({
      type: YATLActionType.ADD_TOON_SESSION,
      session: { port, toonName, pid },
    });
  } catch (err) {
    console.error(`Failed to bind toon session for pid ${pid}:`, err);
  }
};

  const handlePlay = async (username: string) => {
    await Login(username).then(async (pid: number) => {
      yatlDispatch({ type: YATLActionType.ADD_PID, pid: pid, username: username })
      void bindToonSession(pid);
      await tryToAttatchUsers(pid, username);
    })
  };

  const handleAddAccount = (username: string) => {
    yatlDispatch({ type: YATLActionType.ADD_ACCOUNT, account: username });
    yatlDispatch({ type: YATLActionType.ADD_PID, username, pid: -1 });
  };

  const handleRemoveAccount = async (username: string) => {
    const result = await RemoveAccount(username);
    if (result === 0) {
      yatlDispatch({ type: YATLActionType.REMOVE_ACCOUNT, username });
    } else {
      console.error(`Failed to remove account ${username}`);
    }
  };

  const renderPage = (): JSX.Element => {
    switch (selectedPage) {
      case SidebarItems.Launch:
        return (
          <LoginPage
            handlePlay={handlePlay}
            handleRemoveAccount={handleRemoveAccount}
            handleAddAccount={handleAddAccount}
            processIDs={yatlState.processIDs}
            accounts={yatlState.accounts}
            patchSessions={yatlState.patchSessions}
          />
        );
      case SidebarItems.Calculator:
        return <Calculator />;
      case SidebarItems.MultiToon:
        return <MultiToonPage
          accounts={yatlState.accounts}
          MTSessions={yatlState.MTSessions}
          yatlProfiles={yatlState.MTProfiles}
          AddMTSession={(session: MTSession) => yatlDispatch({ type: YATLActionType.ADD_MT_SESSION, session: session })}
          AddMTProfile={(profile: MTProfile) => yatlDispatch({ type: YATLActionType.ADD_MT_PROFILE, profile: profile })}
          EditMTProfile={(profile: MTProfile) => yatlDispatch({ type: YATLActionType.EDIT_MT_PROFILE, profile: profile })}
          RemoveMTProfile={(name: string) => yatlDispatch({ type: YATLActionType.REMOVE_MT_PROFILE, name })}
        />;
      case SidebarItems.Suits:
        return <CogDisguisePage
          hasRunningInstance={true}
          toonSessions={yatlState.toonSessions}
        />
      case SidebarItems.Fishing:
        return <FishingPage
          hasRunningInstance={true}
          toonSessions={yatlState.toonSessions}
        />;
      case SidebarItems.ResourcePks:
        return <ComingSoonPage title="Resource Packs" />;
      case SidebarItems.Settings:
        return <SettingsPage />;
      default:
        return <div>Unknown Page</div>;
    }
  };

  return (
    <AppShell
      padding="md"
      navbar={{
        width: { base: 80, md: 80, lg: 80 },
        breakpoint: "sm",
      }}
      style={{ background: dreamlandTheme.colors!.dark![8] }}
    >
      <Navbar selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
      <AppShell.Main>
        {renderPage()}
      </AppShell.Main>
      <InputWindow yatlSessions={yatlState.MTSessions} />
    </AppShell>
  );
};

export default App;
