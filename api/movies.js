module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server missing TMDB_API_KEY" });
  }

  const { q, genre, id, page } = req.query;
  const pageNum = Math.min(Math.max(parseInt(page, 10) || 1, 1), 500);

  let targetUrl = `https://api.themoviedb.org/3/movie/popular?language=en-US&page=${pageNum}`;

  if (id && /^\d+$/.test(id)) {
    targetUrl = `https://api.themoviedb.org/3/movie/${id}?language=en-US`;
  } else if (q && q.trim()) {
    targetUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(q.trim())}&language=en-US&include_adult=false&page=${pageNum}`;
  } else if (genre && /^\d+$/.test(genre)) {
    targetUrl = `https://api.themoviedb.org/3/discover/movie?with_genres=${genre}&sort_by=popularity.desc&vote_count.gte=200&language=en-US&page=${pageNum}`;
  }

  const headers = { Accept: "application/json" };
  let requestUrl = targetUrl;

  // Supports both TMDB v4 Bearer Token and v3 API Key
  if (apiKey.length > 40) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    requestUrl += `&api_key=${encodeURIComponent(apiKey)}`;
  }

  try {
    const response = await fetch(requestUrl, { headers });
    if (!response.ok) {
      return res.status(response.status).json({ error: "TMDB request failed" });
    }

    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Failed to reach TMDB API" });
  }
};
