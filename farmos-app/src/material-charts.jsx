/* eslint-disable */
import React from "react";
import ReactApexChart from "react-apexcharts";

const labelStyle = {
  colors: "var(--fg-3)",
  fontSize: "11px",
  fontFamily: "var(--font-sans)",
  fontWeight: 600,
};

const tooltipBox = [
  "background: var(--paper);",
  "border: 1px solid var(--border-1);",
  "border-radius: 8px;",
  "box-shadow: 0 14px 34px rgba(14,36,24,0.16);",
  "padding: 9px 11px;",
  "font-family: var(--font-sans);",
  "color: var(--ink-950);",
].join("");

function fmtNumber(value, locale = "fr-CA", maximumFractionDigits = 0) {
  const n = Number(value || 0);
  return n.toLocaleString(locale, { maximumFractionDigits });
}

function signed(value, locale = "fr-CA") {
  const n = Number(value || 0);
  return `${n > 0 ? "+" : ""}${fmtNumber(n, locale)}`;
}

function safeSeries(series) {
  return (series || []).map((s) => ({
    ...s,
    data: (s.data || []).map((v) => Number(v || 0)),
  }));
}

function materialBaseOptions({ colors, labels, formatter, gridX = true }) {
  return {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "var(--font-sans)",
      animations: { enabled: true, speed: 360 },
    },
    colors,
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: {
      show: true,
      borderColor: "var(--border-1)",
      strokeDashArray: 5,
      xaxis: { lines: { show: gridX } },
      padding: { top: 6, right: 18, bottom: 0, left: 10 },
    },
    xaxis: {
      categories: labels,
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: { style: labelStyle, hideOverlappingLabels: true, trim: true },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        style: labelStyle,
        formatter: formatter || ((v) => fmtNumber(v)),
      },
    },
    tooltip: {
      theme: "light",
      marker: { show: true },
      y: { formatter: formatter || ((v) => fmtNumber(v)) },
    },
  };
}

export function MaterialLineChart({
  series,
  labels,
  colors,
  height = 220,
  type = "line",
  formatter,
  min,
  max,
  strokeWidth = 2.5,
}) {
  const chartSeries = React.useMemo(() => safeSeries(series), [series]);
  const chartColors = colors || chartSeries.map((s) => s.color || "var(--forest-700)");
  const options = React.useMemo(() => ({
    ...materialBaseOptions({ colors: chartColors, labels, formatter }),
    stroke: {
      lineCap: "round",
      curve: "smooth",
      width: chartSeries.map(() => strokeWidth),
    },
    markers: {
      size: chartSeries.length > 1 ? 2.5 : 3.5,
      strokeWidth: 2,
      strokeColors: "var(--paper)",
      hover: { size: 5 },
    },
    fill: type === "area"
      ? {
          type: "gradient",
          gradient: { shadeIntensity: 0.3, opacityFrom: 0.2, opacityTo: 0.03, stops: [0, 90, 100] },
        }
      : { opacity: 0.9 },
    yaxis: {
      ...materialBaseOptions({ colors: chartColors, labels, formatter }).yaxis,
      min,
      max,
    },
  }), [chartColors, chartSeries, formatter, labels, max, min, strokeWidth, type]);

  return (
    <ReactApexChart
      options={options}
      series={chartSeries}
      type={type}
      height={height}
      width="100%"
    />
  );
}

