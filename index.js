const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

// =========================================================================
// CONFIGURACIÓN INICIAL
// =========================================================================
const TMDB_API_KEY = "7149c050508f704b3af18ad56a4c0908"; 
const IDIOMA = "es-MX"; // Español Latino

const GENRES_MAP = {
  "Acción": 28,
  "Animación": 16,
  "Aventura": 12,
  "Ciencia Ficción": 878,
  "Comedia": 35,
  "Drama": 18,
  "Fantasía": 14,
  "Romance": 10749,
  "Suspenso": 53,
  "Terror": 27
};

const ALL_GENRES = Object.keys(GENRES_MAP);

// =========================================================================
// 1. MANIFIESTO DEL ADDON
// =========================================================================
const manifest = {
  id: "org.sinopsis.latino",
  version: "1.0.3", // Subimos la versión
  name: "Sinopsis Latino",
  description: "Catálogo de películas en español latino",
  resources: ["catalog", "meta"],
  types: ["movie"],
  idPrefixes: ["tmdb:", "tt"],
  catalogs: [
    {
      type: "movie",
      id: "sinopsis_latino_main",
      name: "Sinopsis Latino", // Catálogo principal general
      extra: [
        {
          name: "genre",
          options: ALL_GENRES,
          isRequired: false
        }
      ]
    },
    {
      type: "movie",
      id: "comedia_latino",
      name: "Películas de Comedia",
      extra: [
        {
          name: "genre",
          options: ALL_GENRES,
          isRequired: false
        }
      ]
    },
    {
      type: "movie",
      id: "terror_latino",
      name: "Películas de Terror",
      extra: [
        {
          name: "genre",
          options: ALL_GENRES,
          isRequired: false
        }
      ]
    }
  ]
};

const builder = new addonBuilder(manifest);

// =========================================================================
// FUNCIONES AUXILIARES: Consultas a TMDB
// =========================================================================

// Obtiene películas populares generales para la fila principal
async function obtenerPopularesTMDB() {
  try {
    const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=${IDIOMA}&page=1`;
    const response = await axios.get(url);
    
    return response.data.results.map(movie => ({
      id: `tmdb:${movie.id}`,
      type: "movie",
      name: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      description: movie.overview
    }));
  } catch (error) {
    console.error("Error al consultar populares en TMDB:", error.message);
    return [];
  }
}

// Obtiene películas filtradas por género
async function obtenerPeliculasDeTMDB(genreId) {
  try {
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=${IDIOMA}&with_genres=${genreId}&sort_by=popularity.desc`;
    const response = await axios.get(url);
    
    return response.data.results.map(movie => ({
      id: `tmdb:${movie.id}`,
      type: "movie",
      name: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      description: movie.overview
    }));
  } catch (error) {
    console.error("Error al consultar género en TMDB:", error.message);
    return [];
  }
}

// =========================================================================
// 2. MANEJADOR DE CATÁLOGO
// =========================================================================
builder.defineCatalogHandler(async (args) => {
  // 1. Si el usuario seleccionó un género específico en la lista desplegable
  if (args.extra && args.extra.genre && GENRES_MAP[args.extra.genre]) {
    const genreId = GENRES_MAP[args.extra.genre];
    const peliculas = await obtenerPeliculasDeTMDB(genreId);
    return { metas: peliculas };
  }

  // 2. Carga por defecto según la fila / catálogo
  if (args.id === "sinopsis_latino_main") {
    const peliculas = await obtenerPopularesTMDB();
    return { metas: peliculas };
  } else if (args.id === "comedia_latino") {
    const peliculas = await obtenerPeliculasDeTMDB(GENRES_MAP["Comedia"]);
    return { metas: peliculas };
  } else if (args.id === "terror_latino") {
    const peliculas = await obtenerPeliculasDeTMDB(GENRES_MAP["Terror"]);
    return { metas: peliculas };
  }

  return { metas: [] };
});

// =========================================================================
// 3. MANEJADOR DE METADATOS
// =========================================================================
builder.defineMetaHandler(async (args) => {
  if (args.type === "movie" && args.id.startsWith("tmdb:")) {
    const tmdbId = args.id.split(":")[1];

    try {
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=${IDIOMA}&append_to_response=external_ids`;
      const response = await axios.get(url);
      const movie = response.data;

      const imdbId = movie.external_ids && movie.external_ids.imdb_id ? movie.external_ids.imdb_id : args.id;

      return {
        meta: {
          id: args.id,
          imdb_id: imdbId,
          type: "movie",
          name: movie.title,
          poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
          background: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
          description: movie.overview || "Sin descripción disponible en español.",
          releaseInfo: movie.release_date ? movie.release_date.substring(0, 4) : "",
          genres: movie.genres ? movie.genres.map(g => g.name) : []
        }
      };
    } catch (error) {
      console.error("Error al obtener detalles de la película:", error.message);
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
