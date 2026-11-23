const IMG_BASE = "https://image.tmdb.org/t/p/";

const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western"
};

let displayedMovies = [];
let activeGenre = "all";
let activeGenreLabel = "Popular Movies";
let showingWatchlist = false;
let watchlist = loadWatchlist();
let searchTimer = null;
let latestFetchId = 0;
let activeModalId = null;

let currentPage = 1;
let totalPages = 1;
let currentParams = {};
let currentTitle = "Popular Movies";

const grid = document.getElementById("cards-grid");
const statusText = document.getElementById("status-text");
const viewTitle = document.getElementById("view-title");
const searchInput = document.getElementById("search-input");
const genreBar = document.getElementById("genre-bar");
const genreBtns = document.querySelectorAll(".genre-btn");
const watchlistBtn = document.getElementById("watchlist-toggle");
const watchlistCount = document.getElementById("watchlist-count");
const modal = document.getElementById("detail-modal");
const modalContent = document.getElementById("modal-content");
const logoReset = document.getElementById("logo-reset");

const paginationEl = document.getElementById("pagination");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");

function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem("cinefinder_watchlist") || "[]");
  } catch {
    return [];
  }
}

function saveWatchlist() {
  localStorage.setItem("cinefinder_watchlist", JSON.stringify(watchlist));
  watchlistCount.textContent = watchlist.length;
}

function isInWatchlist(id) {
  return watchlist.some((item) => item.id === id);
}

function escapeHtml(str) {
  return String(str || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
}

function getGenreNames(movie) {
  if (Array.isArray(movie.genres)) {
    return movie.genres.map((g) => g.name);
  }
  if (Array.isArray(movie.genre_ids)) {
    return movie.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean);
  }
  return [];
}

function updatePagination() {
  if (showingWatchlist || totalPages <= 1) {
    paginationEl.style.display = "none";
    return;
  }

  paginationEl.style.display = "flex";
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

function renderCards(movies) {
  displayedMovies = movies;

  if (!movies || movies.length === 0) {
    grid.innerHTML = `<div class="empty-box">${
      showingWatchlist
      ? "Your watchlist is empty. Open any film to save it here."
      : "No films found. Try another search or genre."
    }</div>`;
    return;
  }

  grid.innerHTML = movies
  .map((movie) => {
    const year = movie.release_date ? movie.release_date.slice(0, 4) : "N/A";
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;
    const genres = getGenreNames(movie);
    const mainGenre = genres[0] || "Film";
    const poster = movie.poster_path ? `${IMG_BASE}w342${movie.poster_path}` : null;
    const title = escapeHtml(movie.title);

    return `
    <article class="card" data-id="${movie.id}" tabindex="0" role="button">
    <div class="poster-box">
    ${
      poster
      ? `<img src="${poster}" alt="${title}" loading="lazy" />`
      : `<div class="no-poster">No poster available</div>`
    }
    ${rating && rating !== "0.0" ? `<span class="rating-badge">★ ${rating}</span>` : ""}
    </div>
    <div class="card-body">
    <h2 class="card-title">${title}</h2>
    <p class="card-meta">${year} · ${escapeHtml(mainGenre)}</p>
    </div>
    </article>
    `;
  })
  .join("");
}

async function fetchMovies(params, titleText, page = 1) {
  const requestId = ++latestFetchId;
  currentParams = params;
  currentTitle = titleText;
  currentPage = page;

  viewTitle.textContent = titleText;
  statusText.textContent = "Loading...";

  try {
    const queryString = new URLSearchParams({ ...params, page }).toString();
    const res = await fetch(`/api/movies?${queryString}`);
    if (!res.ok) throw new Error("Proxy request failed");

    const data = await res.json();
    if (requestId !== latestFetchId) return;

    const movies = data.results || [];
    totalPages = Math.min(data.total_pages || 1, 500);

    const totalText = data.total_results ? `${data.total_results.toLocaleString()} films · ` : "";
    statusText.textContent = `${totalText}Page ${currentPage} of ${totalPages}`;

    renderCards(movies);
    updatePagination();
  } catch {
    if (requestId !== latestFetchId) return;

    totalPages = 1;
    updatePagination();
    statusText.textContent = "Could not load films";
    grid.innerHTML = `<div class="empty-box">Unable to fetch movies right now. Make sure the app is running through the /api/movies proxy.</div>`;
  }
}

function renderModalContent(movie, details = null) {
  const full = details || movie;
  const year = full.release_date ? full.release_date.slice(0, 4) : "Unknown year";
  const rating = full.vote_average ? `★ ${full.vote_average.toFixed(1)} / 10` : "Unrated";
  const runtime = full.runtime ? `${full.runtime} min` : "";
  const poster = full.poster_path ? `${IMG_BASE}w500${full.poster_path}` : null;
  const genres = getGenreNames(full);
  const saved = isInWatchlist(movie.id);
  const tmdbUrl = `https://www.themoviedb.org/movie/${movie.id}`;

  modalContent.innerHTML = `
  <div class="modal-layout">
  ${
    poster
    ? `<img class="modal-poster" src="${poster}" alt="${escapeHtml(full.title)}" />`
    : `<div class="modal-poster no-poster">No poster</div>`
  }
  <div>
  <div class="modal-top">
  <h2 id="modal-title">${escapeHtml(full.title)}</h2>
  <button type="button" class="close-btn" id="close-modal" aria-label="Close movie details">×</button>
  </div>
  <p class="modal-meta">${rating} · ${year}${runtime ? ` · ${runtime}` : ""}</p>
  <div class="modal-genres">
  ${genres.map((g) => `<span>${escapeHtml(g)}</span>`).join("")}
  </div>
  <p class="modal-summary">${escapeHtml(full.overview || "No synopsis available.")}</p>
  <div class="modal-actions">
  <button type="button" class="btn-primary ${saved ? "saved" : ""}" id="modal-save-btn">
  ${saved ? "Remove from Watchlist" : "+ Add to Watchlist"}
  </button>
  <a class="btn-link" href="${tmdbUrl}" target="_blank" rel="noopener">View on TMDB</a>
  </div>
  </div>
  </div>
  `;

  document.getElementById("close-modal").addEventListener("click", () => modal.close());

  document.getElementById("modal-save-btn").addEventListener("click", () => {
    if (isInWatchlist(movie.id)) {
      watchlist = watchlist.filter((item) => item.id !== movie.id);
    } else {
      watchlist.push(movie);
    }
    saveWatchlist();
    renderModalContent(movie, details);

    if (showingWatchlist) {
      statusText.textContent = `${watchlist.length} saved`;
      renderCards(watchlist);
    }
  });
}

async function openModal(movie) {
  activeModalId = movie.id;
  renderModalContent(movie);
  if (!modal.open) {
    modal.showModal();
  }

  try {
    const res = await fetch(`/api/movies?id=${movie.id}`);
    if (res.ok) {
      const details = await res.json();
      if (modal.open && activeModalId === movie.id) {
        renderModalContent(movie, details);
      }
    }
  } catch {
    // Keep base modal content if detail fetch fails
  }
}

// Pagination buttons
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    fetchMovies(currentParams, currentTitle, currentPage - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

nextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) {
    fetchMovies(currentParams, currentTitle, currentPage + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// Debounced live search
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  const query = e.target.value.trim();

  if (!query) {
    genreBar.style.display = "flex";
    showingWatchlist = false;
    watchlistBtn.classList.remove("active");
    const params = activeGenre === "all" ? {} : { genre: activeGenre };
    fetchMovies(params, activeGenreLabel, 1);
    return;
  }

  showingWatchlist = false;
  watchlistBtn.classList.remove("active");
  genreBar.style.display = "none";

  searchTimer = setTimeout(() => {
    fetchMovies({ q: query }, `Results for "${query}"`, 1);
  }, 350);
});

// Genre filters
genreBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    clearTimeout(searchTimer);
    activeGenre = btn.dataset.genre;
    activeGenreLabel = btn.dataset.label;
    showingWatchlist = false;
    watchlistBtn.classList.remove("active");
    searchInput.value = "";
    genreBar.style.display = "flex";

    genreBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const params = activeGenre === "all" ? {} : { genre: activeGenre };
    fetchMovies(params, activeGenreLabel, 1);
  });
});

