use maudit::route::prelude::*;

use crate::content::PageContent;
use crate::layout::{layout, PageMeta};

#[route("/reading")]
pub struct Reading;

impl Route for Reading {
    fn render(&self, ctx: &mut PageContext) -> impl Into<RenderResult> {
        let pages = ctx.content::<PageContent>("pages");
        let page = pages.get_entry("reading");
        let data = page.data(ctx);
        let base_url = ctx.base_url.clone().unwrap_or_default();

        let title = data.title.clone();
        let description = data.meta_description.clone().unwrap_or_default();

        let rendered = page.render(ctx);

        layout(
            ctx,
            PageMeta {
                title,
                description,
                url: "/reading".to_string(),
                base_url,
                ..Default::default()
            },
            &rendered,
        )
    }
}
