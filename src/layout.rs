use maud::{html, Markup, PreEscaped, DOCTYPE};
use maudit::route::prelude::*;

pub struct PageMeta {
    pub title: String,
    pub description: String,
    pub keywords: String,
    pub image: String,
    pub url: String,
    pub base_url: String,
    pub is_post: bool,
}

impl Default for PageMeta {
    fn default() -> Self {
        Self {
            title: "bpaulino.com".to_string(),
            description: "I am a software engineer. Here I blog about programming and life experiences.".to_string(),
            keywords: "programming,development,web,javascript,backend,scala,frontend,ios,api,rest".to_string(),
            image: "/assets/images/bpaulino.jpg".to_string(),
            url: "https://bpaulino.com".to_string(),
            base_url: "https://bpaulino.com".to_string(),
            is_post: false,
        }
    }
}

pub fn layout(ctx: &mut PageContext, meta: PageMeta, content: &str) -> Markup {
    // Register CSS and JS assets
    let style_url = ctx
        .assets
        .add_style("data/style.css")
        .map(|s| s.url().to_string())
        .unwrap_or_else(|e| {
            eprintln!("Warning: could not load style.css: {}", e);
            "/style.css".to_string()
        });
    let script_url = ctx
        .assets
        .add_script("data/blog.js")
        .map(|s| s.url().to_string())
        .unwrap_or_else(|e| {
            eprintln!("Warning: could not load blog.js: {}", e);
            "/blog.js".to_string()
        });

    let domain = meta.base_url.replace("https://", "").replace("http://", "");
    let absolute_url = format!("{}{}", meta.base_url, meta.url);
    let meta_image = if meta.image.starts_with("http") {
        meta.image.clone()
    } else {
        format!("{}{}", meta.base_url, meta.image)
    };

    html! {
        (DOCTYPE)
        html lang="en" {
            head {
                meta charset="utf-8";
                meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no";
                meta name="author" content="Bruno Paulino";
                meta name="description" content=(meta.description);
                meta name="keywords" content=(meta.keywords);
                meta name="theme-color" content="#21364B";

                // Open Graph
                meta property="og:type" content="website";
                meta property="og:url" content=(absolute_url);
                meta property="og:title" content=(meta.title);
                meta property="og:description" content=(meta.description);
                meta property="og:image" content=(meta_image);

                // Twitter Card
                meta name="twitter:card" content="summary_large_image";
                meta name="twitter:domain" content=(domain);
                meta name="twitter:title" content=(meta.title);
                meta name="twitter:description" content=(meta.description);
                meta name="twitter:image" content=(meta_image);
                meta name="twitter:url" content=(absolute_url);
                meta name="twitter:creator" content="@bpaulino0";
                meta name="twitter:label1" content="Created by";
                meta name="twitter:data1" content="Bruno Paulino";
                meta name="twitter:label2" content="Twitter";
                meta name="twitter:data2" content="@bpaulino0";

                link rel="shortcut icon" href="/assets/favicon/favicon.ico";
                link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/apple-touch-icon.png";
                link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon/favicon-32x32.png";
                link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon/favicon-16x16.png";
                link rel="alternate" type="application/rss+xml" title="bpaulino.com RSS Feed" href="/feed.xml";

                title { (meta.title) }

                link href="https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400;1,600;1,700;1,800&display=swap" rel="stylesheet";
                link rel="stylesheet" href=(style_url);
            }
            body {
                div role="main" class="main-container" {
                    (header())
                    div class="flex-wrapper" {
                        div class="max-width-wrapper" {
                            (PreEscaped(content))
                        }
                    }
                    (footer())
                }

                // Full-screen image overlay
                div class="fullscreen-overlay" style="display: none;" {
                    button class="close-overlay" { "close" }
                }

                // Night/Light mode switch
                button id="theme-switcher"
                    aria-label="Toggle theme"
                    title="Toggle theme"
                    data-light-asset="/assets/images/sun.svg"
                    data-dark-asset="/assets/images/moon.svg" {}

                // Blog scripts
                script src=(script_url) {}

                // GoatCounter analytics
                script data-goatcounter="https://bpaulino.goatcounter.com/count" async src="//gc.zgo.at/count.js" {}

                @if meta.is_post {
                    div id="progress-bar" {}
                }
            }
        }
    }
}

fn header() -> Markup {
    html! {
        div class="main-header" {
            a href="/" {
                h2 { "bpaulino.com" }
            }
            p {
                "Hi, I am Bruno Paulino."
                br;
                "Software is my craft."
            }
            nav {
                a href="/" { "Blog" }
                a href="/about" { "About" }
                a href="/open-source" { "Open-source" }
                a href="/courses" { "Courses" }
                a href="/reading" { "Reading" }
            }
            canvas class="particles-canvas" {}
        }
    }
}

fn footer() -> Markup {
    html! {
        footer class="main-footer fixed-bottom" {
            div class="follow-container" {
                p {
                    "Get in touch via "
                    a href="https://twitter.com/bpaulino0" { "Twitter" }
                    " / follow my "
                    a href="/feed.xml" { "RSS Feed." }
                }
                span {
                    "© 2022 Bruno Paulino | "
                    a style="font-size: 12px;" href="https://github.com/brunojppb/brunojppb.github.io" { "This website is open-source" }
                }
            }
        }
    }
}
