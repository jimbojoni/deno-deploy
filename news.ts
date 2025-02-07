export async function displayArticle(c) {
  const news = [
    { id: "1", title: "Breaking News", content: "This is a breaking news article." },
    { id: "2", title: "Tech Update", content: "Latest updates from the tech world." },
  ];

  const articleId = c.req.param("article_id");
  const article = news.find((n) => n.id === articleId);

  if (!article) {
    return c.text("Article not found", 404);
  }

  const html = await eta.renderFile("article", { article });
  return c.html(html);
}