import { useState, useEffect, useMemo } from 'react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    Label,
    Sector,
} from 'recharts';

import {
    TrendingUp,
    TrendingDown,
    RefreshCw,
    AlertTriangle,
    Package,
    ShoppingCart,
} from 'lucide-react';
import { IoTrendingDownSharp } from 'react-icons/io5';
import { NavLink } from 'react-router-dom';

/* =========================================================
   SMALL UTILS
========================================================= */
const formatCurrency = (value, currencySymbol = '$') => {
    const formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value || 0).replace('$', currencySymbol);

    return formattedValue;
};

const formatPercent = (value) => `${(value ?? 0).toFixed(1)}%`;
const isEmptyArray = (arr) => !Array.isArray(arr) || arr.length === 0;

/* =========================================================
   PRIMITIVES
========================================================= */
const Card = ({ children, className = '' }) => (
    <div
        className={`bg-white dark:bg-gray-800 rounded-xl border border-ink-200 dark:border-gray-700 p-4 sm:p-6 transition-colors hover:border-ink-300 ${className}`}
    >
        {children}
    </div>
);

const EmptyState = ({ title = 'No data', subtitle = 'There is nothing to display yet.' }) => (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400">
                <path
                    fill="currentColor"
                    d="M3 5a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v3H3V5Zm0 6h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z"
                />
            </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
);

const SafeChartContainer = ({ data, children, emptyTitle, emptySubtitle }) => {
    if (isEmptyArray(data)) {
        return (
            <div className="h-56 sm:h-64">
                <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
            </div>
        );
    }
    return <div className="h-56 sm:h-64">{children}</div>;
};

