import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1B5E3A',
          color: '#FFFFFF',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, fontFamily: 'serif', letterSpacing: -1 }}>
          ARCHIVO BLANQUIVERDE
        </div>
        <div style={{ fontSize: 32, marginTop: 20, opacity: 0.85 }}>Toda la historia del Córdoba CF, en un solo lugar</div>
      </div>
    ),
    { ...size }
  );
}
