export type Theme = "light" | "dark";
export const DEFAULT_THEME: Theme = "dark";
export const THEME_COOKIE = "flexirova-theme";
export const THEME_STORAGE_KEY = "flexirova-theme";
export const THEME_EVENT = "flexirova-theme-change";
export function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}
export function resolveTheme(cookie: unknown, stored: unknown): Theme {
  return parseTheme(cookie) ?? parseTheme(stored) ?? DEFAULT_THEME;
}
// Static application code only. Runs in <head> before the browser can paint the page.
// The cookie gives SSR the same preference; localStorage supports existing installations.
export const THEME_BOOTSTRAP = `(()=>{const root=document.documentElement;const match=document.cookie.match(/(?:^|; )flexirova-theme=([^;]*)/);let value=match?.[1];if(value!=="light"&&value!=="dark"){try{value=localStorage.getItem("flexirova-theme")}catch{}}const theme=value==="light"?"light":"dark";root.dataset.theme=theme;root.style.colorScheme=theme;try{document.cookie="flexirova-theme="+theme+"; Path=/; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"")}catch{}})();`;
