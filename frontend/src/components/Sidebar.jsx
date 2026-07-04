import { NavLink } from "react-router-dom";
import { CheckSquare, Handshake, LayoutDashboard, Receipt, Settings, ShieldCheck, Users } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/deals", label: "Deals", icon: Handshake },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/users", label: "Users", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings }
];

export const Sidebar = () => (
  <aside className="hidden w-64 shrink-0 border-r border-line bg-white lg:block">
    <div className="flex h-16 items-center border-b border-line px-5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-sm font-bold text-white">N</div>
      <div className="ml-3">
        <p className="text-base font-semibold text-ink">NexCRM</p>
        <p className="text-xs text-muted">Sales workspace</p>
      </div>
    </div>
    <nav className="space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                isActive ? "bg-[#E9F3F1] text-brand" : "text-muted hover:bg-slate-50 hover:text-ink"
              }`
            }
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  </aside>
);
