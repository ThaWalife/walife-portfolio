// BASE_URL con slash finale garantito (dipende da trailingSlash/base): ogni link/asset/redirect passa da qui.
export const ROOT = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/** path relativo alla radice del sito, senza slash iniziale: url('en/about/') */
export const url = (path = '') => ROOT + path.replace(/^\//, '');
