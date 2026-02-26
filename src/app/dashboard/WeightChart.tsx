"use client";

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

type LogItem = {
  dateKey: string;
  weightKg?: number | null;
};

export default function WeightChart({ items }: { items: LogItem[] }) {
  const data = items
    .filter((x) => typeof x.weightKg === "number")
    .map((x) => ({
      dateKey: x.dateKey,
      dateLabel: x.dateKey.slice(5), // MM-DD
      weight: x.weightKg as number,
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No weight data to chart yet.</p>;
  }

  const weights = data.map((d) => d.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const pad = Math.max(0.5, (max - min) * 0.2);

  const yMin = Math.floor((min - pad) * 10) / 10;
  const yMax = Math.ceil((max + pad) * 10) / 10;

  return (
    <div className="w-full" style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 16, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dateLabel" />
          <YAxis domain={[yMin, yMax]} />
          <Tooltip
            formatter={(value) => [`${value} kg`, "Weight"]}
            labelFormatter={(label, payload) => {
              const full = payload?.[0]?.payload?.dateKey;
              return full ? full : label;
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            dot={{ r: 4 }}
          >
            <LabelList
            dataKey="weight"
            position="top"
            formatter={(v) => (typeof v === "number" ? v.toFixed(1) : String(v ?? ""))}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}