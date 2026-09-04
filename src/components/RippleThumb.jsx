import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/*
 * Real-time water-ripple distortion, driven by the pointer's actual path
 * across the card (not just its current position) — every stop the cursor
 * makes while moving drops a wave that expands, refracts the image beneath
 * it and catches a specular highlight, then decays. Renders on top of a
 * source <canvas> (GenerativeArt) and re-samples it as a live texture each
 * frame, so the ripple always distorts whatever is currently drawn there.
 *
 * Pointer coordinates come in as 0..1, top-left origin (matching CSS).
 */

const MAX_POINTS = 40; // generous trail budget so a full swipe across the
                        // card stays one continuous ribbon instead of the
                        // start being evicted before the sweep finishes
const MAX_AGE = 2.2; // seconds a single ripple impulse stays alive — long
                      // enough that the trail reads as one continuous silk
                      // sheet following the cursor, not disconnected drops

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_aspect; // width / height, to keep ripples circular
uniform int u_count;
uniform vec3 u_points[${MAX_POINTS}]; // xy = uv (top-left origin), z = start time

// Physically-styled point wave: amplitude * sin(dist*freq - age*speed) *
// exp(-dist*decay). Low frequency + a wide spatial falloff is what reads as
// a soft, silky swell instead of a tight, "carved" ripple pattern.
float ripple(vec2 uv, float dirSign, float ampMul, float rotAngle, float phaseShift) {
  float total = 0.0;
  float s = sin(rotAngle), c = cos(rotAngle);
  mat2 R = mat2(c, -s, s, c);
  for (int i = 0; i < ${MAX_POINTS}; i++) {
    if (i >= u_count) break;
    vec3 p = u_points[i];
    float age = u_time - p.z;
    if (age < 0.0 || age > ${MAX_AGE.toFixed(2)}) continue;
    vec2 d = uv - p.xy;
    d.x *= u_aspect;
    d = R * d; // rotate sampling space — gives the secondary layer its swirl
    float dist = length(d);
    // low frequency + slow speed + a wide falloff — reads as a feather-light
    // touch drifting across the surface, not a poke or a splash
    float freq = 6.5;
    float speed = 1.9;
    float decay = 2.1; // wider spatial falloff — a broad, soft swell
                        // instead of a tight, localised poke
    // slow attack + slow, fully-completed release so the wave fades all the
    // way to zero well before it's culled at MAX_AGE — no abrupt cutoff
    float attack = smoothstep(0.0, 0.1, age);
    float release = exp(-age * 1.7);
    float envelope = attack * release;
    float wave = sin(dist * freq * dirSign - age * speed + phaseShift);
    total += wave * exp(-dist * decay) * envelope * ampMul;
  }
  return total;
}