// Watchlist toggle
watchlistBtn.addEventListener("click", () => {
  clearTimeout(searchTimer);
  showingWatchlist = !showingWatchlist;
  watchlistBtn.classList.toggle("active", showingWatchlist);
  searchInput.value = "";

  if (showingWatchlist) {
    latestFetchId++;
    genreBar.style.display = "none";
    viewTitle.textContent = "Your Watchlist";
    statusText.textContent = `${watchlist.length} saved`;
    renderCards(watchlist);
    updatePagination();
  } else {
    genreBar.style.display = "flex";
    const params = activeGenre === "all" ? {} : { genre: activeGenre };
    fetchMovies(params, activeGenreLabel, 1);
  }
});

// Logo reset
logoReset.addEventListener("click", (e) => {
  e.preventDefault();
  clearTimeout(searchTimer);
  activeGenre = "all";
  activeGenreLabel = "Popular Movies";
  searchInput.value = "";
  showingWatchlist = false;
  watchlistBtn.classList.remove("active");
  genreBar.style.display = "flex";

  genreBtns.forEach((b) => {
    b.classList.toggle("active", b.dataset.genre === "all");
  });

  fetchMovies({}, activeGenreLabel, 1);
});

// Card click + keyboard support
function handleCardOpen(card) {
  const id = Number(card.dataset.id);
  const movie = displayedMovies.find((m) => m.id === id);
  if (movie) openModal(movie);
}

grid.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) handleCardOpen(card);
});

grid.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const card = e.target.closest(".card");
    if (card) {
      e.preventDefault();
      handleCardOpen(card);
    }
  }
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.close();
});

modal.addEventListener("close", () => {
  activeModalId = null;
});

saveWatchlist();
fetchMovies({}, "Popular Movies", 1);
