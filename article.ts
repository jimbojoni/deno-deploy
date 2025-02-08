import * as eta from "https://deno.land/x/eta@v2.0.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

eta.configure({ views: "./html" });
export async function displayArticle(c) {
  const articleId = c.req.param("article_id");
  const { data: articles, error } = await supabase
		.from("articles")
		.select("*")
		.eq("id", articleId)
		.single(); // Ensures only one article is returned

	if (error || !articles) {
		return c.text("Article not found", 404);
	}
	console.log (JSON.stringify(article));

  if (!article) {
    return c.text("Article not found", 404);
  }

  const html = await eta.renderFile("article.html", {article});
  return c.html(html);
}

export async function displayAllArticles (c) {
  // Fetch latest articles from Supabase
  const { data: articles, error } = await supabase.from("articles").select("*");

  if (error) {
    console.error(error);
    return c.text("Failed to load articles", 500);
  }

  // Render `index.html` with updated articles
  const html = await eta.renderFile("index.html", { articles });
  return c.html(html);
}

export async function postArticle(c){
  const body = await c.req.parseBody();
  const { title, content, images } = body;

  if (!title || !content) {
    return c.text("Title and content are required!", 400);
  }

  // Convert images from comma-separated string to array
  const imageArray = images ? (images as string).split(",") : [];

  // Insert into Supabase
  const { data, error } = await supabase
    .from("articles")
    .insert([{ title, content, images: imageArray }]);

  if (error) {
    console.error(error);
    return c.text("Failed to save article", 500);
  }

  // Redirect to success page
  return c.redirect("/");
}