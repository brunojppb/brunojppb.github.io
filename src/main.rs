mod content;
mod layout;
mod routes;

use std::path::PathBuf;

use content::{ArticleContent, PageContent};
use maudit::{
    BuildOptions, BuildOutput, SitemapOptions,
    content::glob_markdown,
    content_sources, coronate, routes,
};

fn main() -> Result<BuildOutput, Box<dyn std::error::Error>> {
    coronate(
        routes![
            routes::Index,
            routes::Article,
            routes::About,
            routes::Courses,
            routes::Reading,
            routes::OpenSource,
            routes::NotFound,
            routes::Feed,
            routes::Work,
            routes::Hidden
        ],
        content_sources![
            "articles" => glob_markdown::<ArticleContent>("content/articles/*.md"),
            "pages" => glob_markdown::<PageContent>("content/pages/*.md")
        ],
        BuildOptions {
            base_url: Some("https://bpaulino.com".to_string()),
            static_dir: PathBuf::from("static"),
            sitemap: SitemapOptions {
                enabled: true,
                ..Default::default()
            },
            ..Default::default()
        },
    )
}
