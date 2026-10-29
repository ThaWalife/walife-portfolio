// Sfondo hero: mesh gradient animato (@paper-design/shaders, shader della famiglia Liquid Logo / ShaderGradient)
// con SOLO i due colori del brand: Verde #0D9E5B e Bianco #F4F4F4. Con reduced-motion resta statico (speed 0).
import { ShaderMount, meshGradientFragmentShader, getShaderColorFromString } from '@paper-design/shaders';

const HERO = ['#0d9e5b', '#0d9e5b', '#f4f4f4', '#0d9e5b', '#0d9e5b'];

export function mountHeroShader(el: HTMLElement, reduced: boolean) {
  const colors = HERO.map(getShaderColorFromString);
  const uniforms: Record<string, unknown> = {
    u_colors: colors,
    u_colorsCount: colors.length,
    u_distortion: 0.9,
    u_swirl: 0.25,
    u_grainMixer: 0,
    u_grainOverlay: 0,
    // dimensionamento: cover, nessuna rotazione
    u_fit: 2, u_scale: 1.1, u_rotation: 0, u_originX: 0.5, u_originY: 0.5, u_offsetX: 0, u_offsetY: 0, u_worldWidth: 0, u_worldHeight: 0,
  };
  return new ShaderMount(el, meshGradientFragmentShader, uniforms as never, undefined, reduced ? 0 : 0.35);
}
