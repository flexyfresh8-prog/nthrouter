import { useEffect, useState } from "react";
import { getCurrentPath, navigate, onRouteChange } from "./lib/router.js";
import { init, useApp } from "./lib/store.js";
import LockScreen from "./components/LockScreen.jsx";
import SideNav from "./components/SideNav.jsx";
import BottomTabs from "./components/BottomTabs.jsx";
import BootScreen from "./components/BootScreen.jsx";
import Toasts from "./components/Toasts.jsx";
import Dashboard from "./routes/index.jsx";
import KeysList from "./routes/keys.jsx";
import NewKey from "./routes/keys.new.jsx";
import KeyDetail from "./routes/keyDetail.jsx";
import ChatList from "./routes/chat.jsx";
import ChatScreen from "./routes/chatScreen.jsx";
import Settings from "./routes/settings.jsx";
import Docs from "./routes/docs.jsx";
import NotFound from "./routes/notfound.jsx";

const ROUTES = [
  { match: /^\/$/, render: () => <Dashboard /> },
  { match: /^\/keys$/, render: () => <KeysList /> },
  { match: /^\/keys\/new$/, render: () => <NewKey /> },
  { match: /^\/keys\/([^/]+)$/, render: (m) => <KeyDetail keyId={m[1]} /> },
  { match: /^\/chat$/, render: () => <ChatList /> },
  { match: /^\/chat\/([^/]+)$/, render: (m) => <ChatScreen chatId={m[1]} /> },
  { match: /^\/settings$/, render: () => <Settings /> },
  { match: /^\/docs$/, render: () => <Docs /> },
];

function resolveRoute(path) {
  const clean = path.split("?")[0];
  for (const r of ROUTES) {
    const m = clean.match(r.match);
    if (m) return r.render(m);
  }
  return <NotFound />;
}

export default function App() {
  const { ready, locked, settings } = useApp();
  const [booted, setBooted] = useState(false);
  const [path, setPath] = useState(getCurrentPath());

  useEffect(() => {
    init();
    const off = onRouteChange(setPath);
    const pop = () => setPath(getCurrentPath());
    window.addEventListener("popstate", pop);
    return () => {
      off();
      window.removeEventListener("popstate", pop);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", settings.theme === "dark" ? "#171310" : "#F6F4EF");
  }, [settings.theme]);

  // The boot screen plays once per hard load, then fades out. The vault
  // unlock sits behind it, so the animation never blocks a locked session.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setBooted(true), 1100);
    return () => clearTimeout(t);
  }, [ready]);

  if (!ready || !booted) return <BootScreen done={ready && booted} />;

  return (
    <div className="min-h-screen bg-muted/60">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1180px] flex-col bg-background md:border-x md:border-border md:flex-row">
        {locked && <LockScreen />}
        <SideNav />
        <main className="min-w-0 flex-1 pb-24 md:pb-0">{resolveRoute(path)}</main>
        <BottomTabs />
      </div>
      <Toasts />
    </div>
  );
}

export { navigate };
