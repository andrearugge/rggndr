import { gsap, fontsReady, prefersReducedMotion } from './motion';
import { setup, buildRullo, closeUp } from './monogram';

/** Chiave di sessione: il loader si vede solo alla prima pagina della sessione (D3). */
export const LOADER_SEEN_KEY = 'rggndr:loader-seen';

interface LoaderOptions {
  /** Chiamata quando l'hero deve iniziare ad animarsi (sovrapposta all'uscita del pannello). */
  onHandoff?: () => void;
}

/** Ricorda che il loader è già partito. Se lo storage non è disponibile, il loader riparte: va bene così. */
function markSeen() {
  try {
    sessionStorage.setItem(LOADER_SEEN_KEY, '1');
  } catch {
    /* navigazione privata o storage bloccato */
  }
}

/**
 * Loader della prima visita: RUGGERI ANDREA diventa RGGNDR (Rullo, compatto), il monogramma e il
 * sottotitolo sfumano, poi il pannello sale e lascia la pagina all'hero.
 */
export async function playLoader(el: HTMLElement, { onHandoff }: LoaderOptions = {}): Promise<void> {
  const html = document.documentElement;
  const finish = () => {
    el.remove();
    html.style.overflow = '';
  };

  // già visto in questa sessione (lo script nel <head> lo ha nascosto prima del primo frame) o movimento ridotto
  if (html.classList.contains('loader-seen') || prefersReducedMotion()) {
    finish();
    onHandoff?.();
    return;
  }

  markSeen();
  html.style.overflow = 'hidden';
  el.style.animation = 'none'; // il paracadute CSS non serve più: JS è partito

  // Le lettere si misurano col font finale (Compact), altrimenti maschere e larghezze sono sbagliate.
  await fontsReady(800);

  const name = el.querySelector<HTMLElement>('[data-loader-name]')!;
  const sub = el.querySelector<HTMLElement>('[data-loader-sub]')!;
  const panel = el.querySelector<HTMLElement>('[data-loader-panel]')!;

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        finish();
        resolve();
      },
    });

    // 1. Il nome emerge dalla sfocatura
    tl.to([name, sub], { opacity: 1, filter: 'blur(0px)', duration: 0.5, stagger: 0.06 }, 0.1);

    // 2. RUGGERI ANDREA → RGGNDR, compatto
    const c = setup(el);
    let end = closeUp(tl, c, buildRullo(tl, c) + 0.05);

    // 3. RGGNDR e il sottotitolo sfumano insieme dopo una breve pausa sul monogramma
    tl.to([name, sub], { opacity: 0, filter: 'blur(5px)', duration: 0.4, ease: 'power2.in' }, end + 0.2);
    end += 0.6;

    // 4. Il pannello sale mentre la dissolvenza si chiude, e l'hero parte
    const panelAt = end - 0.25;
    tl.to(panel, { y: () => -window.innerHeight - 2, duration: 1, ease: 'power3.inOut' }, panelAt);
    tl.add(() => onHandoff?.(), panelAt + 0.3);
  });
}
