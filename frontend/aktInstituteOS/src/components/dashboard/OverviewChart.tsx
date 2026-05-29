"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MoreHorizontal } from "lucide-react";

const MONTHLY_DATA = [
  { month: "Jan", newLeads: 180, dealsClosed: 95 },
  { month: "Feb", newLeads: 150, dealsClosed: 80 },
  { month: "Mar", newLeads: 200, dealsClosed: 110 },
  { month: "Apr", newLeads: 340, dealsClosed: 65 },
  { month: "May", newLeads: 260, dealsClosed: 150 },
  { month: "Jun", newLeads: 220, dealsClosed: 130 },
  { month: "Jul", newLeads: 290, dealsClosed: 175 },
  { month: "Aug", newLeads: 240, dealsClosed: 140 },
  { month: "Sep", newLeads: 270, dealsClosed: 160 },
];

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 min-w-[160px]">
      <p className="text-xs font-semibold text-gray-700 mb-2">{label} 2025</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-xs py-0.5">
          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-gray-500 flex-1">{item.name}</span>
          <span className="font-semibold text-gray-800">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function OverviewChart() {
  const [period, setPeriod] = useState("Monthly");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-900">Overview</h3>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-indigo-500" />
              <span className="text-xs text-gray-500">New Leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-emerald-500" />
              <span className="text-xs text-gray-500">Deals Closed</span>
            </div>
          </div>
          <button className="size-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={MONTHLY_DATA} barGap={3} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9CA3AF", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9CA3AF", fontSize: 11 }}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)", radius: 4 }} />
          <Bar dataKey="newLeads" name="New Leads" fill="#6366F1" radius={[3, 3, 0, 0]} />
          <Bar dataKey="dealsClosed" name="Deals Closed" fill="#10B981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
