use maud::html;
use maudit::route::prelude::*;

use crate::content::ArticleContent;
use crate::layout::{layout, PageMeta};

#[route("/entries/[slug]")]
pub struct Article;

#[derive(Params, Clone)]
pub struct ArticleParams {
    pub slug: String,
}

impl Route<ArticleParams> for Article {
    fn pages(&self, ctx: &mut DynamicRouteContext) -> Pages<ArticleParams> {
        let articles = ctx.content::<ArticleContent>("articles");
        articles.into_pages(|entry| {
            Page::from_params(ArticleParams {
                slug: entry.id.clone(),
            })
        })
    }

    fn render(&self, ctx: &mut PageContext) -> impl Into<RenderResult> {
        let params = ctx.params::<ArticleParams>();
        let articles = ctx.content::<ArticleContent>("articles");
        let article = articles.get_entry(&params.slug);
        let data = article.data(ctx);
        let base_url = ctx.base_url.clone().unwrap_or_default();

        let title = data.title.clone();
        let description = data
            .meta_description
            .clone()
            .unwrap_or_else(|| "I am a software engineer. Here I blog about programming and life experiences.".to_string());
        let keywords = data
            .keywords
            .clone()
            .unwrap_or_else(|| "programming,development,web".to_string());
        let image = data
            .meta_image
            .clone()
            .unwrap_or_else(|| "/assets/images/bpaulino.jpg".to_string());
        let date = data.date.clone();

        let rendered = article.render(ctx);

        let content = html! {
            div class="entry-container" {
                article class="entry" {
                    h1 class="entry-title" { (title) }
                    div style="text-align: center; font-style: italic;" { (format_date(&date)) }
                    (maud::PreEscaped(&rendered))
                }
            }
        }
        .into_string();

        layout(
            ctx,
            PageMeta {
                title,
                description,
                keywords,
                image,
                url: format!("/entries/{}", params.slug),
                base_url,
                is_post: true,
            },
            &content,
        )
    }
}

fn format_date(date_str: &str) -> String {
    if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
        date.format("%B %-d, %Y").to_string()
    } else {
        date_str.to_string()
    }
}
