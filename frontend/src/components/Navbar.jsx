import { LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "./Button.jsx";
import { enumLabel } from "../utils/formatters.js";

export const Navbar = ({ title, onRefresh }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:px-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        <p className="text-xs text-muted">{user?.organization?.name || "NexCRM workspace"}</p>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh ? (
          <Button variant="secondary" size="icon" onClick={onRefresh} aria-label="Refresh">
            <RefreshCw size={17} />
          </Button>
        ) : null}
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-ink">{user?.name}</p>
          <p className="text-xs text-muted">{enumLabel(user?.role)}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  );
};
