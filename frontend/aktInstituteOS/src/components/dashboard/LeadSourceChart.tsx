"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { MoreHorizontal } from "lucide-react";

const SOURCES = [
  { name: "Walk-in",     value: 34, color: "#10B981" },
  { name: "Referral",    value: 28, color: "#6366F1" },
  { name: "Social Media",value: 18, color: "#8B5CF6" },
  { name: "Website",     value: 12, color: "#F59E0B" },
  { name: "Google Ads",  value: 8,  color: "#F43F5E" },
];

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ backgroundColor: item.payload.color }} />
        <span className="text-gray-600">{item.name}</span>
        <span className="font-semibold text-gray-900 ml-1">{item.value}%</span>
      </div>
    </div>
  );
}

export function LeadSourceChart() {
  const total = SOURCES.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Lead Sources</h3>
          <p className="text-xs text-gray-400 mt-0.5">Where inquiries come from</p>
        </div>
        <button className="size-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {/* Donut chart */}
      <div className="flex items-center justify-center py-2">
        <div className="relative">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={SOURCES}
                dataKey="value"
                innerRadius={55}
                outerRadius={82}
                paddingAngle={3}
                startAngle={90}
                endAngle={-270}
              >
                {SOURCES.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xl font-bold text-gray-900">{total}%</p>
            <p className="text-[10px] text-gray-400">Total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-2">
        {SOURCES.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-600 flex-1">{s.name}</span>
            <span className="text-xs font-semibold text-gray-800">{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
