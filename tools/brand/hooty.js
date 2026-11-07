/* Hooty rig + film kit. Pure functions of time: every frame is drawn from t alone.
   Character units: feet at (0,0), body about 150 wide and 140 tall, y down. */
(function () {
  const INK = "#2b1349", MOUTH = "#7a2a2a", TONGUE = "#ef8a8a";
  const COL = {
    home: { base: "#ffc94f", shade: "#f2a93a", pale: "#fff3d6" },
    maths: { base: "#6db6ee", shade: "#4f98d6", pale: "#dff0fd" },
    science: { base: "#80d07c", shade: "#5fb45f", pale: "#e3f6df" },
    sst: { base: "#ff9d70", shade: "#ec7f50", pale: "#ffe9df" },
    english: { base: "#ff92b6", shade: "#ec7098", pale: "#ffe6ef" },
    hindi: { base: "#b7a0f2", shade: "#9b82e0", pale: "#eee8fd" },
  };
  const f = (n) => Math.round(n * 1000) / 1000; // 3 decimals: scales below 0.01 steps would visibly stair-step
  const pt = (p) => f(p[0]) + "," + f(p[1]);
  const mix = (a, b, m) => a + (b - a) * m;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    io: (x) => x * x * (3 - 2 * x),
    out: (x) => 1 - Math.pow(1 - x, 3),
    out5: (x) => 1 - Math.pow(1 - x, 5),
    in: (x) => x * x * x,
    inout: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  };
  function hexMix(a, b, m) {
    const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
    return "#" + [16, 8, 0].map((s) => Math.round(mix((A >> s) & 255, (B >> s) & 255, m)).toString(16).padStart(2, "0")).join("");
  }
    // colour mix through hue (yellow -> blue passes green, not brown)
  function toHsl(h) {
    const n = parseInt(h.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let hh = 0, ss = 0;
    if (d) { ss = d / (1 - Math.abs(2 * l - 1)); hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
    return [hh, ss, l];
  }
  function fromHsl(hh, ss, l) {
    const c = (1 - Math.abs(2 * l - 1)) * ss, x = c * (1 - Math.abs(((hh / 60) % 2) - 1)), m0 = l - c / 2;
    const [r, g, b] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
    return "#" + [r, g, b].map((v) => Math.round((v + m0) * 255).toString(16).padStart(2, "0")).join("");
  }
  // walk the colour wheel, choosing the direction that crosses the least of the muddy yellow-green band
  // (70-160 deg) unless an end colour lives there; saturation never dips, so no grey in between
  function hueMix(a, b, m) {
    const A = toHsl(a), B = toHsl(b);
    let d1 = B[0] - A[0]; if (d1 < 0) d1 += 360; const d2 = d1 - 360;
    const greenIn = (d) => { let n = 0; for (let k = 1; k < 36; k++) { const h = (((A[0] + (d * k) / 36) % 360) + 360) % 360; if (h > 70 && h < 160) n++; } return n; };
    const endsGreen = (A[0] > 70 && A[0] < 160) || (B[0] > 70 && B[0] < 160);
    const dh = endsGreen ? (Math.abs(d1) <= Math.abs(d2) ? d1 : d2) : (greenIn(d1) <= greenIn(d2) ? d1 : d2);
    if (m <= 0) return a; if (m >= 1) return b;
    const s0 = mix(A[1], B[1], m), sat = s0 + (Math.max(A[1], B[1]) - s0) * Math.sin(Math.PI * m);
    return fromHsl((((A[0] + dh * m) % 360) + 360) % 360, sat, mix(A[2], B[2], m));
  }
    // colour change brightens toward a pastel at the midpoint, so it never passes through mud or neon
  const glow = (a, b, m, k) => hexMix(hexMix(a, b, m), "#ffffff", k * Math.sin(Math.PI * m));
  const colMix = (a, b, m) => ({ base: hueMix(a.base, b.base, m), shade: hueMix(a.shade, b.shade, m), pale: hexMix(a.pale, b.pale, m) });
  // damped spring response to a step at t=0: 0 -> 1 with overshoot
  function spring(x, z = 0.45, w = 14) {
    if (x <= 0) return 0;
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x));
  }
  // jelly wobble after an impact at t=0 (returns -1..1 decaying)
  const wobble = (x, z = 0.3, w = 18) => (x <= 0 ? 0 : Math.exp(-z * w * x) * Math.sin(w * Math.sqrt(1 - z * z) * x));
  // keyed values: [[t, v, easeName?], ...]; eases the segment arriving at each key
  function key(t, ks) {
    if (t <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i][0]) {
        const [t0, v0] = ks[i - 1], [t1, v1, e] = ks[i];
        const m = (ease[e || "io"])((t - t0) / (t1 - t0));
        return Array.isArray(v0) ? v0.map((a, j) => mix(a, v1[j], m)) : mix(v0, v1, m);
      }
    }
    return ks[ks.length - 1][1];
  }
  // a hop from t0 lasting dur with height h: anticipation, stretch in the air, squash + wobble on landing
  // a hop from t0 lasting dur with height h. The squash/stretch value d is continuous everywhere:
  // anticipation squash -> stretch on take-off -> eases to neutral before contact -> landing squash + wobble
  function hop(t, t0, dur, h) {
    const pre = 0.12;
    let d = 0, lift = 0, air = false;
    if (t >= t0 - pre && t < t0) d = -0.16 * ease.io((t - (t0 - pre)) / pre);
    else if (t >= t0 && t < t0 + dur) {
      const q = (t - t0) / dur, st = 0.16 * Math.pow(Math.abs(Math.cos(Math.PI * q)), 1.4) * (1 - ease.io(clamp((q - 0.8) / 0.2)));
      d = mix(-0.16, st, ease.io(clamp(q / 0.22)));
      lift = h * Math.sin(Math.PI * q); air = true;
    } else if (t >= t0 + dur) d = -0.24 * wobble(t - (t0 + dur), 0.32, 20);
    return { lift, sx: 1 - 0.75 * d, sy: 1 + d, air };
  }

  // ---------- shapes: 48 points, same order (start right, clockwise in y-down) ----------
  const N = 48, CY = -66;
  function poly(a, n, R, rot) { const k = (2 * Math.PI) / n; let x = (((a - rot) % k) + k) % k - k / 2; return (R * Math.cos(Math.PI / n)) / Math.cos(x); }
  const sgnp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  const SHAPES = {
    blob: (a) => { const s = Math.sin(a), W = 150, H = 140; let x = (W / 2) * Math.cos(a) * (1 - (0.2 * (1 - s)) / 2), y = (H / 2) * s; const fl = (H / 2) * 0.84; if (y > fl) y = fl + (y - fl) * 0.25; return [x, y + 4]; },
    star: (a) => { const r = 78 * (0.72 + 0.28 * Math.cos(5 * (a + Math.PI / 2))); return [r * Math.cos(a), r * Math.sin(a) + 2]; },
    // a plump heart: the classic curve blended a quarter of the way to a circle, so the point is soft
    heart: (a) => { const t = a + Math.PI / 2, hx = 4.1 * 16 * Math.pow(Math.sin(t), 3), hy = -4.1 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 4; return [mix(hx, 70 * Math.cos(a), 0.26), mix(hy, 66 * Math.sin(a), 0.26)]; },
    triangle: (a) => { const r = mix(poly(a, 3, 76, -Math.PI / 2), 76, 0.1); return [r * Math.cos(a) * 1.12, r * Math.sin(a) + 26]; },
    square: (a) => [66 * sgnp(Math.cos(a), 1 / 3), 62 * sgnp(Math.sin(a), 1 / 3) + 4],
    ball: (a) => [66 * Math.cos(a), 66 * Math.sin(a)],
    globe: (a) => [68 * Math.cos(a), 68 * Math.sin(a) - 2],
    drop: (a) => { const s = Math.sin(a), up = Math.max(0, -s); return [62 * Math.cos(a) * (1 - 0.55 * up * up), 60 * s - 36 * Math.pow(up, 3) + 6]; },
    book: (a) => { let x = 92 * sgnp(Math.cos(a), 1 / 3.5), y = 56 * sgnp(Math.sin(a), 1 / 3.5); const g = Math.exp(-Math.pow(x / 22, 2)); y += y < 0 ? 16 * g : -7 * g; return [x, y + 8]; },
    bubble: (a) => { let x = 82 * Math.cos(a), y = 58 * Math.sin(a); let d = Math.abs(a - 2.15); if (d < 0.32) { const k = 40 * Math.pow(1 - d / 0.32, 2); x += Math.cos(2.15) * k; y += Math.sin(2.15) * k; } return [x, y - 8]; },
  };
  const FACE_Y = { blob: -80, star: -64, heart: -74, triangle: -42, square: -70, ball: -70, globe: -72, drop: -56, book: -70, bubble: -82 };
  function pts(name, wob) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 2 * Math.PI, p = SHAPES[name](a);
      const rr = 1 + 0.01 * Math.sin(3 * a + wob) + 0.006 * Math.sin(5 * a - wob * 1.3);
      out.push([p[0] * rr, p[1] * rr + CY]);
    }
    return out;
  }
  function smooth(ps) {
    const n = ps.length; let d = `M${pt(ps[0])}`;
    for (let i = 0; i < n; i++) {
      const p0 = ps[(i - 1 + n) % n], p1 = ps[i], p2 = ps[(i + 1) % n], p3 = ps[(i + 2) % n];
      d += ` C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
    }
    return d + "Z";
  }
  function hose(S, E, len, bend) {
    const dx = E[0] - S[0], dy = E[1] - S[1], d = Math.hypot(dx, dy) || 1;
    const h = Math.sqrt(Math.max(0, ((len * len - d * d) * 3) / 16));
    const c = [(S[0] + E[0]) / 2 - (dy / d) * 2 * h * bend, (S[1] + E[1]) / 2 + (dx / d) * 2 * h * bend];
    return `M${pt(S)} Q${pt(c)} ${pt(E)}`;
  }
  let UID = 0, PFX = "";
  const uid = (p) => PFX + (p || "h") + UID++;
  function shaded(d, base, shade, p) {
    const id = uid(p);
    return `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${shade}"/><g clip-path="url(#${id})"><path d="${d}" fill="${base}" transform="translate(-7 -4)"/></g>`;
  }

  function face(o, cx, cy) {
    const kind = o.eyes || "open", lk = o.look || [0, 0], gap = 18;
    let g = "";
    [-1, 1].forEach((s) => {
      const x = cx + s * gap + lk[0] * 3.5, y = cy + lk[1] * 3.5;
      const k = kind === "wink" && s === 1 ? "happy" : kind;
      const opA = o.open ?? 1;
      if (k === "happy") g += `<path d="M${f(x - 6.5)},${f(y + 2)} Q${f(x)},${f(y + 3 - 10.5 * opA)} ${f(x + 6.5)},${f(y + 2)}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
      else if (k === "closed") g += `<path d="M${f(x - 6.5)},${f(y)} Q${f(x)},${f(y + 2 + 4.5 * opA)} ${f(x + 6.5)},${f(y)}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
      else {
        const w = k === "wide" ? 1.3 : 1, op = o.open ?? 1;
        if (op < 0.22) g += `<path d="M${f(x - 6)},${f(y + 1)} Q${f(x)},${f(y + 4)} ${f(x + 6)},${f(y + 1)}" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`;
        else {
          g += `<ellipse cx="${f(x)}" cy="${f(y + 7.9 * w * (1 - op) * 0.5)}" rx="${f(5.8 * w)}" ry="${f(7.9 * w * op)}" fill="${INK}"/>`;
          if (op > 0.6) g += `<circle cx="${f(x + 1.9 * w)}" cy="${f(y - 3 * w * op)}" r="${f(2 * w)}" fill="#fff"/>`;
        }
      }
    });
    o_talk = o.talk || 0;
    const my = cy + 16, mx = cx + lk[0] * 2, mm = clamp(o.mouthMix ?? 1);
    if (mm < 0.999 && o.mouthPrev && o.mouthPrev !== o.mouth) g += `<g opacity="${f(1 - mm)}">${mouth(o.mouthPrev, mx, my)}</g><g opacity="${f(mm)}">${mouth(o.mouth || "smile", mx, my)}</g>`;
    else g += mouth(o.mouth || "smile", mx, my);
    return `<g transform="rotate(${f(o.tilt || 0)} ${f(cx)} ${f(cy)})">${g}</g>`;
  }
  let o_talk = 0;
  function mouth(m, mx, my) {
    let g = "";
    if (m === "smile") g += `<path d="M${f(mx - 12)},${f(my)} Q${f(mx)},${f(my + 9.5)} ${f(mx + 12)},${f(my)}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`;
    else if (m === "grin") {
      const id = uid("m"), d = `M${f(mx - 15)},${f(my - 2)} Q${f(mx)},${f(my + 2)} ${f(mx + 15)},${f(my - 2)} Q${f(mx)},${f(my + 21)} ${f(mx - 15)},${f(my - 2)}Z`;
      g += `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${MOUTH}"/><g clip-path="url(#${id})"><ellipse cx="${f(mx)}" cy="${f(my + 14)}" rx="8.5" ry="5.5" fill="${TONGUE}"/></g>`;
    } else if (m === "o") g += `<ellipse cx="${f(mx)}" cy="${f(my + 3)}" rx="4.4" ry="5.6" fill="${MOUTH}"/>`;
    else if (m === "puff") g += `<ellipse cx="${f(mx)}" cy="${f(my + 2)}" rx="7" ry="5" fill="${MOUTH}"/>`;
    else if (m === "flat") g += `<path d="M${f(mx - 7)},${f(my + 3)} L${f(mx + 7)},${f(my + 1)}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    else if (m === "talk") {
      const v = clamp(o_talk), w = 9 + 5 * v, h = 3 + 15 * v;
      if (v < 0.08) g += `<path d="M${f(mx - 11)},${f(my)} Q${f(mx)},${f(my + 8)} ${f(mx + 11)},${f(my)}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`;
      else { const id = uid("t"), d = `M${f(mx - w)},${f(my - 1)} Q${f(mx)},${f(my + 1)} ${f(mx + w)},${f(my - 1)} Q${f(mx)},${f(my + h * 1.5)} ${f(mx - w)},${f(my - 1)}Z`;
        g += `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${MOUTH}"/><g clip-path="url(#${id})"><ellipse cx="${f(mx)}" cy="${f(my + h * 1.25)}" rx="${f(w * 0.6)}" ry="${f(h * 0.45)}" fill="${TONGUE}"/></g>`; }
    }
    else if (m === "wobble") g += `<path d="M${f(mx - 10)},${f(my + 3)} q3.3,-4 6.6,0 t6.6,0 t6.6,0" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
    return g;
  }

  // decorations drawn inside the body clip for some shapes
  function decor(name, o, col) {
    if (name === "globe") {
      const sp = ((o.spin || 0) % 1) * 300;
      let g = "";
      for (let k = -1; k <= 1; k++) {
        const x = k * 300 - sp;
        g += `<g transform="translate(${f(x)} 0)" fill="#7cc97a"><ellipse cx="-30" cy="-96" rx="26" ry="18"/><ellipse cx="-42" cy="-74" rx="14" ry="20"/><ellipse cx="34" cy="-50" rx="22" ry="26"/><ellipse cx="48" cy="-92" rx="16" ry="10"/><ellipse cx="96" cy="-70" rx="20" ry="28"/><ellipse cx="140" cy="-104" rx="22" ry="12"/><ellipse cx="128" cy="-40" rx="12" ry="14"/><ellipse cx="190" cy="-80" rx="26" ry="20"/><ellipse cx="236" cy="-46" rx="18" ry="16"/></g>`;
      }
      return g;
    }
    if (name === "book") {
      return `<path d="M0,-108 L0,-12" stroke="${col.shade}" stroke-width="5"/>` +
        [-1, 1].map((s) => [0, 1, 2].map((i) => `<path d="M${s * 18},${-92 + i * 18} Q${s * 46},${-98 + i * 18} ${s * 74},${-90 + i * 18}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>`).join("")).join("");
    }
    return "";
  }

  /* o: from, to, m (morph 0..1), col, wob, lift, sx, sy, lean, turn, armK, arms[{to,len,bend,hand,rot}],
        eyes, mouth, look, tilt, spin (globe), shadow(false to hide), shadowY (ground offset) */
  function svg(o) {
    const from = o.from || "blob", to = o.to || from, m = o.m || 0, wob = o.wob || 0, col = o.col || COL.home;
    const A = pts(from, wob), B = pts(to, wob), P = A.map((p, i) => [mix(p[0], B[i][0], m), mix(p[1], B[i][1], m)]);
    const d = smooth(P);
    let g = "";
    const armK = o.armK ?? 1;
    if (armK > 0.03) {
      const arms = o.arms || [{ to: [-94, -46] }, { to: [94, -46] }];
      // shoulders sit on the body's real outline at shoulder height, so arms stay attached on any shape
      const edge = (side, y) => { let best = null; for (const q of P) if (Math.sign(q[0]) === side && (!best || Math.abs(q[1] - y) < Math.abs(best[1] - y))) best = q; return best ? best[0] * 0.9 : side * 58; };
      const sh = [[edge(-1, -62), -62], [edge(1, -62), -62]];
      arms.forEach((a, i) => {
        if (!a) return;
        const E = [mix(sh[i][0] * 0.8, a.to[0], armK), mix(sh[i][1], a.to[1], armK)];
        g += `<path d="${hose(sh[i], E, (a.len || 48) * armK, a.bend ?? (i ? -1 : 1))}" fill="none" stroke="${col.shade}" stroke-width="8" stroke-linecap="round"/>`;
        if (a.hand === "point") g += `<ellipse cx="${f(E[0])}" cy="${f(E[1])}" rx="12" ry="7" fill="${col.shade}" transform="rotate(${f(a.rot || 0)} ${f(E[0])} ${f(E[1])})"/>`;
        else g += `<circle cx="${f(E[0])}" cy="${f(E[1])}" r="${f(8.5 * Math.max(0.5, armK))}" fill="${col.shade}"/>`;
      });
    }
    const id = uid("b");
    g += `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${col.shade}"/><g clip-path="url(#${id})"><path d="${d}" fill="${col.base}" transform="translate(-7 -4)"/>`;
    const dA = decor(from, o, col), dB = decor(to, o, col);
    if (dA) g += `<g opacity="${f(1 - m)}">${dA}</g>`;
    if (dB && to !== from) g += `<g opacity="${f(m)}">${dB}</g>`;
    g += `</g>`;
    if (o.face !== false) g += face(o, (o.turn || 0) * 18, mix(FACE_Y[from], FACE_Y[to], m));
    // the shadow lies on the ground under Hooty: groundDy = how far that surface is below his feet (rig units).
    // It only slides sideways with him; it shrinks and fades with his height above that surface.
    const lift = o.lift || 0, gd = o.groundDy || 0, hgt = Math.max(0, lift + gd), k = Math.max(0.35, 1 - hgt / 170);
    const sh = o.shadow === false ? "" : `<ellipse cx="0" cy="${f(1 + gd)}" rx="${f(70 * k)}" ry="${f(7.5 * k)}" fill="rgba(43,19,73,${f(0.12 * (0.45 + 0.55 * k))})"/>`;
    return sh + `<g transform="translate(0 ${f(-lift)}) rotate(${f(o.lean || 0)}) scale(${f(o.sx || 1)} ${f(o.sy || 1)})">${g}</g>`;
  }

  // drive a render(t) function from a scene timeline
  function drive(tl, dur, render, at = 0) {
    const p = { t: 0 };
    tl.fromTo(p, { t: 0 }, { t: dur, duration: dur, ease: "none", onUpdate: () => render(p.t) }, at);
    render(0);
  }
  // split an element's words into spans for per-word entrances
  function words(el) {
    const pre = el.querySelectorAll(".w"); if (pre.length) return pre;
    const ws = el.textContent.trim().split(/\s+/);
    el.innerHTML = ws.map((w) => `<span class="w" style="display:inline-block">${w}</span>`).join(" ");
    return el.querySelectorAll(".w");
  }
  function wordsIn(tl, el, at, gap = 0.08) {
    const ws = words(el);
    ws.forEach((w, i) => tl.fromTo(w, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.14, ease: "power2.out" }, at + i * gap));
    return ws;
  }
  function wordsOut(tl, el, at, gap = 0.05) {
    el.querySelectorAll(".w").forEach((w, i) => tl.to(w, { opacity: 0, filter: "blur(6px)", duration: 0.16, ease: "power2.in" }, at + i * gap));
  }
  // eye openness for natural blinks: closed for ~4 frames around each blink time
  function blink(t, period = 3.7, offset = 1.3) {
    const n = Math.round((t - offset) / period), dt = Math.abs(t - (offset + n * period));
    return clamp(dt / 0.075, 0, 1);
  }
  /* acting: keys [[t, {eyes, mouth, look, ...}], ...]. Each change happens behind a blink (eyes shut for
     about 4 frames, then the new face), and the look eases between keys. Returns the merged face fields. */
  function act(t, keys, base = {}) {
    let cur = keys[0][1], prevLook = keys[0][1].look || [0, 0], prevMouth = keys[0][1].mouth || "smile", k0 = keys[0][0], open = 1;
    for (let i = 1; i < keys.length; i++) {
      const tk = keys[i][0];
      open = Math.min(open, clamp(Math.abs(t - tk) / 0.07, 0, 1));
      if (t >= tk) { prevLook = cur.look || prevLook; prevMouth = cur.mouth || prevMouth; cur = keys[i][1]; k0 = tk; }
    }
    const mouthMix = ease.io(clamp((t - k0) / 0.14));
    const L = cur.look || prevLook, m = ease.io(clamp((t - k0) / 0.25));
    const look = [mix(prevLook[0], L[0], m), mix(prevLook[1], L[1], m)];
    return Object.assign({}, base, cur, { look, open: Math.min(open, base.open ?? 1), mouthPrev: prevMouth, mouthMix });
  }
  /* Butter filter: average a state function over +-0.08 s (gaussian, 9 taps), clamped to [lo, hi].
     Every number in the state is smoothed (positions, squash, tilt, arms, gaze, eyelids, mouth mix);
     shape morphs, colours and strings come from the centre sample so morphs stay crisp. */
  const KEEP = new Set(["m", "col", "groundDy", "spin", "wob", "eyes", "mouth", "mouthPrev", "shadow", "face", "hand", "screen"]);
  const TAPS = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => [i * 0.02, Math.exp(-Math.pow(i * 0.02 / 0.04, 2) / 2)]);
  function avg(samples, ws, c) {
    const v = samples[c];
    if (typeof v === "number") { let s = 0, w = 0; samples.forEach((x, i) => { if (typeof x === "number") { s += x * ws[i]; w += ws[i]; } }); return w ? s / w : v; }
    if (Array.isArray(v)) return v.map((_, j) => avg(samples.map((x) => (Array.isArray(x) && x.length === v.length ? x[j] : undefined)), ws, c));
    if (v && typeof v === "object") { const out = {}; for (const k in v) out[k] = KEEP.has(k) ? v[k] : avg(samples.map((x) => (x && typeof x === "object" ? x[k] : undefined)), ws, c); return out; }
    return v;
  }
  function blend(a, b, w) { return avg([a, b], [1 - w, w], w < 0.5 ? 0 : 1); }
  function smoothed(fn, t, lo = -1e9, hi = 1e9) {
    const ws = TAPS.map((p) => p[1]), samples = TAPS.map((p) => fn(clamp(t + p[0], lo, hi)));
    return avg(samples, ws, 4);
  }
  const reset = (pfx) => { UID = 0; PFX = pfx || ""; };
  window.HOOTY = { SHAPE_NAMES: Object.keys(SHAPES), INK, COL, f, pt, mix, clamp, prog, ease, hexMix, colMix, spring, wobble, key, hop, svg, face, shaded, smooth, drive, blink, act, smoothed, blend, words, wordsIn, wordsOut, reset, uid, BEAT: 0.5 };
})();
