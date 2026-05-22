'use client';

import { useState, useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AssetSlice {
    label: string;
    value: number;         // Nominal (Rp)
    color: string;         // Main fill colour
    colorLight: string;    // Lighter accent for gradient / hover
}

interface PieSlice extends AssetSlice {
    percentage: number;
    startAngle: number;
    endAngle: number;
}

/* ------------------------------------------------------------------ */
/*  Default data                                                       */
/* ------------------------------------------------------------------ */

export const DEFAULT_ASSETS: AssetSlice[] = [
    {
        label: 'Cash',
        value: 50_000_000,
        color: '#06b6d4',      // cyan‑500
        colorLight: '#67e8f9', // cyan‑300
    },
    {
        label: 'Stocks',
        value: 120_000_000,
        color: '#8b5cf6',      // violet‑500
        colorLight: '#c4b5fd', // violet‑300
    },
    {
        label: 'Reksadana',
        value: 80_000_000,
        color: '#f59e0b',      // amber‑500
        colorLight: '#fcd34d', // amber‑300
    },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
        `M ${cx} ${cy}`,
        `L ${start.x} ${start.y}`,
        `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
        'Z',
    ].join(' ');
}

function formatRupiah(n: number) {
    return 'Rp ' + n.toLocaleString('id-ID');
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
    assets?: AssetSlice[];
}

export default function AssetPieChart({ assets = DEFAULT_ASSETS }: Props) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    /* ---------- derive slices ---------- */
    const { slices, total } = useMemo(() => {
        const total = assets.reduce((s, a) => s + a.value, 0);
        let cumulative = 0;
        const slices: PieSlice[] = assets.map((a) => {
            const pct = total === 0 ? 0 : (a.value / total) * 100;
            const startAngle = cumulative;
            const sweep = (pct / 100) * 360;
            cumulative += sweep;
            return {
                ...a,
                percentage: pct,
                startAngle,
                endAngle: startAngle + sweep,
            };
        });
        return { slices, total };
    }, [assets]);

    const CX = 120;
    const CY = 120;
    const R = 100;

    return (
        <div style={styles.wrapper}>
            {/* ---- Heading ---- */}
            <h2 style={styles.title}>Alokasi Aset</h2>
            <p style={styles.subtitle}>Total portofolio: <strong>{formatRupiah(total)}</strong></p>

            <div style={styles.chartRow}>
                {/* ---- SVG Pie ---- */}
                <svg
                    viewBox={`0 0 ${CX * 2} ${CY * 2}`}
                    style={styles.svg}
                    aria-label="Pie chart alokasi aset"
                >
                    <defs>
                        {slices.map((s, i) => (
                            <radialGradient key={`grad-${i}`} id={`slice-grad-${i}`}>
                                <stop offset="0%" stopColor={s.colorLight} />
                                <stop offset="100%" stopColor={s.color} />
                            </radialGradient>
                        ))}
                        <filter id="shadow">
                            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.25" />
                        </filter>
                    </defs>

                    {slices.map((s, i) => {
                        const isHovered = hoveredIndex === i;
                        const midAngle = (s.startAngle + s.endAngle) / 2;
                        const explode = isHovered ? 8 : 0;
                        const offset = polarToCartesian(0, 0, explode, midAngle);

                        return (
                            <path
                                key={i}
                                d={describeArc(CX, CY, R, s.startAngle, s.endAngle)}
                                fill={`url(#slice-grad-${i})`}
                                stroke="#1e1e2e"
                                strokeWidth={2}
                                filter="url(#shadow)"
                                style={{
                                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                                    transition: 'transform 0.3s cubic-bezier(.4,0,.2,1), opacity 0.3s',
                                    opacity: hoveredIndex !== null && !isHovered ? 0.55 : 1,
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        );
                    })}

                    {/* Centre donut hole */}
                    <circle cx={CX} cy={CY} r={46} fill="#1e1e2e" />
                    <text
                        x={CX}
                        y={CY - 6}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="Inter, system-ui, sans-serif"
                    >
                        Total
                    </text>
                    <text
                        x={CX}
                        y={CY + 12}
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="13"
                        fontWeight="700"
                        fontFamily="Inter, system-ui, sans-serif"
                    >
                        {formatRupiah(total)}
                    </text>
                </svg>

                {/* ---- Legend ---- */}
                <ul style={styles.legend}>
                    {slices.map((s, i) => {
                        const isHovered = hoveredIndex === i;
                        return (
                            <li
                                key={i}
                                style={{
                                    ...styles.legendItem,
                                    background: isHovered
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(255,255,255,0.03)',
                                    transform: isHovered ? 'translateX(4px)' : 'none',
                                }}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <span
                                    style={{
                                        ...styles.dot,
                                        background: `linear-gradient(135deg, ${s.colorLight}, ${s.color})`,
                                        boxShadow: isHovered
                                            ? `0 0 10px ${s.color}88`
                                            : 'none',
                                    }}
                                />
                                <div style={styles.legendText}>
                                    <span style={styles.legendLabel}>{s.label}</span>
                                    <span style={styles.legendValue}>
                                        {formatRupiah(s.value)}{' '}
                                        <span style={styles.legendPct}>
                                            ({s.percentage.toFixed(1)}%)
                                        </span>
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Inline styles – dark glass aesthetic                               */
/* ------------------------------------------------------------------ */

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        maxWidth: 580,
        margin: '0 auto',
        padding: '32px 28px',
        borderRadius: 20,
        background: 'linear-gradient(145deg, rgba(30,30,46,0.92), rgba(24,24,37,0.96))',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(16px)',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#e2e8f0',
    },
    title: {
        margin: 0,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        background: 'linear-gradient(90deg, #67e8f9, #c4b5fd)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    subtitle: {
        margin: '6px 0 24px',
        fontSize: 14,
        color: '#94a3b8',
    },
    chartRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        flexWrap: 'wrap' as const,
        justifyContent: 'center',
    },
    svg: {
        width: 220,
        height: 220,
        flexShrink: 0,
    },
    legend: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 10,
        flex: 1,
        minWidth: 200,
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 12,
        transition: 'all 0.25s ease',
        cursor: 'pointer',
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: '50%',
        flexShrink: 0,
        transition: 'box-shadow 0.25s ease',
    },
    legendText: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 2,
    },
    legendLabel: {
        fontSize: 14,
        fontWeight: 600,
        color: '#e2e8f0',
    },
    legendValue: {
        fontSize: 13,
        color: '#94a3b8',
    },
    legendPct: {
        fontSize: 12,
        color: '#64748b',
    },
};
