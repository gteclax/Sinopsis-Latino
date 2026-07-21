const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

// =========================================================================
// CONFIGURACIÓN INICIAL
// =========================================================================
const TMDB_API_KEY = "7149c050508f704b3af18ad56a4c0908"; 
const IDIOMA = "es-MX"; // Español Latino

// Map de IDs de géneros en TMDB
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

// Listado de géneros para el menú desplegable
const ALL_GENRES = Object.keys(GENRES_MAP);

// =========================================================================
// 1. MANIFIESTO DEL ADDON
// =========================================================================
const manifest = {
  id: "org.sinopsis.latino",
  version: "1.0.2", // Incrementamos la versión
  name: "Sinopsis Latino",
  description: "Catálogo de películas en español latino",
  resources: ["catalog", "meta"],
  types: ["movie"],
  idPrefixes: ["tmdb:", "tt"],
  catalogs: [
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

// Una sola instancia del builder
const builder = new addonBuilder(manifest);

// =========================================================================
// FUNCIÓN AUXILIAR: Obtener películas desde TMDB
// =========================================================================
async function obtenerPeliculasDeTMDB(genreId) {
  try {
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=${IDIOMA}&with_genres=${genreId}&sort_by=popularity.desc`;
    const response = await axios.get(url);
    
    // Mapeamos las películas al formato 'meta' que entiende Stremio
    return response.data.results.map(movie => ({
      id: `tmdb:${movie.id}`,
      type: "movie",
      name: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      description: movie.overview
    }));
  } catch (error) {
    console.error("Error al consultar TMDB:", error.message);
    return [];
  }
}

// =========================================================================
// 2. MANEJADOR DE CATÁLOGO
// =========================================================================
builder.defineCatalogHandler(async (args) => {
  let genreIdTarget = null;

  // 1. Si el usuario usó el menú desplegable de géneros
  if (args.extra && args.extra.genre && GENRES_MAP[args.extra.genre]) {
    genreIdTarget = GENRES_MAP[args.extra.genre];
  } 
  // 2. Si no seleccionó ninguno, mostramos según el catálogo de la fila principal
  else if (args.id === "comedia_latino") {
    genreIdTarget = GENRES_MAP["Comedia"];
  } else if (args.id === "terror_latino") {
    genreIdTarget = GENRES_MAP["Terror"];
  }

  if (genreIdTarget) {
    const peliculas = await obtenerPeliculasDeTMDB(genreIdTarget);
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
