import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";
import { Navbar } from "./Navbar.jsx";
import { MobileNav } from "./MobileNav.jsx";

const titles = {
  "/": "Dashboard",
  "/contacts": "Contacts",
  "/deals": "Deals",
  "/tasks": "Tasks",
  "/invoices": "Invoices",
  "/users": "Users & Roles",
  "/settings": "Settings"
};

export const Layout = () => {
  const location = useLocation();
  const title = titles[location.pathname] || "NexCRM";

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-16 lg:pb-0">
        <Navbar title={title} />
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
};