const KpiCard = ({ icon: Icon, title, value, trend, change, formatter, lineColor, currencySymbol }) => {
    const isPositive = (change ?? 0) >= 0;
    const sparklineData = (trend || []).map((val, idx) => ({ idx, val }));
    const strokeColor = lineColor || (isPositive ? '#10b981' : '#ef4444');
    const hasChange = change !== null && change !== undefined && !Number.isNaN(change);

    return (
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-ink-200 dark:border-gray-700 p-3 sm:p-5 hover:border-ink-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-brand-600 dark:text-brand-400" />
                </div>
                {hasChange && (
                    <span
                        className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md ${
                            isPositive
                                ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20'
                                : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
                        }`}
                    >
                        {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                    </span>
                )}
            </div>
            <div className="text-start">
                <p className="text-xs text-ink-500 dark:text-gray-400 font-medium mb-1">{title}</p>
                <p className="text-lg sm:text-2xl font-semibold text-ink-900 dark:text-white tracking-tight truncate">
                    <span dangerouslySetInnerHTML={{ __html: typeof formatter === 'function' ? formatter(value || 0, currencySymbol) : value || 0 }} />
                </p>
            </div>
            {!isEmptyArray(sparklineData) && (
                <div className="mt-3 h-8">
                    <ResponsiveContainer width="100%" height={32}>
                        <LineChart data={sparklineData}>
                            <Line
                                type="monotone"
                                dataKey="val"
                                stroke={strokeColor}
                                strokeWidth={1.5}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

const ChartCard = ({ title, children, loading = false, right = null }) => (
    <Card>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {right}
        </div>
        {loading ? (
            <div className="h-56 sm:h-64 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        ) : (
            children
        )}
    </Card>
);

const Badge = ({ status }) => {
    const styles = {
        completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '-';
    return (
        <span className={`px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-full ${styles[status] || ''}`}>
            {label}
        </span>
    );
};

const Table = ({ columns, data }) => {
    if (isEmptyArray(data)) {
        return (
            <div className="h-48">
                <EmptyState title="No rows" subtitle="Table is empty." />
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`text-left py-2.5 sm:py-3 px-3 sm:px-4 text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider ${col.align === 'right' ? 'text-right' : ''}`}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => (
                        <tr
                            key={idx}
                            className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            {columns.map((col) => (
                                <td key={col.key} className={`py-2.5 sm:py-3 px-3 sm:px-4 text-gray-700 dark:text-gray-300 ${col.align === 'right' ? 'text-right' : ''}`}>
                                    {typeof col.render === 'function' ? col.render(row[col.key], row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/* =========================================================
   PIE ACTIVE SHAPES + HOOK
========================================================= */
const useDeviceType = () => {
    const [device, setDevice] = useState('desktop');
    useEffect(() => {
        const updateDevice = () => {
            const width = window.innerWidth;
            if (width < 640) setDevice('mobile');
            else if (width < 1024) setDevice('tablet');
            else setDevice('desktop');
        };
        updateDevice();
        window.addEventListener('resize', updateDevice);
        return () => window.removeEventListener('resize', updateDevice);
    }, []);
    return device;
};

const makeActiveShapeDesktop = (formatValue) => (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    return (
        <g>
            <Sector {...{ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }} />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={(outerRadius || 0) + 6}
                outerRadius={(outerRadius || 0) + 10}
                fill={fill}
            />
            <text x={cx} y={cy} textAnchor="middle" fill="#0f172a" style={{ fontSize: 12, fontWeight: 600 }}>
                <tspan x={cx} dy="-10">{payload?.name}</tspan>
                <tspan x={cx} dy="16">{formatValue(value)}</tspan>
                <tspan x={cx} dy="16" fill="#64748b" style={{ fontSize: 10 }}>{`${(((percent || 0) * 100)).toFixed(1)}%`}</tspan>
            </text>
        </g>
    );
};

const makeActiveShapeMobile = (formatValue) => (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    return (
        <g>
            <Sector {...{ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }} />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={(outerRadius || 0) + 4}
                outerRadius={(outerRadius || 0) + 8}
                fill={fill}
            />
            <text x={cx} y={cy} textAnchor="middle" fill="#0f172a" style={{ fontSize: 10 }}>
                <tspan x={cx} dy="-6" style={{ fontWeight: 600 }} fill={fill}>
                    {payload?.name}
                </tspan>
                <tspan x={cx} dy="18" style={{ fontWeight: 600 }}>
                    {formatValue(value)}
                </tspan>
                <tspan x={cx} dy="16" fill="#94a3b8">
                    {`${(((percent || 0) * 100)).toFixed(1)}%`}
                </tspan>
            </text>
        </g>
    );
};

const makeActiveShapeTablet = (formatValue) => (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    return (
        <g>
            <Sector {...{ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }} />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={(outerRadius || 0) + 5}
                outerRadius={(outerRadius || 0) + 9}
                fill={fill}
            />
            <text x={cx} y={cy} textAnchor="middle" fill="#0f172a" style={{ fontSize: 11, fontWeight: 600 }}>
                <tspan x={cx} dy="-10">{payload?.name}</tspan>
                <tspan x={cx} dy="16">{formatValue(value)}</tspan>
                <tspan x={cx} dy="16" fill="#64748b" style={{ fontSize: 10 }}>{`${(((percent || 0) * 100)).toFixed(1)}%`}</tspan>
            </text>
        </g>
    );
};

/* =========================================================
   DONUT (CURRENCY) + CHARTS
========================================================= */
function DonutHoverCurrency({ title, breakdown, currencySymbol }) {
    const device = useDeviceType();
    const [activeIndex, setActiveIndex] = useState(-1);

    const data = useMemo(
        () =>
            (Array.isArray(breakdown) ? breakdown : []).map((b) => ({
                name: b.label,
                value: b.value,
                color: b.color,
            })),
        [breakdown]
    );

    // Eikhane currencySymbol update kora hoyeche
    const ActiveDesktop = useMemo(() => makeActiveShapeDesktop((val) => formatCurrency(val, currencySymbol)), [currencySymbol]);
    const ActiveMobile = useMemo(() => makeActiveShapeMobile((val) => formatCurrency(val, currencySymbol)), [currencySymbol]);
    const ActiveTablet = useMemo(() => makeActiveShapeTablet((val) => formatCurrency(val, currencySymbol)), [currencySymbol]);

    const total = data.reduce((s, d) => s + (d.value || 0), 0);
    const COLORS = data.map((d) => d.color);

    const handleEnter = (_, i) => device !== 'mobile' && setActiveIndex(i);
    const handleLeave = () => device !== 'mobile' && setActiveIndex(-1);
    const handleClick = (_, i) => device === 'mobile' && setActiveIndex(i);

    const chartHeight = device === 'mobile' ? 240 : device === 'tablet' ? 260 : 280;
    const innerRadius = device === 'mobile' ? 35 : device === 'tablet' ? 50 : 65;
    const outerRadius = device === 'mobile' ? 60 : device === 'tablet' ? 75 : 95;

    return (
        <ChartCard title={title}>
            {isEmptyArray(data) || total === 0 ? (
                <EmptyState title="No breakdown" subtitle="No values to chart." />
            ) : (
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <PieChart onMouseLeave={handleLeave}>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={innerRadius}
                            outerRadius={outerRadius}
                            dataKey="value"
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={activeIndex >= 0 ? 3 : 2}
                            activeIndex={activeIndex}
                            activeShape={device === 'mobile' ? ActiveMobile : device === 'tablet' ? ActiveTablet : ActiveDesktop}
                            onMouseEnter={handleEnter}
                            onClick={handleClick}
                            isAnimationActive
                            animationDuration={600}
                        >
                            {data.map((entry, i) => (
                                <Cell
                                    key={i}
                                    fill={COLORS[i % COLORS.length]}
                                    opacity={activeIndex < 0 || activeIndex === i ? 1 : 0.5}
                                />
                            ))}
                            {activeIndex < 0 && <Label value="" position="center" />}
                        </Pie>

                        <Legend
                            wrapperStyle={{ fontSize: device === 'mobile' ? 11 : device === 'tablet' ? 12 : 13 }}
                            content={({ payload = [] }) => (
                                <div
                                    className={`flex ${device === 'mobile'
                                        ? 'flex-col items-center gap-3'
                                        : 'flex-row flex-wrap justify-center gap-4'
                                        } mt-4 px-4`}
                                >
                                    {payload.map((entry, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 cursor-pointer transition-transform hover:scale-105"
                                            onMouseEnter={() => device !== 'mobile' && setActiveIndex(index)}
                                            onMouseLeave={() => device !== 'mobile' && setActiveIndex(-1)}
                                            onClick={() => device === 'mobile' && setActiveIndex(index)}
                                        >
                                            <span
                                                className="w-4 h-4 rounded-full shadow-sm inline-block"
                                                style={{ backgroundColor: entry.color }}
                                            />
                                            <span className={`text-sm font-medium text-gray-700 dark:text-gray-200 ${device === 'mobile' ? 'text-xs' : ''}`}>
                                                {entry.value}
                                            </span>
                                            <span className={`text-xs text-gray-500 dark:text-gray-400 font-semibold ${device === 'mobile' ? 'text-[11px]' : ''}`}>
                                                ({formatCurrency(entry?.payload?.value ?? 0, currencySymbol)})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    );
}


const SalesDonut = ({ breakdown, currencySymbol }) => (
    <DonutHoverCurrency title="Sales (Paid / Due / Return)" breakdown={breakdown} currencySymbol={currencySymbol} />
);

const PurchasesDonut = ({ breakdown, currencySymbol }) => (
    <DonutHoverCurrency title="Purchases (Paid / Due / Return)" breakdown={breakdown} currencySymbol={currencySymbol} />
);

const SalesVsPurchasesLine = ({ data, currencySymbol }) => (
    <ChartCard
        title="Sales vs Purchases (Monthly)"
        right={<span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Trend</span>}
    >
        <SafeChartContainer data={data} emptyTitle="No monthly data" emptySubtitle="Connect your data source.">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                        formatter={(value, name) => [
                            formatCurrency(value, currencySymbol),
                            name,
                        ]}
                        contentStyle={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            padding: '12px',
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" strokeWidth={2.3} dot={false} />
                    <Line type="monotone" dataKey="purchases" name="Purchases" stroke="#8b5cf6" strokeWidth={2.3} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </SafeChartContainer>
    </ChartCard>
);

// Eikhane currencySymbol add kora hoyeche prop-e
const AccountWiseTransactions = ({ data = [], currencySymbol }) => {
    const device = useDeviceType();
    const rows = [...data].sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 6);
    const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#22c55e', '#eab308'];

    const margin = device === 'mobile' ? { top: 8, right: 8, left: 4, bottom: 32 } : device === 'tablet' ? { top: 8, right: 8, left: 4, bottom: 28 } : { top: 8, right: 8, left: 4, bottom: 24 };
    const fontSize = device === 'mobile' ? 10 : device === 'tablet' ? 11 : 12;

    return (
        <ChartCard
            title="Transactions by Account"
            right={<span className={`text-xs text-gray-500 dark:text-gray-400 ${device === 'mobile' ? 'hidden' : 'hidden sm:inline'}`}>Amount</span>}
        >
            <SafeChartContainer data={rows} emptyTitle="No transactions" emptySubtitle="Import your accounts.">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rows} margin={margin} barCategoryGap={device === 'mobile' ? 12 : 16}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
                        <XAxis dataKey="account" stroke="#6b7280" style={{ fontSize }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                        <YAxis
                            stroke="#6b7280"
                            style={{ fontSize }}
                            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                            axisLine={{ stroke: '#cbd5e1' }}
                        />
                        <Tooltip
                            formatter={(v) => [formatCurrency(v, currencySymbol), 'Amount']} // Tooltip-e currencySymbol add kora holo
                            contentStyle={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                padding: '12px',
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize }} />
                        <Bar dataKey="amount" name="Amount" radius={[6, 6, 0, 0]}>
                            {rows.map((_, i) => (
                                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </SafeChartContainer>
        </ChartCard>
    );
};
const defaultStart = dayjs().subtract(1, "year").add(1, "day");
const defaultEnd = dayjs();

export default function ChartDashboard({
    kpis,
    sales,
    purchases,
    monthly,
    accounts,
    topCustomers,
    topProduct,

    startDate,
    endDate,
    onDateChange,

    loading = false,
    error = '',
    currencySymbol = '$',
}) {
    const pickerValue = useMemo(() => {
        if (startDate && endDate) {
            return [dayjs(startDate, "YYYY-MM-DD"), dayjs(endDate, "YYYY-MM-DD")];
        }
        return null;
    }, [startDate, endDate]);

    const handleRangeChange = (dates) => {
        if (!dates || dates.length !== 2) {
            onDateChange?.(null, null);
            return;
        }
        const [s, e] = dates;
        onDateChange?.(s.format("YYYY-MM-DD"), e.format("YYYY-MM-DD"));
    };

    const safeKpis = kpis || {};
    const safeSales = sales || { breakdown: [] };
    const safePurchases = purchases || { breakdown: [] };
    const safeMonthly = Array.isArray(monthly) ? monthly : [];
    const safeAccounts = Array.isArray(accounts) ? accounts : [];
    const safeTopCustomers = Array.isArray(topCustomers) ? topCustomers : [];
    const safetopProduct = Array.isArray(topProduct) ? topProduct : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <main className="mx-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            Real-time overview of sales, finance, and operations
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <RangePicker
                            className="rounded-lg shadow-sm"
                            value={pickerValue}
                            onChange={handleRangeChange}
                            allowClear={true}
                        />
                    </div>
                </div>

                {error ? (
                    <div className="mb-4 text-sm px-4 py-2 rounded-md bg-red-50 text-red-700 border border-red-200">
                        {String(error)}
                    </div>
                ) : null}

                {loading ? (
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-28 sm:h-32 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : null}

                {!loading && (
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                        <KpiCard
                            icon={ShoppingCart}
                            title="Total Sale Amount"
                            value={safeKpis?.totalSaleAmount?.value}
                            trend={safeKpis?.totalSaleAmount?.trend}
                            change={safeKpis?.totalSaleAmount?.change}
                            formatter={formatCurrency}
                            lineColor="#10b981"
                            currencySymbol={currencySymbol}
                        />
                        <KpiCard
                            icon={AlertTriangle}
                            title="Total Sale Due"
                            value={safeKpis?.totalSaleDue?.value}
                            trend={safeKpis?.totalSaleDue?.trend}
                            change={safeKpis?.totalSaleDue?.change}
                            formatter={formatCurrency}
                            lineColor="#ef4444"
                            currencySymbol={currencySymbol}
                        />
                        <KpiCard
                            icon={Package}
                            title="Total Purchase Amount"
                            value={safeKpis?.totalPurchaseAmount?.value}
                            trend={safeKpis?.totalPurchaseAmount?.trend}
                            change={safeKpis?.totalPurchaseAmount?.change}
                            formatter={formatCurrency}
                            lineColor="#10b981"
                            currencySymbol={currencySymbol}
                        />
                        <KpiCard
                            icon={TrendingDown}
                            title="Total Purchase Due"
                            value={safeKpis?.totalPurchaseDue?.value}
                            trend={safeKpis?.totalPurchaseDue?.trend}
                            change={safeKpis?.totalPurchaseDue?.change}
                            formatter={formatCurrency}
                            lineColor="#ef4444"
                            currencySymbol={currencySymbol}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <SalesDonut breakdown={safeSales.breakdown} currencySymbol={currencySymbol} />
                    <SalesVsPurchasesLine data={safeMonthly} currencySymbol={currencySymbol} />
                    {/* Eikhane currencySymbol prop pass kora hoyeche */}
                    <AccountWiseTransactions data={safeAccounts} currencySymbol={currencySymbol} />
                    <PurchasesDonut breakdown={safePurchases.breakdown} currencySymbol={currencySymbol} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <Card>
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Top Customers</h3>
                            <div className="text-xs text-gray-500 ml-3">
                                Top 5 Customers
                            </div>
                        </div>
                        <Table
                            columns={[
                                { key: 'customer', label: 'Customer Name' },
                                {
                                    key: 'total_sales', label: 'Total Sales', render: (value) => (
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(value, currencySymbol)}
                                        </span>
                                    )
                                },
                                {
                                    key: 'phone',
                                    label: 'Phone',
                                    render: (value) => (
                                        <span className="font-semibold text-gray-900 dark:text-white">{value || 0}</span>
                                    ),
                                },
                            ]}
                            data={safeTopCustomers}
                        />
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Top Products</h3>
                            <div className="text-xs text-gray-500 ml-3">
                                Top 5 Products
                            </div>
                        </div>
                        <Table
                            columns={[
                                { key: 'product', label: 'Product Name' },
                                { key: 'quantity', label: 'Quantity' },
                                {
                                    key: 'amount',
                                    label: 'Amount',
                                    align: 'right',
                                    render: (value) => (
                                        <span className="font-semibold text-gray-900 dark:text-white" >
                                            {formatCurrency(value || 0, currencySymbol)}
                                        </span>
                                    ),
                                },
                            ]}
                            data={safetopProduct}
                        />
                    </Card>
                </div>
            </main >
        </div >
    );
}