import * as eta from "https://deno.land/x/eta@v2.0.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

eta.configure({ views: "./html" });
export async function displayArticle(c) {
  const articleId = c.req.param("article_id");

	const { data: article, error } = await supabase
		.from("articles")
		.select("*")
		.eq("id", articleId)
		.single(); // Ensures only one article is returned

	if (error || !article) {
		return c.text("Article not found", 404);
	}

	console.log(JSON.stringify(article));

	const html = await eta.renderFile("article.html", { article });
	return c.html(html);

}

export async function displayAllArticles(c) {
  const page = Number(c.req.query("page")) || 1; // Default to page 1
  const limit = Number(c.req.query("limit")) || 5; // Default 5 articles per page

  const start = (page - 1) * limit;
  const end = start + limit - 1;

  // Fetch paginated articles from Supabase, sorted by latest first
  const { data: articles, error } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false }) // Sort newest to oldest
    .range(start, end);

  if (error) {
    console.error(error);
    return c.text("Failed to load articles", 500);
  }

  // Get total count of articles (for pagination logic)
  const { count } = await supabase
    .from("articles")
    .select("*", { count: "exact", head: true });

  const totalPages = Math.ceil(count / limit);

  const html = await eta.renderFile("index.html", {
    articles,
    currentPage: page,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  });

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