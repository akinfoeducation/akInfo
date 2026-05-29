"use client";

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

const DATA = [
  { month: "Jan", inquiries: 120, enrollments: 48 },
  { month: "Feb", inquiries: 98,  enrollments: 41 },
  { month: "Mar", inquiries: 145, enrollments: 62 },
  { month: "Apr", inquiries: 184, enrollments: 78 },
  { month: "May", inquiries: 167, enrollments: 71 },
  { month: "Jun", inquiries: 210, enrollments: 94 },
  { month: "Jul", inquiries: 195, enrollments: 88 },
  { month: "Aug", inquiries: 230, enrollments: 105 },
  { month: "Sep", inquiries: 178, enrollments: 82 },
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

export function EnrollmentChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Enrollment vs Inquiries</h3>
          <p className="text-xs text-gray-400 mt-0.5">Monthly trend — 2025</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-indigo-500" />
              <span className="text-xs text-gray-500">Inquiries</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-emerald-500" />
              <span className="text-xs text-gray-500">Enrollments</span>
            </div>
          </div>
          <button className="size-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={DATA} barGap={3} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} width={28} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)", radius: 4 }} />
          <Bar dataKey="inquiries"   name="Inquiries"   fill="#6366F1" radius={[3, 3, 0, 0]} />
          <Bar dataKey="enrollments" name="Enrollments" fill="#10B981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
