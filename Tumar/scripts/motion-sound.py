"""Soundtrack for public/tumar-motion.html (12 s), synthesised from scratch.

Dombra (plucked strings, Karplus-Strong), a kobyz-like bowed drone, a frame
drum (dabyl) and soft bells, timed to the animation's events.

    python3 scripts/motion-sound.py out.wav
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 12.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
mix_l = np.zeros(N)
mix_r = np.zeros(N)


def add(sig, t, gain=1.0, pan=0.0):
    """Mix a mono signal in at time t (seconds), pan -1..1."""
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    mix_l[i : i + len(sig)] += sig * np.sqrt((1 - pan) / 2)
    mix_r[i : i + len(sig)] += sig * np.sqrt((1 + pan) / 2)


def note(name):
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    semis = names[name[0]] + (1 if '#' in name else 0) + (int(name[-1]) - 4) * 12
    return 440.0 * 2 ** (semis / 12)


def pluck(freq, dur=1.6, bright=0.6, decay=0.996):
    """Dombra string: Karplus-Strong, computed one period at a time."""
    period = int(SR / freq)
    total = int(dur * SR)
    buf = np.zeros(total + period + 1)
    burst = rng.uniform(-1, 1, period)
    # Softer attack: low-pass the noise burst
    for _ in range(int((1 - bright) * 4)):
        burst = 0.5 * (burst + np.roll(burst, 1))
    buf[:period] = burst
    for start in range(period, total + 1, period):
        prev = buf[start - period : start + 1]
        seg = decay * 0.5 * (prev[:-1] + prev[1:])
        end = min(start + period, len(buf))
        buf[start:end] = seg[: end - start]
    out = buf[:total]
    # Body resonance of the gourd-shaped dombra: a little low-mid boost
    out = out + 0.3 * np.convolve(out, np.ones(24) / 24, mode='same')
    env = np.minimum(1, np.linspace(0, dur, total) / 0.002)
    return out * env


def strum(freqs, t, gain=0.5, down=True, pan=0.0, dur=1.6):
    order = freqs if down else freqs[::-1]
    for k, f in enumerate(order):
        add(pluck(f, dur), t + k * 0.012, gain, pan + (k - 0.5) * 0.3)


def drone(freq, dur, gain):
    """Kobyz-like bowed drone: sawtooth with vibrato, darkened, with bow noise."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * tt) * np.minimum(1, tt / 1.5)
    phase = np.cumsum(freq * vib) / SR
    saw = sum(np.sin(2 * np.pi * h * phase) / h * (0.85 ** h) for h in range(1, 14))
    noise = rng.normal(0, 1, n)
    noise = np.convolve(noise, np.ones(40) / 40, mode='same') * 0.4
    sig = saw * (1 + 0.15 * noise)
    env = np.minimum(1, tt / 1.8) * np.minimum(1, (dur - tt) / 1.2)
    return sig * env * gain


def drum(t, gain=1.0, pitch=70):
    """Dabyl frame drum: falling sine plus a felt thud."""
    n = int(1.2 * SR)
    tt = np.arange(n) / SR
    f = pitch + 60 * np.exp(-tt * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 5)
    thud = rng.normal(0, 1, n) * np.exp(-tt * 60)
    thud = np.convolve(thud, np.ones(12) / 12, mode='same')
    add(body + 0.5 * thud, t, gain)


def rattle(t, gain=0.15, pan=0.0):
    """Asatayak jingles: short bursts of bright noise."""
    n = int(0.25 * SR)
    tt = np.arange(n) / SR
    s = rng.normal(0, 1, n)
    s = s - np.convolve(s, np.ones(6) / 6, mode='same')
    s *= np.exp(-tt * 22) * (1 + 0.6 * np.sin(2 * np.pi * 38 * tt))
    add(s, t, gain, pan)


