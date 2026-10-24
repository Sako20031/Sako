import { ImageResponse } from 'next/og';

export const alt = 'LUMIÈRE CEILINGS — stretch ceilings & architectural light';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Social preview. Latin text only: the default OG font has no Cyrillic glyphs.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#242321', color: '#F7F5F0', padding: '72px 80px', fontFamily: 'serif' }}>
        <div style={{ display: 'flex', width: 420, height: 3, background: '#B79A72' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 112, letterSpacing: 14 }}>LUMIÈRE</div>
          <div style={{ fontSize: 30, letterSpacing: 22, color: '#B79A72', marginTop: 8 }}>CEILINGS</div>
        </div>
        <div style={{ fontSize: 30, color: 'rgba(247,245,240,0.7)' }}>Stretch ceilings · Architectural light · Online configurator</div>
      </div>
    ),
    size,
  );
}
