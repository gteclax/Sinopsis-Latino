const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

// =========================================================================
// CONFIGURACIÓN INICIAL
// =========================================================================
const TMDB_API_KEY = "7149c050508f704b3af18ad56a4c0908"; 
const IDIOMA = "es-MX"; // Español Latino
const NETFLIX_PROVIDER_ID = 8;

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
// 1. MANIFIESTO DEL ADDON (HABILITANDO BÚSQUEDAS)
// =========================================================================
const manifest = {
  id: "org.sinopsis.latino",
  version: "1.2.0", // Subimos versión
  name: "Sinopsis Latino",
  description: "Catálogo de Películas, Series y Netflix en español latino con soporte para búsquedas",
  resources: ["catalog", "meta"],
  types: ["movie", "series"],
  idPrefixes: ["tmdb:", "tt"],
  catalogs: [
    {
      type: "movie",
      id: "sinopsis_latino_movies",
      name: "Sinopsis Latino - Películas",
      extra: [
        { name: "search", isRequired: false }, // Permite búsqueda en la lupa
        { name: "genre", options: MOVIE_GENRES_KEYS, isRequired: false }
      ]
    },
    {
      type: "series",
      id: "sinopsis_latino_series",
      name: "Sinopsis Latino - Series",
      extra: [
        { name: "search", isRequired: false }, // Permite búsqueda en la lupa
        { name: "genre", options: TV_GENRES_KEYS, isRequired: false }
      ]
    },
    {
      type: "movie",
      id: "sinopsis_netflix",
      name: "Netflix",
      extra: [
        { name: "search", isRequired: false },
        { name: "genre", options: MOVIE_GENRES_KEYS, isRequired: false }
      ]
    }
  ]
};

const builder = new addonBuilder(manifest);

// =========================================================================
// FUNCIONES AUXILIARES DE CONSULTA
// =========================================================================

// Función para BÚSQUEDAS
async function buscarEnTMDB(query, type = "movie") {
  try {
    const endpoint = type === "movie" ? "movie" : "tv";
    const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_API_KEY}&language=${IDIOMA}&query=${encodeURIComponent(query)}&page=1`;
    const response = await axios.get(url);
    
    if (!response.data || !response.data.results) return [];

    return response.data.results.map(item => ({
      id: `tmdb:${item.id}`,
      type: type,
      name: type === "movie" ? item.title : item.name,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      description: item.overview
    }));
  } catch (error) {
    console.error("Error en la búsqueda:", error.message);
    return [];
  }
}

async function obtenerPeliculasPopulares(numPages = 5) {
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

async function obtenerPeliculasPorGenero(genreId, numPages = 5) {
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

async function obtenerSeriesPopulares(numPages = 5) {
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

async function obtenerSeriesPorGenero(genreId, numPages = 5) {
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

async function obtenerContenidoNetflix(genreId = null, numPages = 5) {
  try {
    const requests = [];
    for (let page = 1; page <= numPages; page++) {
      let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=${IDIOMA}&with_watch_providers=${NETFLIX_PROVIDER_ID}&watch_region=AR&sort_by=popularity.desc&page=${page}`;
      if (genreId) url += `&with_genres=${genreId}`;
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
// 2. MANEJADOR DE CATÁLOGOS Y BÚSQUEDA
// =========================================================================
builder.defineCatalogHandler(async (args) => {
  const { type, id, extra } = args;

  // 1. SI EL USUARIO HACE UNA BÚSQUEDA DESDE LA LUPA DE STREMIO
  if (extra && extra.search) {
    const metas = await buscarEnTMDB(extra.search, type);
    return { metas };
  }

  // 2. CATÁLOGO NETFLIX
  if (id === "sinopsis_netflix") {
    const genreId = extra && extra.genre ? MOVIE_GENRES[extra.genre] : null;
    const metas = await obtenerContenidoNetflix(genreId, 5);
    return { metas };
  }

  // 3. CATÁLOGO PELÍCULAS
  if (type === "movie" && id === "sinopsis_latino_movies") {
    if (extra && extra.genre && MOVIE_GENRES[extra.genre]) {
      const metas = await obtenerPeliculasPorGenero(MOVIE_GENRES[extra.genre], 5);
      return { metas };
    } else {
      const metas = await obtenerPeliculasPopulares(5);
      return { metas };
    }
  }

  // 4. CATÁLOGO SERIES
  if (type === "series" && id === "sinopsis_latino_series") {
    if (extra && extra.genre && TV_GENRES[extra.genre]) {
      const metas = await obtenerSeriesPorGenero(TV_GENRES[extra.genre], 5);
      return { metas };
    } else {
      const metas = await obtenerSeriesPopulares(5);
      return { metas };
    }
  }

  return { metas: [] };
});

// =========================================================================
// 3. MANEJADOR DE METADATOS (INCLUYE ID DE IMDB PARA TORRENTIO)
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
          id: imdbId,
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
