use maudit::route::prelude::*;

use crate::content::PageContent;
use crate::layout::{layout, PageMeta};

#[route("/open-source")]
pub struct OpenSource;

impl Route for OpenSource {
    fn render(&self, ctx: &mut PageContext) -> impl Into<RenderResult> {
        let pages = ctx.content::<PageContent>("pages");
        let page = pages.get_entry("open-source");
        let data = page.data(ctx);
        let base_url = ctx.base_url.clone().unwrap_or_default();

        let title = data.title.clone();
        let description = data.meta_description.clone().unwrap_or_default();
        let keywords = data.keywords.clone().unwrap_or_default();
        let image = data
            .meta_image
            .clone()
            .unwrap_or_else(|| "/assets/images/bpaulino.jpg".to_string());

        let rendered = page.render(ctx);

        layout(
            ctx,
            PageMeta {
                title,
                description,
                keywords,
                image,
                url: "/open-source".to_string(),
                base_url,
                ..Default::default()
            },
            &rendered,
        )
    }
}
