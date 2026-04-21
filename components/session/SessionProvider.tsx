"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Wifi, WifiOff, Users, Settings, UserCircle } from "lucide-react";
import type {
  ActivityItem,
  Session,
  SettingsChangeRequest,
  TimerMode,
  TimerState,
} from "@/types";
import { useTimer } from "@/hooks/useTimer";
import { useSession } from "@/hooks/useSession";
import { useBonfireState } from "@/hooks/useBonfireState";
import { sessionToTimerState } from "@/lib/timer";
import { generateUsername } from "@/lib/roomName";
import {
  SettingsPanel,
  type TimerDurations,
  type SessionSettings,
} from "@/components/session/SettingsPanel";
import {
  playCompleteSound,
  showNotification,
  requestNotificationPermission,
} from "@/lib/audio";
import { TimerDisplay } from "@/components/timer/TimerDisplay";
import { TimerControls } from "@/components/timer/TimerControls";
import { ModeSelector } from "@/components/timer/ModeSelector";
import { MissedEventsToast } from "@/components/session/MissedEventsToast";
import { ParticipantList } from "@/components/session/ParticipantList";
import { SharePanel } from "@/components/session/SharePanel";
import { ActivityFeed } from "@/components/session/ActivityFeed";
import { BreakOverlay } from "@/components/session/BreakOverlay";
import { GuestNicknamePrompt } from "@/components/session/GuestNicknamePrompt";
import { SettingsRequestCard } from "@/components/session/SettingsRequestCard";
import { AmbientPlayer } from "@/components/session/AmbientPlayer";
import { StatsTab } from "@/components/session/StatsTab";
import { ModeTipBubble } from "@/components/session/ModeTipBubble";
import { KeyboardShortcutsModal } from "@/components/session/KeyboardShortcutsModal";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Dynamic import with ssr:false — BonfireScene uses WebGL / Three.js which
// calls window/document APIs that don't exist on the server. Next.js will
// skip rendering it server-side and mount it only in the browser.
const BonfireScene = dynamic(
  () =>
    import("@/components/session/BonfireScene").then((m) => ({
      default: m.BonfireScene,
    })),
  { ssr: false },
);

// Module-level pure function — no closure deps
function toSecs(d: TimerDurations) {
  return {
    focus: d.focus * 60,
    short: d.short * 60,
    long: d.long * 60,
  };
}

interface SessionProviderProps {
  session: Session;
  userId: string | null;
  isHost: boolean;
  username?: string | null;
  avatarUrl?: string | null;
  profileUsername?: string | null;
}

