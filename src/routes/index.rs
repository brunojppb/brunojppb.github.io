use maud::html;
use maudit::route::prelude::*;

use crate::content::ArticleContent;
use crate::layout::{layout, PageMeta};
use crate::routes::article::ArticleParams;

#[route("/")]
pub struct Index;

impl Route for Index {
    fn render(&self, ctx: &mut PageContext) -> impl Into<RenderResult> {
        let articles = ctx.content::<ArticleContent>("articles");
        let base_url = ctx.base_url.clone().unwrap_or_default();

        let mut article_list: Vec<_> = articles
            .entries()
            .map(|entry| {
                let data = entry.data(ctx);
                (
                    entry.id.clone(),
                    data.title.clone(),
                    data.meta_description.clone().unwrap_or_default(),
                    data.date.clone(),
                )
            })
            .collect();

        // Sort by date descending (newest first)
        article_list.sort_by(|a, b| b.3.cmp(&a.3));

        let content = html! {
            div class="entries-container" {
                div class="entries-center-wrapper" {
                    @for (id, title, desc, date) in &article_list {
                        div class="entry-item" {
                            h2 {
                                a href=(crate::routes::Article.url(ArticleParams { slug: id.clone() })) {
                                    (title)
                                }
                            }
                            p class="desc" { (desc) }
                            span class="publish-date" { (format_date(date)) }
                        }
                    }
                }
            }
        }
        .into_string();

        layout(
            ctx,
            PageMeta {
                title: "bpaulino.com".to_string(),
                image: "/assets/images/home_cover.jpg".to_string(),
                url: "/".to_string(),
                base_url,
                ..Default::default()
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
