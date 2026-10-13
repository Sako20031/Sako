"""Soundtrack for public/tumar-motion.html (12 s): a solo kobyz, synthesised.

The kyl-kobyz: two horsehair strings bowed over an open, leather-covered
bowl. A slow melody on the upper string over a drone on the lower one,
with slides between notes, a wide vibrato and the raspy breath of the
bow. It swells as the logo lands at 9 s, then fades into silence.

    python3 scripts/motion-sound.py out.wav
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 12.0
N = int(SR * DUR)
T = np.arange(N) / SR
rng = np.random.default_rng(3)

def smooth(x, n):
    """Moving average of width n (fast, via a running sum)."""
    c = np.cumsum(np.concatenate([np.zeros(n), x]))
    return (c[n:] - c[:-n]) / n


NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def hz(name):
    n = NAMES[name[0]] + (1 if '#' in name else 0) - (1 if 'b' in name[1:-1] else 0)
    return 440.0 * 2 ** ((n + (int(name[-1]) + 1) * 12 - 69) / 12)


# ---------- the melody: (start, note, slide into it in seconds, bow strength) ----------
melody = [
    (0.25, 'A3', 0.0, 0.55),   # the medallion appears out of the dark
    (1.55, 'D4', 0.28, 0.65),  # horns: a long slide up
    (2.35, 'C4', 0.06, 0.55),
    (2.55, 'D4', 0.06, 0.7),
    (2.9, 'F4', 0.18, 0.95),   # TUMAR
    (3.9, 'E4', 0.12, 0.75),
    (4.5, 'D4', 0.12, 0.7),
    (5.0, 'E4', 0.1, 0.7),
    (5.5, 'A4', 0.35, 1.0),    # the tagline: the high point
    (6.6, 'G4', 0.14, 0.8),
    (7.1, 'F4', 0.14, 0.75),
    (7.7, 'E4', 0.16, 0.75),
    (8.3, 'D4', 0.3, 0.85),    # the light opens: settles home
    (9.0, 'D4', 0.0, 1.0),     # the logo: a new bow on the same note
]
END = 11.4                     # fully silent from here

# Pitch curve with slides
pitch = np.full(N, hz(melody[0][1]))
for i, (t0, note, slide, _) in enumerate(melody):
    a = int(t0 * SR)
    f_prev = hz(melody[i - 1][1]) if i else hz(note)
    f_new = hz(note)
    s = max(1, int(slide * SR))
    seg = np.linspace(0, 1, s)
    curve = f_prev * (f_new / f_prev) ** (seg * seg * (3 - 2 * seg))   # eased glide in log pitch
    pitch[a:a + s] = curve[: N - a]
    pitch[a + s:] = f_new

# Vibrato: grows in on each long note, a little irregular like a player's hand
vib_depth = np.zeros(N)
for i, (t0, note, slide, _) in enumerate(melody):
    t1 = melody[i + 1][0] if i + 1 < len(melody) else DUR
    a, b = int(t0 * SR), int(t1 * SR)
    local = np.arange(b - a) / SR
    vib_depth[a:b] = 0.011 * np.clip((local - slide - 0.15) / 0.5, 0, 1)
vib_rate = 5.3 + 0.4 * np.sin(2 * np.pi * 0.31 * T)
vib = vib_depth * np.sin(2 * np.pi * np.cumsum(vib_rate) / SR)
wobble = 0.0015 * smooth(rng.normal(0, 1, N), 2400) * 40
freq = pitch * (1 + vib + wobble)

# Bow: each note is a new bow stroke (a small dip and swell), with an overall shape
bow = np.zeros(N)
for i, (t0, note, slide, amp) in enumerate(melody):
    t1 = melody[i + 1][0] if i + 1 < len(melody) else END
    a, b = int(t0 * SR), int(t1 * SR)
    local = np.arange(b - a) / SR
    length = (b - a) / SR
    attack = np.clip(local / 0.12, 0, 1) ** 0.7
    swell = 0.85 + 0.15 * np.sin(np.pi * np.clip(local / max(length, 0.01), 0, 1))
    bow[a:b] = amp * attack * swell
bow = np.convolve(bow, np.hanning(1200) / np.hanning(1200).sum(), mode='same')   # smooth bow changes
fade_in = np.clip(T / 0.9, 0, 1) ** 1.5
fade_out = np.clip((END - T) / 2.2, 0, 1) ** 2          # the last note dies away into silence
bow *= fade_in * np.where(T > 9.0, fade_out, 1.0)


def bowed(freq, bow, bright, seed):
    """A bowed horsehair string: rich harmonics, roughness, and bow breath."""
    r = np.random.default_rng(seed)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    out = np.zeros(N)
    # Horsehair is uneven: harmonic levels flutter slowly
    for h in range(1, 48):
        limit = np.clip((9000 - h * freq) / 2000, 0, 1)
        if not limit.any():
            break
        flutter = 1 + 0.25 * smooth(r.normal(0, 1, N), 4800) * 60
        amp = (1 / h ** bright) * flutter * limit
        out += amp * np.sin(h * phase + r.uniform(0, 6.28))
    # Rasp: noise that pulses with each period of the string (stick-slip of the bow)
    noise = r.normal(0, 1, N)
    noise = noise - smooth(noise, 6)
    pulse = 0.5 + 0.5 * np.cos(phase) ** 8
    out += 0.35 * noise * pulse
    return out * bow


upper = bowed(freq, bow, 0.9, 1)

# Lower string: a drone on D3, under the whole melody, a touch quieter
drone_bow = 0.42 * np.clip(T / 1.6, 0, 1) * np.where(T > 9.0, fade_out, 1.0)
drone_bow = drone_bow * (1 + 0.15 * (bow / (bow.max() + 1e-9)))  # follows the bow a little
drone_freq = hz('D3') * (1 + 0.004 * np.sin(2 * np.pi * 4.9 * T) * np.clip((T - 1) / 2, 0, 1))
lower = bowed(drone_freq, drone_bow, 1.2, 2)

strings = upper + lower


# ---------- the bowl: an open wooden bowl under a leather membrane ----------
def convolve(x, h):
    size = 1 << int(np.ceil(np.log2(len(x) + len(h))))
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)[: len(x)]


def body_ir(seed):
    r = np.random.default_rng(seed)
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    ir = np.zeros(n)
    ir[0] = 0.5
    # A nasal, vocal colour: strong mids, and a dark top
    for f, a, d in [(280, .9, 60), (520, .8, 70), (900, 1.0, 80), (1350, .6, 110),
                    (2300, .6, 160), (3400, .3, 220)]:
        f *= 1 + r.uniform(-0.02, 0.02)
        ir += a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) * 0.012
    return ir


def tone(x, cutoff):
    size = 1 << int(np.ceil(np.log2(len(x))))
    X = np.fft.rfft(x, size)
    f = np.fft.rfftfreq(size, 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    X *= np.clip(f / 70, 0, 1)            # no rumble under the low D
    return np.fft.irfft(X, size)[: len(x)]


left = tone(convolve(strings, body_ir(1)), 6500)
right = tone(convolve(np.concatenate([np.zeros(18), strings[:-18]]), body_ir(2)), 6500)

# A wide, dark steppe-night hall
hall_n = int(3.0 * SR)
hall_t = np.arange(hall_n) / SR
dry = [left.copy(), right.copy()]
for k, ch in enumerate((left, right)):
    ir = rng.normal(0, 1, hall_n) * np.exp(-hall_t * 2.0)
    ir = tone(ir, 2200)
    ir[: int(0.03 * SR)] = 0
    wet = convolve(dry[k], ir)
    ch += 0.3 * wet / np.max(np.abs(wet)) * np.max(np.abs(dry[k]))

out = np.stack([left, right])
out -= out.mean(axis=1, keepdims=True)
tail = np.clip((DUR - T) / 0.6, 0, 1)    # the hall tail is gone by the loop point
out *= tail
out *= 10 ** (-1 / 20) / np.max(np.abs(out))

with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'tumar-motion-sound.wav', 'wb') as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes((out.T * 32767).astype('<i2').tobytes())
