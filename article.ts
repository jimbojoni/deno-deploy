import * as eta from "https://deno.land/x/eta@v2.0.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLOUD_NAME = "dlcgyiaqo";
const UPLOAD_PRESET = "deno-deploy";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

eta.configure({ views: "./html" });


export async function displayArticle(c) {
  const articleId = c.req.param("article_id");

  // Get current article
  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .single();

  if (error || !article) {
    return c.text("Article not found", 404);
  }

  // Get previous and next articles based on created_at
  const { data: prevArticle } = await supabase
    .from("articles")
    .select("id")
    .lt("created_at", article.created_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: nextArticle } = await supabase
    .from("articles")
    .select("id")
    .gt("created_at", article.created_at)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const html = await eta.renderFile("article.html", {
    article,
    prevArticle,
    nextArticle,
  });

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

/*export async function postArticle(c){
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
}*/

export async function postArticle(c) {
  const body = await c.req.parseBody();
  const { title, content } = body;
  const image = body.image; // File upload

  if (!title || !content) {
    return c.text("Title and content are required!", 400);
  }

  let imageUrl = null;
	const images = [];

  // Handle image upload if provided
  if (image && image instanceof File) {
    const formData = new FormData();
    formData.append("file", image);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.secure_url) {
      imageUrl = result.secure_url;
			images.push(imageUrl);
    } else {
      console.error("Cloudinary upload failed:", result);
      return c.text("Failed to upload image", 500);
    }
  }

  // Insert into Supabase
  const { data, error } = await supabase
    .from("articles")
    .insert([{ title, content, images: images }]);

  if (error) {
    console.error(error);
    return c.text("Failed to save article", 500);
  }

  return c.redirect("/");
}