use maudit::route::prelude::*;

use crate::content::ArticleContent;

#[route("/feed.xml")]
pub struct Feed;

impl Route for Feed {
    fn render(&self, ctx: &mut PageContext) -> impl Into<RenderResult> {
        let articles = ctx.content::<ArticleContent>("articles");
        let base_url = ctx.base_url.clone().unwrap_or_else(|| "https://bpaulino.com".to_string());

        let mut items: Vec<_> = articles
            .entries()
            .map(|entry| {
                let data = entry.data(ctx);
                (
                    entry.id.clone(),
                    data.title.clone(),
                    data.meta_description.clone().unwrap_or_default(),
                    data.date.clone(),
                    data.author.clone().unwrap_or_else(|| "Bruno Paulino".to_string()),
                )
            })
            .collect();

        items.sort_by(|a, b| b.3.cmp(&a.3));

        let mut xml = String::new();
        xml.push_str(r#"<?xml version="1.0" encoding="UTF-8"?>"#);
        xml.push('\n');
        xml.push_str(r#"<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">"#);
        xml.push('\n');
        xml.push_str("  <channel>\n");
        xml.push_str("    <title>bpaulino.com</title>\n");
        xml.push_str(&format!("    <link>{}</link>\n", base_url));
        xml.push_str("    <description>I am Bruno Paulino. Software is my craft.</description>\n");
        xml.push_str("    <language>en-us</language>\n");
        xml.push_str(&format!(
            "    <atom:link href=\"{}/feed.xml\" rel=\"self\" type=\"application/rss+xml\" />\n",
            base_url
        ));

        for (id, title, description, date, author) in &items {
            let link = format!("{}/entries/{}", base_url, id);
            let pub_date = format_rfc822(date);
            xml.push_str("    <item>\n");
            xml.push_str(&format!("      <title>{}</title>\n", escape_xml(&title)));
            xml.push_str(&format!("      <link>{}</link>\n", link));
            xml.push_str(&format!("      <guid>{}</guid>\n", link));
            xml.push_str(&format!(
                "      <description>{}</description>\n",
                escape_xml(&description)
            ));
            xml.push_str(&format!("      <author>{}</author>\n", escape_xml(&author)));
            xml.push_str(&format!("      <pubDate>{}</pubDate>\n", pub_date));
            xml.push_str("    </item>\n");
        }

        xml.push_str("  </channel>\n");
        xml.push_str("</rss>\n");

        xml
    }
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn format_rfc822(date_str: &str) -> String {
    if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
        let datetime = date
            .and_hms_opt(12, 0, 0)
            .unwrap();
        datetime.format("%a, %d %b %Y %H:%M:%S +0000").to_string()
    } else {
        date_str.to_string()
    }
}
