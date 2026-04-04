use maudit::route::prelude::*;

use crate::content::PageContent;
use crate::layout::{layout, PageMeta};

#[route("/about")]
pub struct About;

impl Route for About {
    fn render(&self, ctx: &mut PageContext) -> impl Into<RenderResult> {
        let pages = ctx.content::<PageContent>("pages");
        let page = pages.get_entry("about");
        let data = page.data(ctx);
        let base_url = ctx.base_url.clone().unwrap_or_default();

        let title = data.title.clone();
        let description = data.meta_description.clone().unwrap_or_default();
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
                image,
                url: "/about".to_string(),
                base_url,
                ..Default::default()
            },
            &rendered,
        )
    }
}
