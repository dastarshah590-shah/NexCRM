import { NavLink } from "react-router-dom";
import { CheckSquare, Handshake, LayoutDashboard, Receipt, Settings, Users } from "lucide-react";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/deals", label: "Deals", icon: Handshake },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/settings", label: "Settings", icon: Settings }
];

export const MobileNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-white lg:hidden">
    {items.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium ${isActive ? "text-brand" : "text-muted"}`
          }
        >
          <Icon size={18} />
          <span className="max-w-full truncate px-1">{item.label}</span>
        </NavLink>
      );
    })}
  </nav>
);
