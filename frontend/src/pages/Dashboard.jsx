import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Handshake, Receipt, TrendingUp, Users } from "lucide-react";
import { api } from "../services/api.js";
import { StatCard } from "../components/StatCard.jsx";
import { Badge } from "../components/Badge.jsx";
import { formatCurrency, formatDate, formatDateTime, enumLabel } from "../utils/formatters.js";
import { dealStages } from "../utils/constants.js";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/dashboard");
      setData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-muted">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  const metrics = data.metrics;
  const maxRevenue = Math.max(...data.monthlySales.map((month) => month.revenue), 1);
  const stageMap = new Map(data.pipelineStages.map((stage) => [stage.stage, stage]));

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Contacts" value={metrics.totalContacts} hint={`${metrics.newLeads} active leads`} icon={Users} />
        <StatCard title="Pipeline" value={formatCurrency(metrics.pipelineValue)} hint={`${metrics.totalDeals} total deals`} icon={Handshake} />
        <StatCard title="Won Deals" value={metrics.wonDeals} hint={`${metrics.conversionRate}% close rate`} icon={CheckCircle2} />
        <StatCard title="Outstanding" value={formatCurrency(metrics.outstandingAmount)} hint={`${metrics.overdueTasks} overdue tasks`} icon={AlertTriangle} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Monthly Sales</h2>
              <p className="text-sm text-muted">Paid revenue from the last six months</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-brand">
              <TrendingUp size={17} />
              {formatCurrency(metrics.paidRevenue)} paid
            </div>
          </div>
          <div className="flex h-56 items-end gap-3 border-b border-line pb-4">
            {data.monthlySales.map((month) => (
              <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t bg-brand" style={{ height: `${Math.max(8, (month.revenue / maxRevenue) * 190)}px` }} />
                <span className="text-xs text-muted">{month.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-ink">Pipeline Stages</h2>
          <div className="mt-4 grid gap-3">
            {dealStages.map((stage) => {
              const item = stageMap.get(stage.key) || { count: 0, value: 0 };
              return (
                <div key={stage.key} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{stage.label}</p>
                    <p className="text-xs text-muted">{item.count} deals</p>
                  </div>
                  <p className="text-sm font-semibold text-ink">{formatCurrency(item.value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-ink">Recent Contacts</h2>
          <div className="mt-4 grid gap-3">
            {data.recentContacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{contact.firstName} {contact.lastName}</p>
                  <p className="text-xs text-muted">{contact.companyName || contact.email || "No company"}</p>
                </div>
                <Badge value={contact.status}>{enumLabel(contact.status)}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-ink">Upcoming Tasks</h2>
          <div className="mt-4 grid gap-3">
            {data.recentTasks.map((task) => (
              <div key={task.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{task.title}</p>
                  <Badge value={task.priority}>{enumLabel(task.priority)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">Due {formatDate(task.dueDate)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Receipt size={18} className="text-brand" />
            <h2 className="text-base font-semibold text-ink">Activity</h2>
          </div>
          <div className="grid gap-3">
            {data.activities.map((activity) => (
              <div key={activity.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <p className="text-sm text-ink">{activity.description || enumLabel(activity.action)}</p>
                <p className="mt-1 text-xs text-muted">{formatDateTime(activity.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
