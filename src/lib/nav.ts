/**
 * The six destinations of the site, in tab order. The tab strip, the mobile
 * menu and the ⌘K palette all read this list, so none of them can drift.
 * `title` and `description` exist for the palette's PAGES rows; the tab
 * strip shows only the label.
 */
export const TABS = [
  {
    label: 'posts/',
    href: '/posts/',
    title: 'Posts',
    description: 'Every post, newest first',
  },
  {
    label: 'about.md',
    href: '/about/',
    title: 'About',
    description: 'Who I am and where my code runs',
  },
  {
    label: 'src/',
    href: '/src/',
    title: 'Open Source',
    description: 'Projects I maintain, from two Rust build cache servers to smaller tools',
  },
  {
    label: 'reading/',
    href: '/reading/',
    title: 'Reading',
    description: 'What I am reading now, and every book I finished',
  },
  {
    label: 'courses/',
    href: '/courses/',
    title: 'Courses',
    description: 'Programming courses I recorded, some of them free',
  },
  {
    label: 'system/',
    href: '/system/',
    title: 'Design system',
    description: 'CONSOLE: colour, type, components and glyphs, rendered live',
  },
] as const;
