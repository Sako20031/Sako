"""Soundtrack for public/tumar-motion.html (12 s): dombra, synthesised.

Two dombras play in unison (left and right, a hair apart in time and
tuning) for a fuller, warmer sound. Each dombra has two strings tuned D3
and G3; each string is a waveguide that rings for the whole piece, strokes
excite it with the soft of the finger, frets change its length. Then the
wooden body, a gentle top roll-off and a warm hall.

    python3 scripts/motion-sound.py out.wav
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 12.0
N = int(SR * DUR)

NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def hz(name):
    n = NAMES[name[0]] + (1 if '#' in name else 0) - (1 if 'b' in name[1:-1] else 0)
    return 440.0 * 2 ** ((n + (int(name[-1]) + 1) * 12 - 69) / 12)


# ---------- the score: (time, string, note, strength, stroke) ----------
# string 0 = lower D string, 1 = upper G string; stroke 'd' = down, 'u' = up
events = []


def stroke(t, low, high, amp, kind='d', roll=None):
    """Strike both strings; a down stroke reaches the D string first."""
    gap = roll or (0.016 if kind == 'd' else 0.012)
    first, second = ((0, low), (1, high)) if kind == 'd' else ((1, high), (0, low))
    events.append((t, first[0], first[1], amp, kind))
    events.append((t + gap, second[0], second[1], amp * (0.9 if kind == 'd' else 0.8), kind))


def pick(t, string, note, amp):
    events.append((t, string, note, amp, 'p'))


# 0.2 s - the medallion appears: slow, rolled open chords, left to ring
stroke(0.20, 'D3', 'A3', 0.85, roll=0.05)
stroke(1.05, 'D3', 'G3', 0.6, roll=0.05)

# 1.6 s - the horns: an unhurried rising line over the open D
pick(1.6, 0, 'D3', 0.5)
for i, n in enumerate(['A3', 'D4', 'F4', 'E4', 'D4', 'A3']):
    pick(1.6 + i * 0.2, 1, n, 0.55)

# 2.9 s - TUMAR: a calm galloping kuy rhythm (long, short, short)
beat = 60 / 108
bars = [('D3', 'A3'), ('D3', 'A3'), ('D3', 'Bb3'), ('D3', 'A3'),
        ('F3', 'C4'), ('E3', 'A3'), ('D3', 'A3'), ('D3', 'G3'), ('D3', 'A3')]
t = 2.9
for b, (low, high) in enumerate(bars):
    if t > 7.6:
        break
    accent = 1.0 if b % 4 == 0 else 0.82
    stroke(t, low, high, 0.9 * accent, 'd')
    stroke(t + beat * 0.5, low, high, 0.38, 'u')
    stroke(t + beat * 0.75, low, high, 0.55, 'd')
    t += beat

# 5.5 s - the tagline: a singing phrase on the upper string
for dt, n in [(0.0, 'D4'), (0.3, 'F4'), (0.6, 'E4')]:
    pick(5.5 + dt, 1, n, 0.6)

# 8.0 s - the light opens: two broad rolled chords
stroke(8.0, 'D3', 'A3', 0.7, roll=0.07)
stroke(8.5, 'E3', 'Bb3', 0.75, roll=0.07)

# 9.0 s - the logo lands: a full open chord, then the letters
stroke(9.0, 'D3', 'G3', 1.0, roll=0.03)
for i, n in enumerate(['A3', 'D4', 'F4', 'A4']):
    pick(9.0 + 0.4 + i * 0.16, 1, n, 0.3)

events.sort()

# Natural harmonics (flageolets) at the end: soft, bell-like
harmonics = [(10.1, hz('D4'), 0.14), (10.6, hz('A4'), 0.11)]


# ---------- strings ----------
def excitation(amp, kind, period, rng):
    """The soft of the finger meeting the string (no hard nail)."""
    n = max(8, int(period * 1.3))
    burst = rng.uniform(-1, 1, n)
    for _ in range({'d': 5, 'u': 4, 'p': 6}[kind]):
        burst = 0.5 * (burst + np.roll(burst, 1))
    # Plucked about a fifth of the way from the bridge: rounder tone
    k = max(1, n // 5)
    burst = burst - 0.7 * np.concatenate([np.zeros(k), burst[:-k]])
    burst *= np.hanning(n) ** 0.5
    return burst * amp


def string_track(index, open_note, detune, rng):
    out = np.zeros(N)
    buf = np.zeros(4096)
    w = 0
    f = hz(open_note) * detune
    delay = SR / f - 0.5
    gain = 0.0
    damp_until = -1
    pending = [(int(t * SR), note, amp, kind) for (t, s, note, amp, kind) in events if s == index]
    pending.append((N + 1, None, 0, None))
    p = 0
    inject = None
    inj_pos = 0
    bright = 0.5
    for n in range(N):
        if n >= pending[p][0]:
            _, note, amp, kind = pending[p]
            p += 1
            f_new = hz(note) * detune
            if abs(f_new - f) > 0.5:
                damp_until = n + 60          # the finger moves: the old note stops
            f = f_new
            delay = SR / f - 0.5
            t60 = 2.8 * (146.8 / f) ** 0.3   # long, warm sustain
            gain = 10 ** (-3 / (t60 * f))
            inject = excitation(amp, kind, SR / f, rng)
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
            y *= 0.93
        if inject is not None:
            y += inject[inj_pos]
            inj_pos += 1
            if inj_pos >= len(inject):
                inject = None
        buf[w & 4095] = y
        out[n] = y
        w += 1
    return out


def dombra(detune, seed):
    rng = np.random.default_rng(seed)
    return string_track(0, 'D3', detune, rng) + string_track(1, 'G3', detune, rng)


def shift(x, sec):
    k = int(sec * SR)
    return np.concatenate([np.zeros(k), x[: len(x) - k]])


# Two players: one a few cents sharp and a few milliseconds late
cents = 2 ** (5 / 1200)
player_l = dombra(1.0, 11)
player_r = shift(dombra(cents, 23), 0.011)


def add_harmonics(x):
    for t0, f0, a in harmonics:
        n = int(2.5 * SR)
        tt = np.arange(n) / SR
        tone = (np.sin(2 * np.pi * f0 * tt) + 0.2 * np.sin(2 * np.pi * 2 * f0 * tt) * np.exp(-tt * 3)) * np.exp(-tt * 1.2)
        tone *= np.minimum(1, tt / 0.01)
        i = int(t0 * SR)
        x[i:i + n] += a * tone[: N - i]
    return x


player_l = add_harmonics(player_l)
player_r = add_harmonics(player_r)


# ---------- wooden body, tone, hall ----------
def convolve(x, h):
    size = 1 << int(np.ceil(np.log2(len(x) + len(h))))
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)[: len(x)]


def body_ir(seed):
    r = np.random.default_rng(seed)
    n = int(0.15 * SR)
    t = np.arange(n) / SR
    ir = np.zeros(n)
    ir[0] = 1.0
    # Air and wood modes of a dombra's pear-shaped body: warm low-mids
    for f, a, d in [(160, 1.0, 30), (240, .8, 35), (330, .6, 45), (470, .4, 60),
                    (850, .18, 90), (1400, .08, 130)]:
        f *= 1 + r.uniform(-0.03, 0.03)
        ir += a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) * 0.006
    return ir


def tone(x, cutoff=4200.0):
    """Gentle top roll-off: takes the edge and the 'twang' off."""
    size = 1 << int(np.ceil(np.log2(len(x))))
    X = np.fft.rfft(x, size)
    f = np.fft.rfftfreq(size, 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, size)[: len(x)]


rng = np.random.default_rng(5)
left = tone(convolve(player_l + 0.35 * player_r, body_ir(1)))
right = tone(convolve(player_r + 0.35 * player_l, body_ir(2)))

# Warm hall: a longer, darker tail
hall_n = int(2.4 * SR)
hall_t = np.arange(hall_n) / SR
dry = [left.copy(), right.copy()]
for k, ch in enumerate((left, right)):
    ir = rng.normal(0, 1, hall_n) * np.exp(-hall_t * 2.6)
    ir = tone(ir, 2500.0)
    ir[: int(0.025 * SR)] = 0
    wet = convolve(dry[k], ir)
    ch += 0.22 * wet / np.max(np.abs(wet)) * np.max(np.abs(dry[k]))

out = np.stack([left, right])
out -= out.mean(axis=1, keepdims=True)
fade = np.ones(N)
fade[: int(0.03 * SR)] = np.linspace(0, 1, int(0.03 * SR))
fade[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)) ** 2
out *= fade
out *= 10 ** (-1 / 20) / np.max(np.abs(out))

with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'tumar-motion-sound.wav', 'wb') as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes((out.T * 32767).astype('<i2').tobytes())
