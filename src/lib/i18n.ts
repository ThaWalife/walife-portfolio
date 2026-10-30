import site from '../content/site.json';

export type Lang = 'it' | 'en';
export type PageKey = 'home' | 'archive' | 'about' | 'contact' | 'privacy';

export const routes: Record<PageKey, Record<Lang, string>> = {
  home: { it: '', en: 'en/' },
  archive: { it: 'archivio/', en: 'en/archive/' },
  about: { it: 'chi-sono/', en: 'en/about/' },
  contact: { it: 'contatti/', en: 'en/contact/' },
  privacy: { it: 'privacy/', en: 'en/privacy/' },
};

export const dict = site.DICT as unknown as Record<Lang, Record<string, any>>;

// Stringhe del nuovo sito che il data.js del sito attuale non ha.
const extra: Record<Lang, Record<string, string>> = {
  it: {
    navArchive: 'Archivio',
    navContact: 'Contatti',
    contactTitle: 'Contattami',
    tagline: 'Brand identity, poster per eventi, merch e mondi virtuali.',
    open: 'Apri i progetti',
    openProject: 'Apri progetto',
    theme: 'Cambia tema',
    lang: 'Lingua',
    skip: 'Vai al contenuto',
    sound: 'Suono',
    fPages: 'Pagine',
    fChannels: 'Canali',
    fInfo: 'Info',
    heroH: 'Ciao, sono Walife',
    aboutTitle: 'Chi sono',
    projectsTitle: 'Progetti',
    privacy: 'Privacy e condizioni',
    drag: 'Scorri',
    featured: '02 / In primo piano',
    contactIntro: 'Scrivimi, rispondo volentieri.',
    channels: 'Canali',
    mailMe: 'Scrivimi una mail',
    docTitleArchive: 'Archivio progetti – Walife',
    docTitleAbout: 'Chi sono – Federico, graphic designer | Walife',
    docTitleContact: 'Contattami – Walife',
    docDescContact: 'Contatta Walife (Federico Marini): email, Discord, TikTok e Bluesky.',
    home: 'Home',
  },
  en: {
    navArchive: 'Archive',
    navContact: 'Contact',
    contactTitle: 'Contact me',
    tagline: 'Brand identity, event posters, merch and virtual worlds.',
    open: 'Open the projects',
    openProject: 'Open project',
    theme: 'Toggle theme',
    lang: 'Language',
    skip: 'Skip to content',
    sound: 'Sound',
    fPages: 'Pages',
    fChannels: 'Channels',
    fInfo: 'Info',
    heroH: 'Hi, i’m Walife',
    aboutTitle: 'About me',
    projectsTitle: 'Projects',
    privacy: 'Privacy and terms',
    drag: 'Scroll',
    featured: '02 / Featured',
    contactIntro: 'Write to me, I’m happy to reply.',
    channels: 'Channels',
    mailMe: 'Send me an email',
    docTitleArchive: 'Project archive – Walife',
    docTitleAbout: 'About – Federico, graphic designer | Walife',
    docTitleContact: 'Contact me – Walife',
    docDescContact: 'Get in touch with Walife (Federico Marini): email, Discord, TikTok and Bluesky.',
    home: 'Home',
  },
};

export const t = (lang: Lang, key: string): string => (extra[lang][key] ?? dict[lang][key] ?? key) as string;

/** Il titolo di un progetto può essere stringa o {it,en}. */
export const loc = (v: string | { it: string; en: string }, lang: Lang) => (typeof v === 'string' ? v : v[lang]);