function SessionContent({
  session,
  userId,
  isHost: isHostProp,
  username,
  avatarUrl,
  profileUsername,
}: SessionProviderProps) {
  const [isHost, setIsHost] = useState(isHostProp);
  const [activeTab, setActiveTab] = useState<"timer" | "tasks" | "stats">(
    "timer",
  );
  const [sessionMode, setSessionMode] = useState<"host" | "jam" | "solo">(
    session.session_mode ?? "host",
  );
  const [isPublic, setIsPublic] = useState(session.is_public ?? true);
  const [showBreakOverlay, setShowBreakOverlay] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>({
    durations: {
      focus: session.settings?.focus ?? 25,
      short: session.settings?.short ?? 5,
      long: session.settings?.long ?? 15,
    },
    rounds: session.settings?.rounds ?? 4,
    allowGuestShare: session.settings?.allowGuestShare ?? true,
    autoStartBreaks: session.settings?.autoStartBreaks ?? false,
    autoStartPomodoros: session.settings?.autoStartPomodoros ?? false,
  });
  const initialPomosDone = session.pomos_done ?? 0;
  const focusCountRef = useRef(initialPomosDone);
  const [focusCount, setFocusCount] = useState(initialPomosDone);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const sessionLogRef = useRef<string[]>([]);
  const totalLogCountRef = useRef<number>(0);
  const tabHiddenAtRef = useRef<number | null>(null);
  const logCountAtHideRef = useRef<number>(0);
  const missedEventsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [missedEvents, setMissedEvents] = useState<string[]>([]);
  // localUsername: for guests this starts null and is set when they save a nickname
  const [localUsername, setLocalUsername] = useState<string | null>(
    username ?? null,
  );
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);
  const [nicknameReady, setNicknameReady] = useState(!!userId);
  const [showSettings, setShowSettings] = useState(false);
  const [showWatcherSettings, setShowWatcherSettings] = useState(false);
  const [showAmbient, setShowAmbient] = useState(false);
  const [ambientActive, setAmbientActive] = useState(false);
  const [pendingRequest, setPendingRequest] =
    useState<SettingsChangeRequest | null>(null);
  const [pendingSettingsRequest, setPendingSettingsRequest] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const pendingRequestRef = useRef<SettingsChangeRequest | null>(null);
  useEffect(() => {
    pendingRequestRef.current = pendingRequest;
  }, [pendingRequest]);
  const [modeTipDismissed, setModeTipDismissed] = useState(false);
  const [showSignInPopover, setShowSignInPopover] = useState(false);
  const signInPopoverRef = useRef<HTMLDivElement>(null);
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const settingsPanelDesktopRef = useRef<HTMLDivElement>(null);
  const watcherSettingsPanelRef = useRef<HTMLDivElement>(null);
  const watcherSettingsPanelDesktopRef = useRef<HTMLDivElement>(null);
  const hasRequestedNotifRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  // Fetch today's completed pomodoro count for the counter badge
  useEffect(() => {
    if (!userId) return;
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    supabase
      .from("pomodoro_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("completed_at", todayUTC.toISOString())
      .then(({ count }) => {
        setTodayCount(count ?? 0);
      });
  }, [userId, supabase]);

  // Guest host detection via localStorage
  useEffect(() => {
    if (!isHostProp) {
      const guestOwned =
        localStorage.getItem(`pomodoro_host_${session.id}`) === "1";
      if (guestOwned) setIsHost(true);
    }
  }, [session.id, isHostProp]);

  // Restore or prompt for nickname (guests only)
  useEffect(() => {
    if (userId) return; // auth users have a username already
    const stored = localStorage.getItem(`pomodoro_nick_${session.id}`);
    if (stored) {
      setLocalUsername(stored);
      setNicknameReady(true);
    } else {
      setShowNicknamePrompt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  const canControl = isHost || sessionMode === "jam";

  const modeRef = useRef<TimerMode>("focus");

  const sessionSettingsRef = useRef(sessionSettings);
  useEffect(() => {
    sessionSettingsRef.current = sessionSettings;
  }, [sessionSettings]);

  const canControlRef = useRef(canControl);
  useEffect(() => {
    canControlRef.current = canControl;
  }, [canControl]);

  // Dedup guard: tracks startedAt of the last focus timer whose stats were logged.
  // Prevents double-counting in jam mode when both a local expire and a remote
  // broadcast arrive for the same timer run.
  const lastLoggedTimerRef = useRef<number | null>(null);
  // Mirrors timerState.startedAt so handleExpire can read it without a stale closure.
  const timerStartedAtRef = useRef<number | null>(null);

  // Refs for functions defined later — avoids temporal dead zone in handleExpire
  const broadcastTimerStateRef = useRef<((state: TimerState) => void) | null>(
    null,
  );
  const skipAndStartRef = useRef<
    | ((
        nextMode: TimerMode,
        durations?: Record<TimerMode, number>,
      ) => TimerState)
    | null
  >(null);

  // Serialized write queue — prevents concurrent timer writes from racing each other
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const enqueueSessionUpdate = useCallback(
    (patch: Record<string, unknown>) => {
      writeQueueRef.current = writeQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const { error } = await supabase
            .from("sessions")
            .update(patch)
            .eq("id", session.id);
          if (error) console.error("[session] DB write failed:", error);
        });
    },
    [supabase, session.id],
  );

  const handleExpire = useCallback(() => {
    playCompleteSound();
    showNotification("PomodoroJam", "Your room has ended! Time for a break.");
    const currentMode = modeRef.current;
    const settings = sessionSettingsRef.current;
    const durations = toSecs(settings.durations);

    // Log completed pomodoro for authenticated users (focus mode only).
    // Dedup by startedAt so jam-mode races don't double-count if both a local
    // expire and a remote broadcast arrive for the same timer run.
    if (userId && currentMode === "focus") {
      const startedAt = timerStartedAtRef.current;
      if (startedAt !== null && lastLoggedTimerRef.current !== startedAt) {
        lastLoggedTimerRef.current = startedAt;
        const minutes = Math.round(settings.durations.focus);
        supabase
          .rpc("increment_profile_stats", {
            p_user_id: userId,
            p_minutes: minutes,
            p_session_id: session.id,
            p_today: new Date().toLocaleDateString("en-CA"),
          })
          .then(({ error }) => {
            if (error)
              console.error("[handleExpire] Failed to log pomodoro:", error);
          });
      }
    }

    if (currentMode === "focus" && settings.autoStartBreaks) {
      focusCountRef.current += 1;
      setFocusCount(focusCountRef.current);
      setTodayCount((prev) => (prev ?? 0) + 1);
      const nextMode =
        focusCountRef.current % settings.rounds === 0 ? "long" : "short";
      const newState = skipAndStartRef.current?.(nextMode, durations);
      if (!newState) return;
      if (canControlRef.current) {
        broadcastTimerStateRef.current?.(newState);
        enqueueSessionUpdate({
          running: true,
          time_left: newState.timeLeft,
          total_time: newState.totalTime,
          mode: newState.mode,
          pomos_done: focusCountRef.current,
        });
      }
    } else if (
      (currentMode === "short" || currentMode === "long") &&
      settings.autoStartPomodoros
    ) {
      const newState = skipAndStartRef.current?.("focus", durations);
      if (!newState) return;
      if (canControlRef.current) {
        broadcastTimerStateRef.current?.(newState);
        enqueueSessionUpdate({
          running: true,
          time_left: newState.timeLeft,
          total_time: newState.totalTime,
          mode: newState.mode,
        });
      }
    } else {
      setShowBreakOverlay(true);
    }
  }, [userId, supabase, session.id, enqueueSessionUpdate]);

  const {
    timeLeft,
    status,
    mode,
    timerState,
    start,
    pause,
    reset,
    setMode,
    applyState,
    skipAndStart,
  } = useTimer({
    initialState: sessionToTimerState(session),
    onExpire: handleExpire,
  });

  const {
    participants,
    isConnected,
    broadcastTimerState,
    onTimerUpdate,
    broadcastShareLock,
    onShareLock,
    broadcastSessionMode,
    onSessionMode,
    onParticipantJoin,
    onParticipantLeave,
    broadcastActivity,
    onActivity,
    updatePresence,
    broadcastSettingsRequest,
    onSettingsRequest,
    broadcastSettingsResponse,
    onSettingsResponse,
  } = useSession({
    sessionId: session.id,
    userId,
    isHost,
    username: localUsername,
    avatarUrl,
  });

  // Bonfire state — derived from timer + presence, drives BonfireScene intensity
  const bonfireState = useBonfireState({
    status,
    mode,
    focusCount,
    participantCount: participants.length,
    timeLeft,
    totalTime: timerState.totalTime,
  });

  // Enrich every timer broadcast with the current focusCount so watchers stay in sync
  const broadcastWithCount = useCallback(
    (state: TimerState) => {
      broadcastTimerState({ ...state, focusCount: focusCountRef.current });
    },
    [broadcastTimerState],
  );

  // Keep late-bound refs up to date
  useEffect(() => {
    skipAndStartRef.current = skipAndStart;
  }, [skipAndStart]);
  useEffect(() => {
    broadcastTimerStateRef.current = broadcastWithCount;
  }, [broadcastWithCount]);

  // Clear pending settings request if channel disconnects — avoids infinite spinner
  useEffect(() => {
    if (!isConnected) setPendingSettingsRequest(false);
  }, [isConnected]);

  // Auto-cancel pending settings request after 30s if host never responds
  useEffect(() => {
    if (!pendingSettingsRequest) return;
    const t = setTimeout(() => setPendingSettingsRequest(false), 30_000);
    return () => clearTimeout(t);
  }, [pendingSettingsRequest]);

  // Keep refs up to date
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Short display name for activity messages — prefers live localUsername (guest nick)
  const actorName = localUsername ?? "Guest";

  // Push an ephemeral activity item — auto-removes after animation completes
  const pushActivity = useCallback((text: string) => {
    totalLogCountRef.current++;
    sessionLogRef.current = [...sessionLogRef.current, text].slice(-10);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setActivities((prev) => [...prev.slice(-2), { id, text }]);
    setTimeout(
      () => setActivities((prev) => prev.filter((a) => a.id !== id)),
      5050,
    );
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        tabHiddenAtRef.current = Date.now();
        logCountAtHideRef.current = totalLogCountRef.current;
      } else {
        if (tabHiddenAtRef.current === null) return;
        tabHiddenAtRef.current = null;
        const newCount = totalLogCountRef.current - logCountAtHideRef.current;
        const missed =
          newCount > 0 ? sessionLogRef.current.slice(-newCount) : [];
        if (missed.length === 0) return;
        setActivities([]);
        setMissedEvents(missed);
        if (missedEventsTimerRef.current)
          clearTimeout(missedEventsTimerRef.current);
        missedEventsTimerRef.current = setTimeout(
          () => setMissedEvents([]),
          4000,
        );
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (missedEventsTimerRef.current)
        clearTimeout(missedEventsTimerRef.current);
    };
  }, []);

  // Receive activity broadcasts from other participants
  useEffect(() => {
    return onActivity(pushActivity);
  }, [onActivity, pushActivity]);

  // Join / leave presence events → local activity messages
  useEffect(() => {
    return onParticipantJoin((joinedUsername, isReconnect) => {
      // Always resync timer state to the (re)joining participant
      if (isHost) broadcastWithCount(timerStateRef.current);
      // Suppress activity message on quick reconnects (tab switch / brief disconnect)
      if (!isReconnect) {
        const name = joinedUsername ?? "Someone";
        pushActivity(`${name} joined 👋`);
      }
    });
  }, [onParticipantJoin, pushActivity, isHost, broadcastWithCount]);

  useEffect(() => {
    return onParticipantLeave((leftUsername) => {
      const name = leftUsername ?? "Someone";
      pushActivity(`${name} left the room`);
    });
  }, [onParticipantLeave, pushActivity]);

  // Keep a ref to timerState so join handler always has the latest without re-subscribing
  const timerStateRef = useRef(timerState);
  useEffect(() => {
    timerStateRef.current = timerState;
    timerStartedAtRef.current = timerState.startedAt ?? null;
  }, [timerState]);

  // Always receive timer updates from other controllers.
  // broadcast: { self: false } ensures you never apply your own broadcasts.
  // In Jam mode this is essential — every participant must sync with whoever just acted.
  useEffect(() => {
    const unsubscribe = onTimerUpdate((state: TimerState) => {
      applyState(state);
      // Sync focusCount from host broadcasts so round label stays accurate for watchers
      if (state.focusCount !== undefined) {
        focusCountRef.current = state.focusCount;
        setFocusCount(state.focusCount);
      }
      // Log stats for watchers. Two cases:
      //
      // Case A — host broadcasts a finished state (autoStartBreaks=false, rare):
      //   state.status === "finished" && state.mode === "focus"
      //
      // Case B — host broadcasts the next running state immediately (autoStartBreaks=true):
      //   handleExpire increments focusCount then calls skipAndStart(break) and
      //   broadcasts the running break — the intermediate finished state is never sent.
      //   We detect this by: mode transitions from focus→break AND focusCount increased.
      //   modeRef.current is still "focus" here because applyState calls setTimerState
      //   which is async — React hasn't re-rendered yet.
      //   Using focusCount delta (state.focusCount > focusCountRef.current) also
      //   guards against logging stats for a skip (which does NOT increment focusCount).
      const isFocusFinished =
        state.status === "finished" && state.mode === "focus";
      const isFocusToBreakTransition =
        (state.mode === "short" || state.mode === "long") &&
        state.status === "running" &&
        modeRef.current === "focus" &&
        state.focusCount !== undefined &&
        state.focusCount > focusCountRef.current;

      if (userId && (isFocusFinished || isFocusToBreakTransition)) {
        // For Case B use the focus timer's startedAt (still in timerStartedAtRef
        // because timerState hasn't re-rendered yet), not the break's startedAt.
        const startedAt = isFocusToBreakTransition
          ? timerStartedAtRef.current
          : state.startedAt;
        if (startedAt !== null && lastLoggedTimerRef.current !== startedAt) {
          lastLoggedTimerRef.current = startedAt;
          const minutes = Math.round(sessionSettingsRef.current.durations.focus);
          supabase
            .rpc("increment_profile_stats", {
              p_user_id: userId,
              p_minutes: minutes,
              p_session_id: session.id,
              p_today: new Date().toLocaleDateString("en-CA"),
            })
            .then(({ error }) => {
              if (error)
                console.error("[onTimerUpdate] Failed to log pomodoro:", error);
            });
        }
      }
    });
    return unsubscribe;
  }, [onTimerUpdate, applyState, userId, supabase, session.id]);

  // (join re-broadcast + activity handled in the pushActivity/onParticipantJoin block above)

  // Receive share lock updates (non-hosts)
  useEffect(() => {
    if (isHost) return;
    const unsubscribe = onShareLock((locked) => {
      setSessionSettings((prev) => ({ ...prev, allowGuestShare: !locked }));
    });
    return unsubscribe;
  }, [isHost, onShareLock]);

  // Close share panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        sharePanelRef.current &&
        !sharePanelRef.current.contains(e.target as Node)
      ) {
        setShowSharePanel(false);
      }
    }
    if (showSharePanel) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showSharePanel]);

  // Close settings panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const inGear = settingsPanelRef.current?.contains(e.target as Node);
      const inDesktop = settingsPanelDesktopRef.current?.contains(
        e.target as Node,
      );
      if (!inGear && !inDesktop) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showSettings]);

  // Close watcher settings panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const inGear = watcherSettingsPanelRef.current?.contains(
        e.target as Node,
      );
      const inDesktop = watcherSettingsPanelDesktopRef.current?.contains(
        e.target as Node,
      );
      if (!inGear && !inDesktop) {
        setShowWatcherSettings(false);
      }
    }
    if (showWatcherSettings) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showWatcherSettings]);

  // Close sign-in popover on outside click
  useEffect(() => {
    if (!showSignInPopover) return;
    function handleClick(e: MouseEvent) {
      if (
        signInPopoverRef.current &&
        !signInPopoverRef.current.contains(e.target as Node)
      ) {
        setShowSignInPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSignInPopover]);

  const handleSignIn = async (provider: "github" | "google") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast("Sign-in failed. Please try again.", "error");
  };

  // Request notification permission
  useEffect(() => {
    if (!hasRequestedNotifRef.current) {
      hasRequestedNotifRef.current = true;
      requestNotificationPermission();
    }
  }, []);

  // Track latest participants in a ref so the heartbeat can read it without restarting the interval
  const participantsRef = useRef(participants);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Write participant count + preview immediately whenever the list changes (so explore reflects joins fast)
  useEffect(() => {
    if (!isHost) return;
    const preview = participants.slice(0, 3).map((p) => ({
      username: p.username ?? null,
      avatar_url: p.avatar_url ?? null,
    }));
    supabase
      .from("sessions")
      .update({
        participant_count: participants.length,
        participant_preview: preview,
      })
      .eq("id", session.id)
      .then(({ error }) => {
        if (error) console.error("[participant-sync] Failed:", error);
      });
  }, [isHost, participants, supabase, session.id]);

  // Host heartbeat — keeps last_active_at + participant data fresh for explore page
  useEffect(() => {
    if (!isHost) return;
    const id = setInterval(() => {
      const preview = participantsRef.current.slice(0, 3).map((p) => ({
        username: p.username ?? null,
        avatar_url: p.avatar_url ?? null,
      }));
      supabase
        .from("sessions")
        .update({
          last_active_at: new Date().toISOString(),
          participant_count: participantsRef.current.length,
          participant_preview: preview,
        })
        .eq("id", session.id)
        .then(({ error }) => {
          if (error) console.error("[heartbeat] Failed:", error);
        });
    }, 30_000);
    return () => clearInterval(id);
  }, [isHost, supabase, session.id]);

  // Warn host before closing tab while timer is running
  useEffect(() => {
    if (!isHost) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === "running") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isHost, status]);

  // Set session mode (host only) — await DB first, then broadcast to avoid state divergence
  const handleSetMode = useCallback(
    async (mode: "host" | "jam" | "solo") => {
      if (mode === sessionMode) return;
      const { error } = await supabase
        .from("sessions")
        .update({ session_mode: mode, jam_mode: mode === "jam" })
        .eq("id", session.id);
      if (error) {
        console.error("[handleSetMode] DB update failed:", error);
        return;
      }
      setSessionMode(mode);
      broadcastSessionMode(mode);
      const messages: Record<"host" | "jam" | "solo", string> = {
        host: `${actorName} switched to Host mode 👑`,
        jam: `${actorName} switched to Jam mode ⚡`,
        solo: `${actorName} switched to Solo mode 🎯`,
      };
      broadcastActivity(messages[mode]);
    },
    [
      sessionMode,
      session.id,
      supabase,
      broadcastSessionMode,
      broadcastActivity,
      actorName,
    ],
  );

  // Non-hosts receive session mode changes from the host
  useEffect(() => {
    if (isHost) return;
    const unsubscribe = onSessionMode((next) => {
      setSessionMode(next);
    });
    return unsubscribe;
  }, [isHost, onSessionMode]);

  // Host receives settings change requests from watchers
  useEffect(() => {
    if (!isHost) return;
    const unsubscribe = onSettingsRequest((request) => {
      // Auto-reject any existing pending request before accepting the new one,
      // so the first requester isn't left waiting indefinitely
      if (pendingRequestRef.current) {
        broadcastSettingsResponse({
          requester_id: pendingRequestRef.current.requester_id,
          accepted: false,
        });
      }
      setPendingRequest(request);
    });
    return unsubscribe;
  }, [isHost, onSettingsRequest, broadcastSettingsResponse]);

  // Watchers receive response from host (accepted/rejected)
  useEffect(() => {
    if (isHost) return;
    const unsubscribe = onSettingsResponse((response) => {
      const guestId =
        typeof window !== "undefined"
          ? localStorage.getItem("pomodoro_guest_id")
          : null;
      const myId = userId ?? guestId;
      if (response.requester_id !== myId) return;
      setPendingSettingsRequest(false);
      if (response.accepted && response.settings) {
        const settings = response.settings;
        // Apply the accepted settings locally so round labels and UI stay in sync
        setSessionSettings((prev) => ({
          durations: {
            focus: settings.focus,
            short: settings.short,
            long: settings.long,
          },
          rounds: settings.rounds,
          allowGuestShare: prev.allowGuestShare, // host-only setting, preserve watcher's current value
          autoStartBreaks: settings.autoStartBreaks,
          autoStartPomodoros: settings.autoStartPomodoros,
        }));
        toast("Host accepted your settings request ✓", "success");
        setShowWatcherSettings(false);
      } else if (!response.accepted) {
        toast("Host declined your settings request", "error");
      }
    });
    return unsubscribe;
  }, [isHost, onSettingsResponse, userId, toast]);

  const handleSendSettingsRequest = useCallback(
    (newSettings: SessionSettings) => {
      const guestId =
        typeof window !== "undefined"
          ? localStorage.getItem("pomodoro_guest_id")
          : null;
      const myId = userId ?? guestId ?? "unknown";
      broadcastSettingsRequest({
        requester_id: myId,
        requester_name: localUsername,
        focus: newSettings.durations.focus,
        short: newSettings.durations.short,
        long: newSettings.durations.long,
        rounds: newSettings.rounds,
        autoStartBreaks: newSettings.autoStartBreaks,
        autoStartPomodoros: newSettings.autoStartPomodoros,
      });
      setPendingSettingsRequest(true);
      toast("Settings request sent to host", "info");
    },
    [userId, localUsername, broadcastSettingsRequest, toast],
  );

  const handleStart = useCallback(() => {
    const newState = start();
    const msg = `${actorName} started the timer 🍅`;
    broadcastActivity(msg);
    if (canControl) {
      broadcastWithCount(newState);
      enqueueSessionUpdate({
        running: true,
        time_left: newState.timeLeft,
        mode: newState.mode,
      });
    }
  }, [
    start,
    actorName,
    canControl,
    broadcastWithCount,
    broadcastActivity,
    enqueueSessionUpdate,
  ]);

  const handlePause = useCallback(() => {
    const newState = pause();
    const mins = String(Math.floor(newState.timeLeft / 60)).padStart(2, "0");
    const secs = String(newState.timeLeft % 60).padStart(2, "0");
    const msg = `${actorName} paused, ${mins}:${secs} remaining ⏸`;
    broadcastActivity(msg);
    if (canControl) {
      broadcastWithCount(newState);
      enqueueSessionUpdate({ running: false, time_left: newState.timeLeft });
    }
  }, [
    pause,
    actorName,
    canControl,
    broadcastWithCount,
    broadcastActivity,
    enqueueSessionUpdate,
  ]);

  // Global keyboard shortcuts (placed after handleStart/handlePause declarations)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
        return;
      }
      if (showShortcutsModal) return;
      if (e.code === "Space" && canControl) {
        e.preventDefault();
        if (status === "running") handlePause();
        else handleStart();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showShortcutsModal, canControl, status, handleStart, handlePause]);

  const handleReset = useCallback(() => {
    const newState = reset(toSecs(sessionSettings.durations));
    setShowBreakOverlay(false);
    const msg = `${actorName} reset the timer ↺`;
    broadcastActivity(msg);
    if (canControl) {
      broadcastWithCount(newState);
      enqueueSessionUpdate({
        running: false,
        time_left: newState.timeLeft,
        total_time: newState.totalTime,
        mode: newState.mode,
      });
    }
  }, [
    reset,
    actorName,
    canControl,
    broadcastWithCount,
    broadcastActivity,
    sessionSettings.durations,
    enqueueSessionUpdate,
  ]);

  const handleSkip = useCallback(() => {
    // Skip = partial session, no credit. Do NOT increment focusCount or todayCount.
    // Only a timer that runs to zero earns a pomodoro (handleExpire handles that).
    const nextMode: TimerMode = mode === "focus"
      ? (focusCountRef.current % sessionSettings.rounds === 0 ? "long" : "short")
      : "focus";
    const modeMessages: Record<TimerMode, string> = {
      short: `Short break started ☕`,
      long: `Long break. Take a proper rest 🎉`,
      focus: `${actorName} started a new focus round 🍅`,
    };
    broadcastActivity(modeMessages[nextMode]);
    const newState = setMode(nextMode, toSecs(sessionSettings.durations));
    setShowBreakOverlay(false);
    if (canControl) {
      broadcastWithCount(newState);
      enqueueSessionUpdate({
        running: false,
        time_left: newState.timeLeft,
        total_time: newState.totalTime,
        mode: newState.mode,
      });
    }
  }, [
    mode,
    actorName,
    setMode,
    canControl,
    broadcastWithCount,
    broadcastActivity,
    sessionSettings.durations,
    sessionSettings.rounds,
    enqueueSessionUpdate,
  ]);

  const handleModeChange = useCallback(
    (newMode: TimerMode) => {
      const modeMessages: Record<TimerMode, string> = {
        short: `Short break started ☕`,
        long: `Long break. Take a proper rest 🎉`,
        focus: `${actorName} started a new focus round 🍅`,
      };
      const msg = modeMessages[newMode];
      broadcastActivity(msg);
      const newState = setMode(newMode, toSecs(sessionSettings.durations));
      setShowBreakOverlay(false);
      if (canControl) {
        broadcastWithCount(newState);
        enqueueSessionUpdate({
          running: false,
          time_left: newState.timeLeft,
          total_time: newState.totalTime,
          mode: newState.mode,
        });
      }
    },
    [
      setMode,
      actorName,
      canControl,
      broadcastWithCount,
      broadcastActivity,
      sessionSettings.durations,
      enqueueSessionUpdate,
    ],
  );

  const handleApplySettings = useCallback(
    async (newSettings: SessionSettings) => {
      setSessionSettings(newSettings);
      setShowSettings(false);
      const newState = reset(toSecs(newSettings.durations));
      if (canControl) {
        const { error } = await supabase
          .from("sessions")
          .update({
            running: false,
            time_left: newState.timeLeft,
            mode: newState.mode,
            settings: {
              focus: newSettings.durations.focus,
              short: newSettings.durations.short,
              long: newSettings.durations.long,
              rounds: newSettings.rounds,
              allowGuestShare: newSettings.allowGuestShare,
              autoStartBreaks: newSettings.autoStartBreaks,
              autoStartPomodoros: newSettings.autoStartPomodoros,
            },
          })
          .eq("id", session.id);
        if (error) {
          console.error("[handleApplySettings] DB update failed:", error);
          return false;
        } else {
          broadcastWithCount(newState);
          broadcastShareLock(!newSettings.allowGuestShare);
        }
      }
      return true;
    },
    [
      reset,
      canControl,
      broadcastWithCount,
      broadcastShareLock,
      supabase,
      session.id,
    ],
  );

  const isTogglingPublic = useRef(false);

  const handleTogglePublic = useCallback(
    async (newValue: boolean) => {
      if (isTogglingPublic.current) return;
      isTogglingPublic.current = true;
      const oldValue = isPublic;
      setIsPublic(newValue);
      const { error } = await supabase
        .from("sessions")
        .update({ is_public: newValue })
        .eq("id", session.id);
      if (error) {
        console.error("[handleTogglePublic] DB update failed:", error);
        setIsPublic(oldValue);
      }
      isTogglingPublic.current = false;
    },
    [isPublic, supabase, session.id],
  );

  const handleAcceptRequest = useCallback(async () => {
    if (!pendingRequest) return;
    const newSettings: SessionSettings = {
      durations: {
        focus: pendingRequest.focus,
        short: pendingRequest.short,
        long: pendingRequest.long,
      },
      rounds: pendingRequest.rounds,
      allowGuestShare: sessionSettings.allowGuestShare,
      autoStartBreaks: pendingRequest.autoStartBreaks,
      autoStartPomodoros: pendingRequest.autoStartPomodoros,
    };
    const ok = await handleApplySettings(newSettings);
    broadcastSettingsResponse({
      requester_id: pendingRequest.requester_id,
      accepted: ok,
      // Include settings so the watcher can apply them locally without a separate broadcast
      settings: ok
        ? {
            focus: newSettings.durations.focus,
            short: newSettings.durations.short,
            long: newSettings.durations.long,
            rounds: newSettings.rounds,
            autoStartBreaks: newSettings.autoStartBreaks,
            autoStartPomodoros: newSettings.autoStartPomodoros,
          }
        : undefined,
    });
    setPendingRequest(null);
  }, [
    pendingRequest,
    sessionSettings.allowGuestShare,
    handleApplySettings,
    broadcastSettingsResponse,
  ]);

  const handleRejectRequest = useCallback(() => {
    if (!pendingRequest) return;
    broadcastSettingsResponse({
      requester_id: pendingRequest.requester_id,
      accepted: false,
    });
    setPendingRequest(null);
  }, [pendingRequest, broadcastSettingsResponse]);

  const roundLabel = `${focusCount} pomodoro${focusCount !== 1 ? "s" : ""} completed today`;

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Header */}
      <header
        className="relative flex items-center justify-between px-4 sm:px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" aria-label="Back to home">
          <Logo size="sm" />
        </Link>

        {/* Tab nav — centered absolutely */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-xl"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          {(["timer", "tasks", "stats"] as const).map((tab) => {
            const label = tab.charAt(0).toUpperCase() + tab.slice(1);
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer"
                style={
                  active
                    ? {
                        background: "var(--bg-elevated)",
                        color: "var(--text-primary)",
                        boxShadow: "var(--shadow-sm)",
                      }
                    : { color: "var(--text-muted)" }
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Explore + Profile links */}
          <Link
            href="/explore"
            className="hidden sm:block text-sm font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Explore
          </Link>
          {profileUsername ? (
            <Link
              href={`/profile/${profileUsername}`}
              aria-label="Your profile"
              className="flex-shrink-0"
            >
              <Avatar
                src={avatarUrl ?? undefined}
                name={username ?? profileUsername}
                size="sm"
              />
            </Link>
          ) : (
            !userId && (
              <div className="relative flex-shrink-0" ref={signInPopoverRef}>
                <button
                  onClick={() => setShowSignInPopover((v) => !v)}
                  aria-label="Sign in"
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                >
                  <UserCircle className="w-5 h-5" />
                </button>
                {showSignInPopover && (
                  <div
                    className="absolute right-0 top-9 w-52 rounded-2xl overflow-hidden z-50 animate-scale-in"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    <div
                      className="px-4 py-3"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Sign in to save your stats
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Track streaks, pomodoros, and more.
                      </p>
                    </div>
                    <div className="py-1">
                      {(["github", "google"] as const).map((provider) => (
                        <button
                          key={provider}
                          onClick={() => void handleSignIn(provider)}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors cursor-pointer capitalize"
                          style={{ color: "var(--text-primary)" }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "var(--bg-secondary)";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "transparent";
                          }}
                        >
                          {provider === "github" ? (
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                          )}
                          {provider.charAt(0).toUpperCase() + provider.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Connection status */}
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4" style={{ color: "var(--green)" }} />
            ) : (
              <WifiOff className="w-4 h-4 animate-pulse" />
            )}
            <span className="hidden sm:block">
              {isConnected ? "Live" : "Connecting"}
            </span>
          </div>

          <button
            onClick={() => setShowShortcutsModal((v) => !v)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-sm font-medium"
            style={{
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              background: "var(--bg-secondary)",
            }}
          >
            ?
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Jam mode banner for watchers */}
      {sessionMode === "jam" && !isHost && (
        <div
          className="px-4 py-2 text-center text-xs"
          style={{
            background: "var(--green-soft)",
            borderBottom: "1px solid var(--border)",
            color: "var(--green)",
          }}
        >
          Jam Mode: everyone controls the timer
        </div>
      )}

      {/* Stats tab */}
      {activeTab === "stats" && (
        <div className="flex-1 overflow-y-auto">
          <StatsTab
            userId={userId}
            username={localUsername}
            avatarUrl={avatarUrl ?? null}
          />
        </div>
      )}

      {/* Tasks tab */}
      {activeTab === "tasks" && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-3">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Tasks
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Coming in an upcoming update.
          </p>
        </div>
      )}

      {/* Main */}
      <main
        className={
          activeTab === "timer"
            ? "flex-1 flex flex-col items-center justify-start px-4 sm:px-6 pt-6 sm:pt-8 pb-4"
            : "hidden"
        }
      >
        {/* Timer area — no card, fire floats on page background */}
        <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center gap-4 sm:gap-5 animate-scale-in">
          {/* Mode selector + round info */}
          <div className="flex flex-col items-center gap-2 w-full">
            <ModeSelector
              mode={mode}
              isHost={canControl}
              onChange={handleModeChange}
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {roundLabel}
            </p>
          </div>

          {/* ── Bonfire ──────────────────────────────────────────────────── */}
          {/* BonfireScene is dynamically imported with ssr:false — it only
              mounts in the browser. The fallback div reserves the space so
              the layout doesn't shift when it loads. */}
          <BonfireScene
            targetIntensity={bonfireState.targetIntensity}
            isSurging={bonfireState.isSurging}
            focusCount={focusCount}
            participantCount={participants.length}
            mode={mode}
          />

          {/* ── Room name — below fire, above time ───────────────────────── */}
          {session.title && (
            <p
              className="text-xs font-semibold tracking-widest flex items-center gap-1.5 -mt-2"
              style={{ color: "#F0A050" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                style={{
                  background:
                    bonfireState.targetIntensity > 0.5
                      ? "#FF7733"
                      : bonfireState.targetIntensity > 0.25
                        ? "#C05010"
                        : "#553020",
                  boxShadow:
                    bonfireState.targetIntensity > 0.5
                      ? "0 0 6px #FF7733"
                      : "none",
                }}
              />
              {session.title.toUpperCase()}
            </p>
          )}

          {/* ── Timer display ─────────────────────────────────────────────── */}
          <TimerDisplay timeLeft={timeLeft} status={status} mode={mode} />

          {/* ── Controls + rest of card — bottom padding section ─────────── */}
          <div className="flex flex-col items-center gap-4 sm:gap-5 w-full">
            <TimerControls
              status={status}
              isHost={isHost}
              jamMode={sessionMode === "jam"}
              onPlay={handleStart}
              onPause={handlePause}
              onSkip={handleSkip}
              onReset={handleReset}
            />

            {/* Session mode + Focus music — side-by-side compact dropdowns */}
            {isHost && (
              <div className="w-full grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Session Mode
                  </label>
                  <div
                    className="flex rounded-lg overflow-hidden"
                    style={{ border: "1px solid var(--border)" }}
                    role="group"
                    aria-label="Session mode"
                  >
                    {(["host", "jam", "solo"] as const).map((m, i) => {
                      const isActive = sessionMode === m;
                      const isDisabled =
                        m === "solo" && participants.length > 1;
                      const labels = { host: "Host", jam: "Jam", solo: "Solo" };
                      return (
                        <button
                          key={m}
                          disabled={isDisabled}
                          onClick={() => {
                            if (!isDisabled) {
                              setModeTipDismissed(true);
                              void handleSetMode(m);
                            }
                          }}
                          className="flex-1 h-9 text-xs font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            background: isActive
                              ? "var(--accent)"
                              : "var(--bg-secondary)",
                            color: isActive ? "#fff" : "var(--text-muted)",
                            borderLeft:
                              i > 0 ? "1px solid var(--border)" : "none",
                          }}
                        >
                          {labels[m]}
                        </button>
                      );
                    })}
                  </div>
                  <p
                    className="text-[10px] leading-tight"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {sessionMode === "host" &&
                      "You start, pause, and skip. Participants just watch."}
                    {sessionMode === "jam" &&
                      "Anyone in the room can control the timer."}
                    {sessionMode === "solo" &&
                      "Private session. New participants cannot join."}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Focus Music
                  </label>
                  <AmbientPlayer compact onActiveChange={setAmbientActive} />
                </div>
              </div>
            )}

            <ParticipantList participants={participants} />

            {/* Separator */}
            <div
              className="w-full"
              style={{ borderTop: "1px solid var(--border)" }}
            />

            {/* Actions row: Invite (prominent) + Settings gear */}
            <div className="flex items-center gap-2 w-full">
              {/* Invite button — hidden when host locked sharing, or in solo mode */}
              {(isHost || sessionSettings.allowGuestShare) &&
                sessionMode !== "solo" && (
                  <div className="relative shrink-0" ref={sharePanelRef}>
                    <button
                      onClick={() => setShowSharePanel((v) => !v)}
                      aria-label="Share room"
                      aria-expanded={showSharePanel}
                      className="h-10 flex items-center justify-center gap-1.5 px-4 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer"
                      style={{
                        background: showSharePanel
                          ? "var(--accent)"
                          : "var(--bg-secondary)",
                        borderColor: showSharePanel
                          ? "var(--accent)"
                          : "var(--border)",
                        color: showSharePanel ? "#fff" : "var(--text-primary)",
                      }}
                    >
                      <Users className="w-4 h-4" />
                      Invite
                    </button>

                    {showSharePanel && (
                      <div
                        className="absolute left-0 bottom-12 w-72 rounded-2xl z-50 p-4 animate-scale-in"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          boxShadow: "var(--shadow-lg)",
                        }}
                      >
                        <SharePanel
                          sessionId={session.id}
                          sessionName={session.title}
                        />
                      </div>
                    )}
                  </div>
                )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Settings gear — host */}
              {isHost && (
                <div ref={settingsPanelRef} className="relative shrink-0">
                  <button
                    onClick={() => setShowSettings((v) => !v)}
                    title="Timer settings"
                    aria-label="Timer settings"
                    className="h-10 w-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer"
                    style={{
                      background: showSettings
                        ? "var(--accent-soft)"
                        : "var(--bg-secondary)",
                      borderColor: showSettings
                        ? "var(--accent)"
                        : "var(--border)",
                      color: showSettings
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    }}
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {showSettings && (
                    <>
                      <div
                        className="fixed inset-0 z-40 xl:hidden"
                        style={{ background: "rgba(0,0,0,0.5)" }}
                        onClick={() => setShowSettings(false)}
                      />
                      <div className="fixed bottom-0 left-0 right-0 z-50 xl:hidden">
                        <div
                          className="rounded-t-2xl p-4 animate-slide-up-sheet max-h-[85vh] overflow-y-auto"
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            boxShadow: "var(--shadow-lg)",
                          }}
                        >
                          <SettingsPanel
                            settings={sessionSettings}
                            onApply={handleApplySettings}
                            disabled={status === "running"}
                            isPublic={isPublic}
                            onTogglePublic={handleTogglePublic}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Settings gear — watcher */}
              {!isHost && (
                <div
                  ref={watcherSettingsPanelRef}
                  className="relative shrink-0"
                >
                  <button
                    onClick={() => setShowWatcherSettings((v) => !v)}
                    title="Request settings change"
                    aria-label="Request settings change"
                    className="h-10 w-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer"
                    style={{
                      background: showWatcherSettings
                        ? "var(--accent-soft)"
                        : "var(--bg-secondary)",
                      borderColor: showWatcherSettings
                        ? "var(--accent)"
                        : "var(--border)",
                      color: showWatcherSettings
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    }}
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {showWatcherSettings && (
                    <>
                      <div
                        className="fixed inset-0 z-40 xl:hidden"
                        style={{ background: "rgba(0,0,0,0.5)" }}
                        onClick={() => setShowWatcherSettings(false)}
                      />
                      <div className="fixed bottom-0 left-0 right-0 z-50 xl:hidden">
                        <div
                          className="rounded-t-2xl p-4 animate-slide-up-sheet max-h-[85vh] overflow-y-auto"
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            boxShadow: "var(--shadow-lg)",
                          }}
                        >
                          {pendingSettingsRequest ? (
                            <div className="flex flex-col items-center gap-3 py-4 text-center">
                              <span
                                className="w-5 h-5 border-2 rounded-full animate-spin"
                                style={{
                                  borderColor: "var(--border)",
                                  borderTopColor: "var(--accent)",
                                }}
                              />
                              <p
                                className="text-sm font-medium"
                                style={{ color: "var(--text-primary)" }}
                              >
                                Waiting for host approval...
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                The host will accept or decline your request.
                              </p>
                              <button
                                onClick={() => setPendingSettingsRequest(false)}
                                className="text-xs underline cursor-pointer"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <SettingsPanel
                              settings={sessionSettings}
                              onApply={handleSendSettingsRequest}
                              isWatcher
                            />
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* end bottom section */}
        </div>
      </main>

      {/* Desktop settings panel — host. Fixed in right free space, vertically centred.
          Outer div: positioning only (no animation) so -translate-y-1/2 is never 
          
          
          overwritten.
          Inner div: scale-in animation only. */}
      {showSettings && isHost && (
        <div
          ref={settingsPanelDesktopRef}
          className="hidden xl:block fixed z-50"
          style={{
            top: "50%",
            left: "calc(50% + 15rem)",
            transform: "translateY(-50%)",
          }}
        >
          <div
            className="w-72 rounded-2xl p-4 animate-scale-in"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <SettingsPanel
              settings={sessionSettings}
              onApply={handleApplySettings}
              disabled={status === "running"}
              isPublic={isPublic}
              onTogglePublic={handleTogglePublic}
            />
          </div>
        </div>
      )}

      {/* Desktop settings panel — watcher. Same fixed layout. */}
      {showWatcherSettings && !isHost && (
        <div
          ref={watcherSettingsPanelDesktopRef}
          className="hidden xl:block fixed z-50"
          style={{
            top: "50%",
            left: "calc(50% + 15rem)",
            transform: "translateY(-50%)",
          }}
        >
          <div
            className="w-72 rounded-2xl p-4 animate-scale-in"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {pendingSettingsRequest ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <span
                  className="w-5 h-5 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: "var(--border)",
                    borderTopColor: "var(--accent)",
                  }}
                />
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Waiting for host approval...
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  The host will accept or decline your request.
                </p>
                <button
                  onClick={() => setPendingSettingsRequest(false)}
                  className="text-xs underline cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <SettingsPanel
                settings={sessionSettings}
                onApply={handleSendSettingsRequest}
                isWatcher
              />
            )}
          </div>
        </div>
      )}

      {isHost && (
        <ModeTipBubble
          externalDismiss={modeTipDismissed}
          ready={nicknameReady}
        />
      )}

      <BreakOverlay
        visible={showBreakOverlay}
        onDismiss={() => {
          setShowBreakOverlay(false);
          if (canControl) handleSkip();
        }}
        mode={mode}
        canControl={canControl}
      />

      {missedEvents.length > 0 && (
        <MissedEventsToast
          events={missedEvents}
          onDismiss={() => setMissedEvents([])}
        />
      )}
      <ActivityFeed items={activities} />

      {isHost && pendingRequest && (
        <SettingsRequestCard
          request={pendingRequest}
          currentSettings={sessionSettings}
          timerRunning={status === "running"}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
        />
      )}

      {showNicknamePrompt && (
        <GuestNicknamePrompt
          onSave={(name) => {
            setLocalUsername(name);
            localStorage.setItem(`pomodoro_nick_${session.id}`, name);
            updatePresence(name);
            setShowNicknamePrompt(false);
            setNicknameReady(true);
          }}
          onSkip={() => {
            // Safety net: assign a random name instead of leaving username null
            const fallback = generateUsername();
            setLocalUsername(fallback);
            localStorage.setItem(`pomodoro_nick_${session.id}`, fallback);
            updatePresence(fallback);
            setShowNicknamePrompt(false);
            setNicknameReady(true);
          }}
        />
      )}

      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}
    </div>
  );
}

export function SessionProvider(props: SessionProviderProps) {
  return (
    <ToastProvider>
      <SessionContent {...props} />
    </ToastProvider>
  );
}
