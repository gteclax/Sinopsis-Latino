const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

// =========================================================================
// CONFIGURACIÓN INICIAL
// =========================================================================
const TMDB_API_KEY = "7149c050508f704b3af18ad56a4c0908"; 
const IDIOMA = "es-MX"; // Español Latino
const NETFLIX_PROVIDER_ID = 8; // ID de Netflix en TMDB

// Mapeo de géneros de Películas (TMDB IDs)
const MOVIE_GENRES = {
  "Acción": 28,
  "Animación": 16,
  "Aventura": 12,
  "Ciencia Ficción": 878,
  "Comedia": 35,
  "Documental": 99,
  "Drama": 18,
  "Fantasía": 14,
  "Misterio": 9648,
  "Romance": 10749,
  "Suspenso": 53,
  "Terror": 27
};

// Mapeo de géneros de Series (TMDB IDs)
const TV_GENRES = {
  "Acción y Aventura": 10759,
  "Animación": 16,
  "Comedia": 35,
  "Documental": 99,
  "Drama": 18,
  "Misterio": 9648,
  "Niños": 10762,
  "Reality": 10764,
  "Sci-Fi y Fantasía": 10765,
  "Soap / Telenovelas": 10766
};

const MOVIE_GENRES_KEYS = Object.keys(MOVIE_GENRES);
const TV_GENRES_KEYS = Object.keys(TV_GENRES);

// =========================================================================
// 1. MANIFIESTO DEL ADDON
// =========================================================================
const manifest = {
  id: "org.sinopsis.latino",
  version: "1.1.0", // Actualizamos versión
  name: "Sinopsis Latino",
  description: "Catálogo de Películas, Series y Netflix en español latino",
  resources: ["catalog", "meta"],
  types: ["movie", "series"],
  idPrefixes: ["tmdb:", "tt"],
  catalogs: [
    {
      type: "movie",
      id: "sinopsis_latino_movies",
      name: "Sinopsis Latino - Películas",
      extra: [
        {
          name: "genre",
          options: MOVIE_GENRES_KEYS,
          isRequired: false
        }
      ]
    },
    {
      type: "series",
      id: "sinopsis_latino_series",
      name: "Sinopsis Latino - Series",
      extra: [
        {
          name: "genre",
          options: TV_GENRES_KEYS,
          isRequired: false
        }
      ]
    },
    {
      type: "movie",
      id: "sinopsis_netflix",
      name: "Netflix",
      extra: [
        {
          name: "genre",
          options: MOVIE_GENRES_KEYS,
          isRequired: false
        }
      ]
    }
  ]
};

const builder = new addonBuilder(manifest);

// =========================================================================
// FUNCIONES AUXILIARES: Consultas masivas a TMDB (Hasta 200 resultados)
// =========================================================================

// Obtiene Películas Populares
async function obtenerPeliculasPopulares(numPages = 10) {
  try {
    const requests = [];
    for (let page = 1; page <= numPages; page++) {
      const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=${IDIOMA}&page=${page}`;
      requests.push(axios.get(url));
    }
    const responses = await Promise.all(requests);
    let allMovies = [];
    responses.forEach(res => {
      if (res.data && res.data.results) allMovies = allMovies.concat(res.data.results);
    });

    return allMovies.map(movie => ({
      id: `tmdb:${movie.id}`,
      type: "movie",
      name: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      description: movie.overview
    }));
  } catch (error) {
    console.error("Error al obtener películas populares:", error.message);
    return [];
  }
}

// Obtiene Películas por Género
async function obtenerPeliculasPorGenero(genreId, numPages = 10) {
  try {
    const requests = [];
    for (let page = 1; page <= numPages; page++) {
      const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=${IDIOMA}&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=100&page=${page}`;
      requests.push(axios.get(url));
    }
    const responses = await Promise.all(requests);
    let allMovies = [];
    responses.forEach(res => {
      if (res.data && res.data.results) allMovies = allMovies.concat(res.data.results);
    });

    return allMovies.map(movie => ({
      id: `tmdb:${movie.id}`,
      type: "movie",
      name: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      description: movie.overview
    }));
  } catch (error) {
    console.error("Error al obtener películas por género:", error.message);
    return [];
  }
}

// Obtiene Series Populares
async function obtenerSeriesPopulares(numPages = 10) {
  try {
    const requests = [];
    for (let page = 1; page <= numPages; page++) {
      const url = `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&language=${IDIOMA}&page=${page}`;
      requests.push(axios.get(url));
    }
    const responses = await Promise.all(requests);
    let allSeries = [];
    responses.forEach(res => {
      if (res.data && res.data.results) allSeries = allSeries.concat(res.data.results);
    });

    return allSeries.map(show => ({
      id: `tmdb:${show.id}`,
      type: "series",
      name: show.name,
      poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
      description: show.overview
    }));
  } catch (error) {
    console.error("Error al obtener series populares:", error.message);
    return [];
  }
}

