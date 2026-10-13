"""Soundtrack for public/tumar-motion.html (12 s): a solo dombra, synthesised.

Each of the two strings (tuned D3 and G3, as on a Kazakh dombra) is a
waveguide that rings for the whole piece; strokes (down and up, the
qagys technique) excite it, frets change its length. The sound then goes
through the resonances of the wooden body and a small room.

    python3 scripts/motion-sound.py out.wav
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 12.0
N = int(SR * DUR)
rng = np.random.default_rng(11)

NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def hz(name):
    n = NAMES[name[0]] + (1 if '#' in name else 0) - (1 if 'b' in name[1:-1] else 0)
    return 440.0 * 2 ** ((n + (int(name[-1]) + 1) * 12 - 69) / 12)


# ---------- the score: (time, string, note, strength, stroke) ----------
# string 0 = lower D string, 1 = upper G string; stroke 'd' = down, 'u' = up
events = []


def stroke(t, low, high, amp, kind='d'):
    """Strike both strings; a down stroke reaches the D string first."""
    gap = 0.009 if kind == 'd' else 0.007
    first, second = ((0, low), (1, high)) if kind == 'd' else ((1, high), (0, low))
    events.append((t, first[0], first[1], amp, kind))
    events.append((t + gap, second[0], second[1], amp * (0.9 if kind == 'd' else 0.8), kind))


def pick(t, string, note, amp):
    events.append((t, string, note, amp, 'p'))


# 0.2 s - the medallion appears: two slow open strokes, left to ring
stroke(0.20, 'D3', 'G3', 0.8)
stroke(0.95, 'D3', 'A3', 0.65)

# 1.6 s - twelve horns: a quick run on the upper string over the open D
run = ['A3', 'Bb3', 'C4', 'D4', 'C4', 'Bb3', 'A3', 'G3', 'A3', 'C4', 'D4', 'A3']
pick(1.58, 0, 'D3', 0.45)
for i, n in enumerate(run):
    pick(1.6 + i * 0.09, 1, n, 0.42 + 0.15 * (i % 2 == 0))

# 2.9 s - TUMAR: the galloping kuy rhythm (long, short, short)
beat = 60 / 132
bars = [('D3', 'A3'), ('D3', 'A3'), ('D3', 'Bb3'), ('D3', 'A3'),
        ('F3', 'C4'), ('F3', 'A3'), ('D3', 'A3'), ('E3', 'C4'),
        ('D3', 'Bb3'), ('D3', 'A3'), ('D3', 'G3')]
t = 2.9
for b, (low, high) in enumerate(bars):
    accent = 1.0 if b % 4 == 0 else 0.85
    stroke(t, low, high, 0.95 * accent, 'd')
    stroke(t + beat * 0.5, low, high, 0.5, 'u')
    stroke(t + beat * 0.75, low, high, 0.7, 'd')
    t += beat

# 5.5 s - the tagline: the melody climbs on the upper string
for dt, n in [(0.0, 'D4'), (0.23, 'C4'), (0.45, 'D4')]:
    pick(5.5 + dt, 1, n, 0.75)

# 7.9 s - the light opens: tremolo that speeds up and grows
tt, gap, k = 7.9, 0.11, 0
while tt < 8.95:
    stroke(tt, 'D3', 'A3', 0.35 + 0.5 * (tt - 7.9), 'du'[k % 2])
    tt += gap
    gap = max(0.05, gap * 0.9)
    k += 1

# 9.0 s - the logo lands: a strong open chord, then the letters
stroke(9.0, 'D3', 'G3', 1.0, 'd')
for i, n in enumerate(['A3', 'C4', 'D4', 'G4', 'A4']):
    pick(9.0 + 0.32 + i * 0.07, 1, n, 0.28)

events.sort()

# Natural harmonics (flageolets) at the end: pure, bell-like tones
harmonics = [(9.8, hz('D4'), 0.20), (10.25, hz('G4'), 0.18), (10.7, hz('D5'), 0.12)]


# ---------- strings ----------
def excitation(amp, kind, period):
    """The fingernail / finger hitting the string."""
    n = max(8, int(period))
    burst = rng.uniform(-1, 1, n)
    smooth = {'d': 2, 'u': 1, 'p': 3}[kind]   # up strokes are brighter (nail)
    for _ in range(smooth):
        burst = 0.5 * (burst + np.roll(burst, 1))
    # Plucking point about 1/8 of the string from the bridge: comb filter
    k = max(1, n // 8)
    burst = burst - np.concatenate([np.zeros(k), burst[:-k]])
    burst *= np.hanning(n) ** 0.3
    return burst * amp


def string_track(index, open_note):
    out = np.zeros(N)
    buf = np.zeros(4096)
    w = 0
    f = hz(open_note)
    delay = SR / f - 0.5
    gain = 0.0
    bright = 0.5
    damp_until = -1
    pending = [(int(t * SR), note, amp, kind) for (t, s, note, amp, kind) in events if s == index]
    pending.append((N + 1, None, 0, None))
    p = 0
    inject = None
    inj_pos = 0
    for n in range(N):
        if n >= pending[p][0]:
            _, note, amp, kind = pending[p]
            p += 1
            f_new = hz(note)
            if abs(f_new - f) > 0.5:
                damp_until = n + 40          # the finger moves: the old note stops
            f = f_new
            delay = SR / f - 0.5
            t60 = 1.9 * (146.8 / f) ** 0.35  # gut strings: higher notes die sooner
            gain = 10 ** (-3 / (t60 * f))
            bright = 0.42 if kind == 'u' else 0.35
            inject = excitation(amp, kind, SR / f)
            inj_pos = 0
        di = int(delay)
        frac = delay - di
        r0 = buf[(w - di) & 4095]
        r1 = buf[(w - di - 1) & 4095]
        r2 = buf[(w - di - 2) & 4095]
        s0 = r0 + frac * (r1 - r0)
        s1 = r1 + frac * (r2 - r1)
        y = gain * ((1 - bright) * s0 + bright * s1)
        if n < damp_until:
            y *= 0.9
        if inject is not None:
            y += inject[inj_pos]
            inj_pos += 1
            if inj_pos >= len(inject):
                inject = None
        buf[w & 4095] = y
        out[n] = y
        w += 1
    return out


strings = string_track(0, 'D3') + string_track(1, 'G3')

# The nail also taps the soundboard: a short bright click on every stroke
for (t0, _s, _n, amp, kind) in events:
    n = int(0.006 * SR)
    click = rng.normal(0, 1, n)
    click = click - np.concatenate([[0], click[:-1]])
    click *= np.exp(-np.arange(n) / (0.0012 * SR)) * amp * (0.05 if kind == 'p' else 0.09)
    i = int(t0 * SR)
    strings[i:i + n] += click[: N - i]

for t0, f0, a in harmonics:
    n = int(2.0 * SR)
    tt = np.arange(n) / SR
    tone = (np.sin(2 * np.pi * f0 * tt) + 0.25 * np.sin(2 * np.pi * 2 * f0 * tt) * np.exp(-tt * 3)) * np.exp(-tt * 1.6)
    tone *= np.minimum(1, tt / 0.004)
    i = int(t0 * SR)
    strings[i:i + n] += a * tone[: N - i]


# ---------- wooden body and room ----------
def body_ir(seed):
    r = np.random.default_rng(seed)
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    ir = np.zeros(n)
    ir[0] = 1.0
    # Air and wood modes of a dombra's pear-shaped body
    for f, a, d in [(190, .9, 40), (285, .7, 45), (420, .45, 60), (560, .35, 70),
                    (980, .25, 90), (1500, .15, 120), (2600, .08, 160)]:
        f *= 1 + r.uniform(-0.03, 0.03)
        ir += a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) * 0.006
    return ir


def convolve(x, h):
    size = 1 << int(np.ceil(np.log2(len(x) + len(h))))
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)[: len(x)]


left = convolve(strings, body_ir(1))
right = convolve(np.concatenate([np.zeros(14), strings[:-14]]), body_ir(2))

room_n = int(1.1 * SR)
room_t = np.arange(room_n) / SR
for k, ch in enumerate((left, right)):
    ir = rng.normal(0, 1, room_n) * np.exp(-room_t * 5.5)
    ir = np.convolve(ir, np.ones(8) / 8, mode='same')   # soften the tail
    ir[: int(0.012 * SR)] = 0
    wet = convolve(ch, ir)
    ch += 0.035 * wet / np.max(np.abs(wet)) * np.max(np.abs(ch))

out = np.stack([left, right])
out -= out.mean(axis=1, keepdims=True)
fade = np.ones(N)
fade[-int(1.0 * SR):] = np.linspace(1, 0, int(1.0 * SR)) ** 2
out *= fade
out *= 10 ** (-1 / 20) / np.max(np.abs(out))

with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'tumar-motion-sound.wav', 'wb') as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes((out.T * 32767).astype('<i2').tobytes())