def bell(freq, t, gain=0.2, pan=0.0, dur=2.5):
    """Soft bell for the light passing over the gold."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * freq * r * tt) * np.exp(-tt * d)
            for r, a, d in [(1, 1, 1.6), (2.76, .4, 3), (5.4, .2, 5), (8.9, .08, 8)])
    add(s * np.minimum(1, tt / 0.003), t, gain, pan)


def whoosh(t, dur=1.4, gain=0.25):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = rng.normal(0, 1, n)
    width = (6 + 40 * (1 - tt / dur)).astype(int)
    out = np.empty(n)
    c = np.cumsum(np.concatenate([[0], s]))
    for i in range(n):  # moving average whose width shrinks: the sound opens up
        w = width[i]
        out[i] = (c[i + 1] - c[max(0, i + 1 - w)]) / w
    env = np.sin(np.pi * tt / dur) ** 2
    add(out * env, t, gain)


D3, G3 = note('D3'), note('G3')

# 0.2 s: kobyz drone on D, a fifth above joins in
add(drone(note('D2'), 8.4, 0.10), 0.2, pan=-0.2)
add(drone(note('A2'), 7.6, 0.06), 1.0, pan=0.2)

# 1.2 s: beads appear, a light rattle
for k in range(6):
    rattle(1.2 + k * 0.13, 0.05, pan=-0.6 + k * 0.24)

# 1.6 s: 12 horns, one dombra note each, up the scale
scale = ['D4', 'E4', 'F4', 'G4', 'A4', 'C5', 'D5', 'C5', 'A4', 'G4', 'A4', 'D5']
for i, n_ in enumerate(scale):
    add(pluck(note(n_), 1.4, bright=0.8), 1.6 + i * 0.09, 0.35, pan=np.sin(i / 12 * 2 * np.pi) * 0.6)

# 2.4 s: the sun's core
bell(note('D6'), 2.4, 0.08)

# 2.9 s: TUMAR rises: drum and the start of the galloping kuy rhythm
drum(2.9, 0.9)
beat = 60 / 132
melody = ['G3', 'A3', 'G3', 'F3', 'G3', 'A3', 'C4', 'A3', 'G3', 'F3', 'E3']
t = 2.9
for b, m in enumerate(melody):
    top = note(m)
    # Gallop: long, short, short (down, up, down) on the open D and the melody string
    strum([D3, top], t, 0.42, True)
    strum([D3, top], t + beat * 0.5, 0.25, False)
    strum([D3, top], t + beat * 0.75, 0.3, True)
    rattle(t + beat * 0.5, 0.06, 0.5)
    if b % 4 == 0 and b:
        drum(t, 0.5, 80)
    t += beat
    if t > 7.9:
        break

# 3.1 s: the light passes over the gold
for k, n_ in enumerate(['A5', 'D6', 'E6']):
    bell(note(n_), 3.1 + k * 0.18, 0.06, pan=-0.5 + k * 0.5)

# 5.5 s: tagline: a slower, singing phrase above
for k, (n_, dt) in enumerate([('A4', 0), ('C5', .45), ('D5', .9), ('C5', 1.6), ('A4', 1.85), ('G4', 2.1)]):
    add(pluck(note(n_), 2.0, bright=0.4, decay=0.998), 5.5 + dt, 0.3, pan=0.2)

# 8.1 s: the light opens up
whoosh(8.0, 1.5, 0.35)

# 9.0 s: logo lands: drum, full chord, letters as small plucks
drum(9.0, 1.0, 60)
strum([D3, G3, note('D4')], 9.0, 0.5, True, dur=3.0)
add(drone(note('D2'), 3.0, 0.08), 9.0)
for i, n_ in enumerate(['D5', 'E5', 'G5', 'A5', 'D6']):
    add(pluck(note(n_), 1.2, bright=0.7), 9.0 + i * 0.07, 0.12, pan=-0.4 + i * 0.2)
for k, n_ in enumerate(['D6', 'A5']):
    bell(note(n_), 9.6 + k * 0.25, 0.07, pan=0.3 - k * 0.6)

# ---------- reverb (a yurt, not a cathedral) ----------
ir_n = int(1.6 * SR)
ir_t = np.arange(ir_n) / SR
ir = rng.normal(0, 1, (2, ir_n)) * np.exp(-ir_t * 3.5)
ir[:, 0] = 0
size = 1 << int(np.ceil(np.log2(N + ir_n)))
wet = [np.fft.irfft(np.fft.rfft(ch, size) * np.fft.rfft(ir[k], size), size)[:N]
       for k, ch in enumerate((mix_l, mix_r))]
out = np.stack([mix_l + 0.012 * wet[0], mix_r + 0.012 * wet[1]])

# Fade in / out and normalise to -1 dBFS
fade = np.ones(N)
fade[: int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
fade[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)) ** 2
out *= fade
out *= 10 ** (-1 / 20) / np.max(np.abs(out))

with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'tumar-motion-sound.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out.T * 32767).astype('<i2').tobytes())