// Obtiene Series por Género
async function obtenerSeriesPorGenero(genreId, numPages = 10) {
  try {
    const requests = [];
    for (let page = 1; page <= numPages; page++) {
      const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=${IDIOMA}&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=50&page=${page}`;
      requests.push(axios.get(url));
    }
    const responses = await Promise.all(requests);
    let allSeries = [];
    responses.forEach(res => {
      if (res.data && res.data.results) allSeries = allSeries.concat(res.data.results);
    });

    return allSeries.map(show => ({
      id: `tmdb:${show.id}`,
      type: "series",
      name: show.name,
      poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
      description: show.overview
    }));
  } catch (error) {
    console.error("Error al obtener series por género:", error.message);
    return [];
  }
}

// Obtiene Todo el Contenido de Netflix
async function obtenerContenidoNetflix(genreId = null, numPages = 10) {
  try {
    const requests = [];
    for (let page = 1; page <= numPages; page++) {
      let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=${IDIOMA}&with_watch_providers=${NETFLIX_PROVIDER_ID}&watch_region=AR&sort_by=popularity.desc&page=${page}`;
      if (genreId) {
        url += `&with_genres=${genreId}`;
      }
      requests.push(axios.get(url));
    }
    const responses = await Promise.all(requests);
    let netflixMovies = [];
    responses.forEach(res => {
      if (res.data && res.data.results) netflixMovies = netflixMovies.concat(res.data.results);
    });

    return netflixMovies.map(movie => ({
      id: `tmdb:${movie.id}`,
      type: "movie",
      name: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      description: movie.overview
    }));
  } catch (error) {
    console.error("Error al obtener contenido de Netflix:", error.message);
    return [];
  }
}

// =========================================================================
// 2. MANEJADOR DE CATÁLOGOS
// =========================================================================
builder.defineCatalogHandler(async (args) => {
  const { type, id, extra } = args;

  // --- CATÁLOGO DE NETFLIX ---
  if (id === "sinopsis_netflix") {
    if (extra && extra.genre && MOVIE_GENRES[extra.genre]) {
      const genreId = MOVIE_GENRES[extra.genre];
      const metas = await obtenerContenidoNetflix(genreId, 10);
      return { metas };
    } else {
      const metas = await obtenerContenidoNetflix(null, 10);
      return { metas };
    }
  }

  // --- CATÁLOGO DE PELÍCULAS ---
  if (type === "movie" && id === "sinopsis_latino_movies") {
    if (extra && extra.genre && MOVIE_GENRES[extra.genre]) {
      const genreId = MOVIE_GENRES[extra.genre];
      const metas = await obtenerPeliculasPorGenero(genreId, 10);
      return { metas };
    } else {
      const metas = await obtenerPeliculasPopulares(10);
      return { metas };
    }
  }

  // --- CATÁLOGO DE SERIES ---
  if (type === "series" && id === "sinopsis_latino_series") {
    if (extra && extra.genre && TV_GENRES[extra.genre]) {
      const genreId = TV_GENRES[extra.genre];
      const metas = await obtenerSeriesPorGenero(genreId, 10);
      return { metas };
    } else {
      const metas = await obtenerSeriesPopulares(10);
      return { metas };
    }
  }

  return { metas: [] };
});

// =========================================================================
// 3. MANEJADOR DE METADATOS (DETALLES Y FICHAS)
// =========================================================================
builder.defineMetaHandler(async (args) => {
  if (args.id.startsWith("tmdb:")) {
    const tmdbId = args.id.split(":")[1];
    const isMovie = args.type === "movie";
    const endpoint = isMovie ? "movie" : "tv";

    try {
      const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=${IDIOMA}&append_to_response=external_ids`;
      const response = await axios.get(url);
      const data = response.data;

      const imdbId = data.external_ids && data.external_ids.imdb_id ? data.external_ids.imdb_id : args.id;

      return {
        meta: {
          id: args.id,
          imdb_id: imdbId,
          type: args.type,
          name: isMovie ? data.title : data.name,
          poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
          background: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
          description: data.overview || "Sin descripción disponible en español.",
          releaseInfo: isMovie ? (data.release_date ? data.release_date.substring(0, 4) : "") : (data.first_air_date ? data.first_air_date.substring(0, 4) : ""),
          genres: data.genres ? data.genres.map(g => g.name) : []
        }
      };
    } catch (error) {
      console.error("Error al obtener detalles:", error.message);
      return { meta: null };
    }
  }
  return { meta: null };
});

// =========================================================================
// 4. INICIO DEL SERVIDOR
// =========================================================================
const PORT = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Addon ejecutándose en el puerto ${PORT}`);
