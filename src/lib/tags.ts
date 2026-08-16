/** The 14 curated tags, ordered by post count. */
export const TAG_ORDER = [
  'leadership', 'devops', 'career', 'react', 'architecture', 'ruby',
  'typescript', 'javascript', 'security', 'scala', 'books', 'git',
  'teaching', 'homelab',
] as const;

export type Tag = (typeof TAG_ORDER)[number];

/** Post slug to curated tags. Derived from the original `keywords` front matter. */
export const TAG_MAP: Record<string, Tag[]> = {
  '1-ios-push-notifications-for-rails-developers': ['ruby'],
  '2-arquitetura-de-branching-para-desenvolvimento-com-git': ['git'],
  '3-curso-ruby-para-iniciantes': ['ruby', 'teaching'],
  '4-curso-rails-para-iniciantes': ['ruby', 'teaching'],
  '5-indo-estudar-no-exterior-eua-20142015': ['career'],
  '6-scala-101-aprendendo-programacao-funcional': ['scala'],
  '7-scala-101-funcoes': ['scala'],
  '8-why-work-visa-applications-have-to-suck': ['career'],
  '9-mythical-man-month': ['books', 'leadership'],
  '10-automating-your-work-with-github-actions': ['devops', 'git'],
  '11-rapid-prototyping-with-gatsby-js': ['react'],
  '12-dockerizing-react-apps': ['react', 'devops'],
  'hardening-your-server-security-with-fail2ban': ['security', 'devops'],
  'allowing-more-connections-on-self-hosted-gitlab': ['devops'],
  'using-custom-react-hooks-to-handle-components-external-events': ['react'],
  'devops-and-its-impact-on-developer-productivity': ['devops', 'leadership'],
  'how-to-create-bulletproof-tickets': ['leadership'],
  'replace-me-at-woom': ['career'],
  'taming-ambiguity': ['leadership'],
  'retrying-api-calls-with-exponential-backoff': ['javascript'],
  'how-to-use-redis-cluster-for-caching': ['architecture', 'javascript'],
  'modern-webapps-with-elixir-phoenix-typescript-react': ['react', 'typescript'],
  'typescript-monorepo-series-what-is-a-monorepo': ['typescript', 'architecture'],
  'distributed-lock-in-node-js': ['typescript', 'javascript', 'architecture'],
  'ask-like-your-career-depend-on-it': ['career', 'leadership'],
  'if-you-want-to-be-senior-stick-around-for-a-while': ['career'],
  'why-internal-platforms-fail': ['leadership', 'architecture'],
  'learnings-from-dare-to-lead': ['books', 'leadership'],
  'dev-previews': ['devops'],
  'https-for-your-homelab': ['security', 'homelab'],
};

/** Posts written in Brazilian Portuguese. */
export const PT_SLUGS = new Set([
  '2-arquitetura-de-branching-para-desenvolvimento-com-git',
  '3-curso-ruby-para-iniciantes',
  '4-curso-rails-para-iniciantes',
  '5-indo-estudar-no-exterior-eua-20142015',
  '6-scala-101-aprendendo-programacao-funcional',
  '7-scala-101-funcoes',
]);
