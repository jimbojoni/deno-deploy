import * as eta from "https://deno.land/x/eta@v2.0.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked";
//import DOMPurify from "https://esm.sh/dompurify@3.0.8";
import * as ammonia from "https://deno.land/x/ammonia@0.3.1/mod.ts"
import { getCookie } from "https://deno.land/x/hono@v4.3.11/helper.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLOUD_NAME = "dlcgyiaqo";
const UPLOAD_PRESET = "deno-deploy";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

eta.configure({ views: "./html" });
await ammonia.init();

export async function displayArticle(c) {
  const articleId = c.req.param("article_id");

  // Fetch the article
  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .single();

  if (error || !article) {
    return c.text("Article not found", 404);
  }

	// Convert Markdown to HTML
	const articleContentHtml = ammonia.clean(marked.parse(article.content));
	//const articleContentHtml = DOMPurify.sanitize(marked.parse(article.content));
	//const articleContentHtml = article.content;
	//console.log(articleContentHtml);
  // Fetch newer and older articles
  const { data: newerArticle } = await supabase
    .from("articles")
    .select("id")
    .gt("created_at", article.created_at)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const { data: olderArticle } = await supabase
    .from("articles")
    .select("id")
    .lt("created_at", article.created_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Render Eta template
  const html = await eta.renderFile("article.html", {
    article: { ...article, content: articleContentHtml }, // Pass HTML content
    newerArticle,
    olderArticle,
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
	
	const sanitizedArticles = articles.map(article => ({
		...article,
		content: article.content,
	}));

  const html = await eta.renderFile("index.html", {
    articles: sanitizedArticles,
    currentPage: page,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  });

  return c.html(html);
}

export async function postArticle(c) {
  // Attempt to retrieve the JWT from cookies
	const jwtToken = getCookie(c, "jwt");
  let author = "anonymous";

  if (jwtToken) {
    try {
      // Use the imported key function
      const key = await importKey(["verify"]);
      const payload = await verify(jwtToken, key);
      author = payload.name || payload.user || "anonymous";
    } catch (error) {
      console.error("JWT verification failed:", error);
    }
  }

  // Parse form data from the article submission form
  const formData = await c.req.formData();
  const title = formData.get("title") as string;
  // Sanitize the markdown content before storing it
  const content = ammonia.clean(formData.get("content") as string);
  //const images = formData.getAll("images") as File[]; // Get all uploaded files
	const imagesRaw = formData.getAll("images");
	const inputCategory = formData.get("category") as string | null;
	const category = inputCategory && inputCategory.trim() !== "" ? inputCategory : "Umum";
	const tagsInput = formData.get("tags") as string | null;

	// Validate category (required field)
	if (!category) {
		return c.text("Category is required!", 400);
	}

	// Process tags (optional field)
	const tags = tagsInput
		? tagsInput
				.split(",")
				.map(tag => tag.trim())
				.filter(tag => tag.length > 0) // Remove empty tags
		: []; // Default to empty array if no tags are provided

  // Validate required fields
  if (!title || !content) {
    return c.text("Title and content are required!", 400);
  }
	
	// First, validate each item:
	// If the item is a non-empty string and not a File, then it's an error.
	for (const image of imagesRaw) {
		if (typeof image === "string" && image.trim() !== "") {
			return c.text("Invalid image file format", 400);
		}
	}

	// Now filter out empty values (or non-File values)
	const images = imagesRaw.filter((item): item is File => item instanceof File);
  // Validate image count
  if (images.length > 5) {
    return c.text("Maximum 5 images allowed", 400);
  }

  try {
    // Upload all images in parallel
    const uploadPromises = images.map(async (image) => {
      const uploadFormData = new FormData();
      uploadFormData.append("file", image);
      uploadFormData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${response.status}`);
      }

      const result = await response.json();
      if (!result.secure_url) {
        throw new Error("Cloudinary didn't return URL");
      }
      return result.secure_url;
    });

    const imagesUrls = await Promise.all(uploadPromises);

    // Save to the database, including the "author" field
    const { error } = await supabase
      .from("articles")
      .insert([{ 
        title, 
        content, 
        images: imagesUrls,
        author, // Will be either the verified user name or "anonymous"
				category,
				tags,
      }]);

    if (error) {
      console.error(error);
      return c.text("Failed to save article", 500);
    }

    return c.redirect("/");
  } catch (error) {
    console.error("Image upload failed:", error);
    return c.text("Failed to upload one or more images", 500);
  }
}

export async function renderCreateArticle (c) {
  const { data: categories, error } = await supabase
    .from("article_category")
    .select("category");

  if (error) {
    console.error("Error fetching categories:", error);
    return c.text("Failed to load categories", 500);
  }

  const html = await eta.renderFile("create-article.html", { categories });

  return c.html(html);
}

async function importKey(usages: KeyUsage[]): Promise<CryptoKey> {
  // Get secret from environment variables
  const secret = Deno.env.get("SECRET_KEY");
  if (!secret) throw new Error("SECRET_KEY environment variable not set");

  // For HMAC-SHA256 JWT (common use case)
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages
  );
}