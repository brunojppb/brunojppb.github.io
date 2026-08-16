// Every distinct template on the site. Shared by layout.spec.ts's overflow
// sweep and caret.spec.ts's single-caret sweep so a route added to one
// cannot silently drop out of the other's coverage.
export const ROUTES = [
  '/entries/distributed-lock-in-node-js/', // 25k, the longest
  '/entries/modern-webapps-with-elixir-phoenix-typescript-react/', // 23k
  '/entries/https-for-your-homelab/', // 20k
  '/',
  '/posts/',
  '/tags/leadership/',
  '/about/',
  '/courses/',
  '/reading/',
  '/src/',
  '/system/',
  '/404',
];