export function MaterialForecastHeadChart({ points, current, L = (fr, en) => fr, height = 196 }) {
  const rows = React.useMemo(() => {
    const base = { month: "now", head: current, headLow: current, headHigh: current };
    return [base, ...(points || [])].map((p) => ({
      ...p,
      label: p.month === "now" ? L("aujourd'hui", "today") : p.label,
    }));
  }, [L, current, points]);

  const labels = rows.map((p) => p.label || p.month);
  const chartSeries = React.useMemo(() => ([
    {
      name: L("Fourchette", "Range"),
      type: "rangeArea",
      data: rows.map((p) => ({ x: p.label || p.month, y: [Number(p.headLow ?? p.head ?? 0), Number(p.headHigh ?? p.head ?? 0)] })),
    },
    {
      name: L("Prévu", "Projected"),
      type: "line",
      data: rows.map((p) => ({ x: p.label || p.month, y: Number(p.head ?? 0) })),
    },
    {
      name: L("Départ réel", "Actual start"),
      type: "line",
      data: rows.map((p) => ({ x: p.label || p.month, y: Number(current || 0) })),
    },
  ]), [L, current, rows]);

  const allValues = rows.flatMap((p) => [Number(p.head ?? 0), Number(p.headLow ?? p.head ?? 0), Number(p.headHigh ?? p.head ?? 0), Number(current || 0)]);
  let min = Math.min(...allValues);
  let max = Math.max(...allValues);
  if (min === max) {
    min = Math.max(0, min - 1);
    max += 1;
  }
  const pad = Math.max(1, (max - min) * 0.14);

  const options = React.useMemo(() => ({
    ...materialBaseOptions({
      colors: ["var(--forest-700)", "var(--forest-700)", "var(--ink-400)"],
      labels,
      formatter: (v) => fmtNumber(v, "fr-CA"),
    }),
    chart: {
      ...materialBaseOptions({ colors: [], labels }).chart,
      type: "rangeArea",
    },
    stroke: { curve: "smooth", lineCap: "round", width: [0, 3, 1.6], dashArray: [0, 0, 6] },
    fill: { opacity: [0.16, 1, 0] },
    markers: {
      size: 4,
      strokeWidth: 2.5,
      strokeColors: "var(--paper)",
      discrete: rows.map((_, i) => ({ seriesIndex: 2, dataPointIndex: i, size: 0 })),
      hover: { size: 6 },
    },
    yaxis: {
      labels: { style: labelStyle, formatter: (v) => fmtNumber(v, "fr-CA") },
      min: Math.max(0, min - pad),
      max: max + pad,
    },
    annotations: {
      yaxis: [{
        y: Number(current || 0),
        borderColor: "var(--ink-400)",
        strokeDashArray: 6,
        label: {
          text: L("départ réel", "actual start"),
          style: { color: "var(--fg-3)", background: "transparent", fontSize: "10px", fontWeight: 700 },
        },
      }],
    },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const p = rows[dataPointIndex] || rows[rows.length - 1];
        const label = p.label || p.month;
        const head = fmtNumber(p.head, "fr-CA");
        const low = fmtNumber(p.headLow ?? p.head, "fr-CA");
        const high = fmtNumber(p.headHigh ?? p.head, "fr-CA");
        return `<div style="${tooltipBox}">
          <div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--fg-3);text-transform:uppercase;">${label}</div>
          <div style="display:flex;align-items:baseline;gap:6px;margin-top:4px;">
            <strong style="font-size:18px;line-height:1;">${head}</strong>
            <span style="font-size:11px;font-weight:700;color:var(--fg-3);">${L("têtes", "head")}</span>
          </div>
          <div style="font-size:11px;color:var(--fg-3);margin-top:2px;">${low}-${high}</div>
        </div>`;
      },
    },
  }), [L, current, labels, max, min, pad, rows]);

  return <ReactApexChart options={options} series={chartSeries} type="rangeArea" height={height} width="100%" />;
}

export function MaterialDriverBarChart({ points, L = (fr, en) => fr, height = 92 }) {
  const rows = React.useMemo(() => (points || []).map((p) => ({
    label: p.label || p.month,
    births: Math.max(0, Number(p.births || 0)),
    deaths: Math.max(0, Number(p.deaths || 0)),
    exits: Math.max(0, Number(p.exits || 0)),
  })), [points]);
  const maxAbs = Math.max(1, ...rows.map((p) => Math.max(p.births, p.deaths + p.exits)));
  const labels = rows.map((p) => p.label);
  const chartSeries = [
    { name: L("Naissances", "Births"), data: rows.map((p) => p.births) },
    { name: L("Mortalité", "Mortality"), data: rows.map((p) => -p.deaths) },
    { name: L("Sorties/ventes", "Exits/sales"), data: rows.map((p) => -p.exits) },
  ];
  const options = React.useMemo(() => ({
    ...materialBaseOptions({
      colors: ["var(--forest-700)", "var(--rust-500)", "var(--clay-600)"],
      labels,
      formatter: (v) => signed(v, "fr-CA"),
      gridX: false,
    }),
    chart: {
      ...materialBaseOptions({ colors: [], labels }).chart,
      type: "bar",
      stacked: true,
    },
    plotOptions: {
      bar: {
        columnWidth: "42%",
        borderRadius: 3,
        borderRadiusApplication: "end",
      },
    },
    stroke: { width: 0 },
    states: { hover: { filter: { type: "lighten", value: 0.04 } } },
    yaxis: {
      min: -maxAbs,
      max: maxAbs,
      tickAmount: 2,
      labels: { style: labelStyle, formatter: (v) => signed(v, "fr-CA") },
    },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const p = rows[dataPointIndex] || rows[rows.length - 1];
        return `<div style="${tooltipBox}">
          <div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--fg-3);text-transform:uppercase;">${p.label}</div>
          <div style="font-size:12px;margin-top:5px;color:var(--forest-700);">+${fmtNumber(p.births, "fr-CA")} ${L("naissances", "births")}</div>
          <div style="font-size:12px;color:var(--rust-700);">-${fmtNumber(p.deaths, "fr-CA")} ${L("mortalité", "mortality")}</div>
          <div style="font-size:12px;color:var(--clay-700);">-${fmtNumber(p.exits, "fr-CA")} ${L("sorties", "exits")}</div>
        </div>`;
      },
    },
  }), [L, labels, maxAbs, rows]);

  return <ReactApexChart options={options} series={chartSeries} type="bar" height={height} width="100%" />;
}
