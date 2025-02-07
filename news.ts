// news.ts
import { Eta } from "https://deno.land/x/eta@v2.0.0/mod.ts";

// Initialize Eta with the correct views directory
const eta = new Eta({ views: Deno.cwd() + "/templates" }); // Adjust path as needed

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

  // Render the template with the article data
  const html = await eta.render("article", { article });
  return c.html(html);
}