// two interfering wave fields: a primary outward ripple, plus a smaller,
// counter-phased, slightly rotated secondary layer — the beat pattern
// between them is what reads as "real" water instead of a single sine set
float rippleField(vec2 uv) {
  float h1 = ripple(uv, 1.0, 0.62, 0.0, 0.0);
  float h2 = ripple(uv, -1.0, 0.14, 0.35, 3.14159);
  // clamp the summed height — with many overlapping points mid-swipe the
  // raw sum could otherwise spike well past +/-1 and blow out the surface
  return clamp(h1 + h2, -1.1, 1.1);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = v_uv;
  float eps = 0.0055;
  float h  = rippleField(uv);
  float hx = rippleField(uv + vec2(eps, 0.0));
  float hy = rippleField(uv + vec2(0.0, eps));
  vec2 grad = vec2(h - hx, h - hy) / eps;
  // hard-bound the slope itself — this is what actually keeps the surface
  // stable when several fast-moving points overlap
  grad = clamp(grad, vec2(-10.0), vec2(10.0));

  vec2 duv = uv + grad * 0.0021;
  duv = clamp(duv, 0.001, 0.999);

  vec4 color = texture2D(u_tex, duv);

  // wide, soft specular instead of a hard varnish-like glint — a low power
  // and low intensity is what separates "silk" from "wood grain"
  vec3 normal = normalize(vec3(grad * 0.85, 1.0));
  vec3 lightDir = normalize(vec3(0.35, 0.55, 0.78));
  float spec = pow(max(dot(normal, lightDir), 0.0), 4.0);
  color.rgb += spec * 0.26;
  color.rgb += max(h, 0.0) * 0.045;
  color.rgb *= 1.0 - clamp(-h * 0.22, 0.0, 0.13);

  // gentle rim glow at the steepest part of the slope — kept soft and low,
  // just enough to catch the eye without reading as a hard highlight
  float slope = length(grad);
  float rim = smoothstep(0.32, 1.35, slope);
  color.rgb += rim * 0.045;

  // very subtle hue drift keyed to displacement — barely-there depth cue,
  // kept low so it never reads as a colour artifact
  vec3 hsv = rgb2hsv(color.rgb);
  hsv.x = fract(hsv.x + h * 0.01);
  hsv.y = clamp(hsv.y + abs(h) * 0.035, 0.0, 1.0);
  color.rgb = hsv2rgb(hsv);

  gl_FragColor = vec4(color.rgb, color.a);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

const RippleThumb = forwardRef(function RippleThumb({ sourceRef, active }, forwardedRef) {
  const canvasRef = useRef(null);
  useImperativeHandle(forwardedRef, () => canvasRef.current, []);
  const glRef = useRef(null);
  const stateRef = useRef({
    points: [],
    lastPush: { x: 0.5, y: 0.5, t: 0 },
    raf: 0,
    running: false,
    startTime: 0,
    uTime: null, uCount: null, uPoints: null, uAspect: null,
    flatPoints: new Float32Array(MAX_POINTS * 3)
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true })
      || canvas.getContext('experimental-webgl');
    if (!gl) return;
    glRef.current = gl;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const s = stateRef.current;
    s.uTime = gl.getUniformLocation(prog, 'u_time');
    s.uCount = gl.getUniformLocation(prog, 'u_count');
    s.uPoints = gl.getUniformLocation(prog, 'u_points');
    s.uAspect = gl.getUniformLocation(prog, 'u_aspect');
    s.startTime = performance.now();

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
      const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw; canvas.height = ph;
        gl.viewport(0, 0, pw, ph);
      }
    }

    function render() {
      const src = sourceRef.current;
      if (!src || !src.offsetWidth) { s.raf = requestAnimationFrame(render); return; }
      resize();
      const now = (performance.now() - s.startTime) / 1000;

      // prune expired ripple points
      s.points = s.points.filter(p => now - p.t < MAX_AGE);

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(s.uTime, now);
      gl.uniform1f(s.uAspect, canvas.clientWidth / Math.max(1, canvas.clientHeight));
      const flat = s.flatPoints;
      for (let i = 0; i < MAX_POINTS; i++) {
        const p = s.points[i];
        flat[i * 3] = p ? p.x : 0;
        flat[i * 3 + 1] = p ? p.y : 0;
        flat[i * 3 + 2] = p ? p.t : -999;
      }
      gl.uniform3fv(s.uPoints, flat);
      gl.uniform1i(s.uCount, s.points.length);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (active.current || s.points.length > 0) {
        s.raf = requestAnimationFrame(render);
      } else {
        s.running = false;
      }
    }

    function start() {
      if (s.running) return;
      s.running = true;
      s.raf = requestAnimationFrame(render);
    }

    canvas.__rippleStart = start;
    canvas.__ripplePush = (x, y) => {
      const now = (performance.now() - s.startTime) / 1000;
      const lp = s.lastPush;
      const dx = x - lp.x, dy = y - lp.y;
      const moved = Math.sqrt(dx * dx + dy * dy);
      const dt = now - lp.t;
      // denser trail: a lower distance/time threshold means the wake reads
      // as one continuous ribbon instead of a string of separate drops
      if (moved < 0.012 && dt < 0.018) return;
      // fast swipes fire mousemove sparsely — without filling in the gap,
      // the trail visibly breaks into disconnected segments ("wooden"
      // stepping) exactly where the cursor moved fastest
      const steps = Math.min(6, Math.max(1, Math.floor(moved / 0.02)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        s.points.push({ x: lp.x + dx * t, y: lp.y + dy * t, t: lp.t + dt * t });
      }
      while (s.points.length > MAX_POINTS) s.points.shift();
      s.lastPush = { x, y, t: now };
      start();
    };

    return () => {
      cancelAnimationFrame(s.raf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      gl.deleteTexture(tex);
    };
  }, [sourceRef, active]);

  return <canvas ref={canvasRef} className="pf-ripple" aria-hidden="true" />;
});

export default RippleThumb;
