use maudit::route::prelude::*;

#[route("/work")]
pub struct Work;

impl Route for Work {
    fn render(&self, _ctx: &mut PageContext) -> impl Into<RenderResult> {
        redirect("/about")
    }
}
