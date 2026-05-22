'use client';

import AssetPieChart from '@/app/components/AssetPieChart';

export default function AlokasiAsetPage() {
    return (
        <main style={styles.page}>
            {/* Ambient glow blobs */}
            <div style={styles.blob1} aria-hidden />
            <div style={styles.blob2} aria-hidden />

            <AssetPieChart />

            <p style={styles.footnote}>
                Data bersifat ilustratif. Klik slice atau legend untuk highlight.
            </p>
        </main>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
        background: '#0f0f17',
        position: 'relative',
        overflow: 'hidden',
    },
    blob1: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
        top: -100,
        left: -100,
        pointerEvents: 'none',
    },
    blob2: {
        position: 'absolute',
        width: 350,
        height: 350,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        bottom: -80,
        right: -60,
        pointerEvents: 'none',
    },
    footnote: {
        fontSize: 12,
        color: '#64748b',
        fontFamily: "'Inter', system-ui, sans-serif",
        textAlign: 'center',
    },
};
