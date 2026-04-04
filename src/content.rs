use maudit::content::markdown_entry;

#[markdown_entry]
pub struct ArticleContent {
    pub title: String,
    pub date: String,
    #[serde(default)]
    pub keywords: Option<String>,
    #[serde(default)]
    pub meta_description: Option<String>,
    #[serde(default)]
    pub meta_image: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
}

#[markdown_entry]
pub struct PageContent {
    pub title: String,
    #[serde(default)]
    pub keywords: Option<String>,
    #[serde(default)]
    pub meta_description: Option<String>,
    #[serde(default)]
    pub meta_image: Option<String>,
}
