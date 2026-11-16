import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl';
import { gsap } from '../motion';
import { DURATION, EASE, type GalleryCtx, type GalleryVariant } from './core';
import { rullo } from './rullo';

/**
 * Le foto sono disegnate su un canvas WebGL. Il passaggio è un'onda che sale (scende tornando indietro):
 * dove passa, le due foto si stirano in verticale e la nuova prende il posto della vecchia.
 * Ogni foto mantiene le sue proporzioni e il suo allineamento (come object-contain in basso a destra).
 */
const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0., 1.);
}`;

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D tA;
uniform sampler2D tB;
uniform vec4 rA;
uniform vec4 rB;
uniform float uProgress;
uniform float uDir;
varying vec2 vUv;

vec4 inRect(sampler2D t, vec4 r, vec2 uv) {
  vec2 q = (uv - r.xy) / r.zw;
  if (q.x < 0. || q.x > 1. || q.y < 0. || q.y > 1.) return vec4(0.);
  return texture2D(t, q);
}

void main() {
  float y = uDir > 0. ? vUv.y : 1. - vUv.y;
  float wave = sin(vUv.x * 4.0 + uProgress * 5.0) * 0.035;
  float edge = uProgress * 1.4 - 0.2;
  float reveal = 1. - smoothstep(edge - 0.12, edge + 0.12, y + wave);
  float stretch = reveal * (1. - reveal) * 4.;
  vec2 off = vec2(0., stretch * 0.09 * uDir);
  vec4 a = inRect(tA, rA, vUv - off);
  vec4 b = inRect(tB, rB, vUv + off * 0.6);
  gl_FragColor = mix(a, b, reveal);
}`;

interface State {
  renderer: Renderer;
  program: Program;
  mesh: Mesh;
  textures: Texture[];
  ro: ResizeObserver;
}
let state: State | null = null;
let fallback = false;

const desktop = () => window.matchMedia('(min-width: 1024px)').matches;

/** Dove sta la foto nel canvas (0–1, origine in basso a sinistra), come l'object-contain del layout. */
function rectFor(ctx: GalleryCtx, i: number): [number, number, number, number] {
  const { width: W, height: H } = ctx.stage.getBoundingClientRect();
  const img = ctx.images[i];
  const w = Number(img.getAttribute('width'));
  const h = Number(img.getAttribute('height'));
  const s = Math.min(W / w, H / h);
  const dw = w * s;
  const dh = h * s;
  // desktop: in basso a destra; mobile: in alto a sinistra, subito sotto il titolo
  const x = desktop() ? W - dw : 0;
  const y = desktop() ? 0 : H - dh;
  return [x / W, y / H, dw / W, dh / H];
}

function textureFor(i: number, ctx: GalleryCtx): Promise<Texture> {
  const st = state!;
  const tex = st.textures[i];
  const img = ctx.images[i];
  img.loading = 'eager';
  return img.decode().then(() => {
    if (tex.image !== img) tex.image = img;
    return tex;
  }, () => tex);
}

function draw() {
  state?.renderer.render({ scene: state.mesh });
}

function resize(ctx: GalleryCtx, a: number, b: number) {
  if (!state) return;
  const { width, height } = ctx.stage.getBoundingClientRect();
  state.renderer.setSize(width, height);
  state.program.uniforms.rA.value = rectFor(ctx, a);
  state.program.uniforms.rB.value = rectFor(ctx, b);
  draw();
}

export const webgl: GalleryVariant = {
  async mount(ctx, index) {
    let renderer: Renderer;
    try {
      renderer = new Renderer({ dpr: Math.min(2, window.devicePixelRatio), alpha: true, premultipliedAlpha: false });
      if (!renderer.gl) throw new Error('no webgl');
    } catch {
      fallback = true;
      return rullo.mount(ctx, index);
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    Object.assign(gl.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    ctx.stage.append(gl.canvas);
    const textures = ctx.images.map(() => new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR }));
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      uniforms: {
        tA: { value: textures[index] },
        tB: { value: textures[index] },
        rA: { value: [0, 0, 1, 1] },
        rB: { value: [0, 0, 1, 1] },
        uProgress: { value: 0 },
        uDir: { value: 1 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    let current = index;
    const ro = new ResizeObserver(() => resize(ctx, current, current));
    state = { renderer, program, mesh, textures, ro };
    (state as State & { setCurrent?: (i: number) => void }).setCurrent = (i) => (current = i);
    // le foto restano nell'HTML (SEO, accessibilità) ma le disegna il canvas
    gsap.set(ctx.slides, { autoAlpha: 0 });
    await textureFor(index, ctx);
    ro.observe(ctx.stage);
    resize(ctx, index, index);
  },
  async go(ctx, from, to, dir) {
    if (fallback || !state) return rullo.go(ctx, from, to, dir);
    const st = state as State & { setCurrent?: (i: number) => void };
    const u = st.program.uniforms;
    const [a, b] = await Promise.all([textureFor(from, ctx), textureFor(to, ctx)]);
    u.tA.value = a;
    u.tB.value = b;
    u.rA.value = rectFor(ctx, from);
    u.rB.value = rectFor(ctx, to);
    u.uDir.value = dir;
    await new Promise<void>((resolve) => {
      gsap.fromTo(u.uProgress, { value: 0 }, { value: 1, duration: DURATION * 1.1, ease: EASE, onUpdate: draw, onComplete: resolve });
    });
    u.tA.value = b;
    u.rA.value = u.rB.value;
    u.uProgress.value = 0;
    st.setCurrent?.(to);
    draw();
  },
  destroy() {
    state?.ro.disconnect();
    state?.renderer.gl.canvas.remove();
    state = null;
  },
};
