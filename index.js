const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

// =========================================================================
// CONFIGURACIÓN INICIAL
// =========================================================================
const TMDB_API_KEY = "7149c050508f704b3af18ad56a4c0908"; 
const IDIOMA = "es-MX"; // Español Latino

// Map de IDs de géneros en TMDB
const GENRES_MAP = {
    "Terror": 27,
    "Comedia": 35
};

// =========================================================================
// 1. MANIFIESTO DEL ADDON
// =========================================================================
const manifest = {
  id: "org.sinopsis.latino",
  version: "1.0.0",
  name: "Sinopsis Latino",
  description: "Catálogo de películas en español latino",
  resources: ["catalog", "stream"],
  types: ["movie"],
  idPrefixes: ["tt"],
  catalogs: [
    {
      type: "movie",
      id: "comedia_latino",
      name: "Películas de Comedia",
      extra: [
        {
          name: "genre",
          options: ["Comedia", "Terror", "Acción", "Drama", "Ciencia Ficción", "Animación", "Romance", "Suspenso"],
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
          options: ["Comedia", "Terror", "Acción", "Drama", "Ciencia Ficción", "Animación", "Romance", "Suspenso"],
          isRequired: false
        }
      ]
    }
  ]
};

const builder = new addonBuilder(manifest);

// =========================================================================
// 2. MANEJADOR DE CATÁLOGO Y BÚSQUEDA
// =========================================================================
// Importamos el SDK de Stremio
var stremioSdk = require("stremio-addon-sdk");
var addonBuilder = stremioSdk.addonBuilder;

// Creamos la instancia del add-on usando el manifest
var builder = new addonBuilder(manifest);

// Definimos la función que maneja la entrega del catálogo
builder.defineCatalogHandler(function (args) {
  return new Promise(function (resolve) {
    var peliculas = [];
    var idDelCatalogo = args.id; // Puede ser "comedia_latino" o "terror_latino"
    var extra = args.extra;     // Contiene los filtros seleccionados por el usuario

    // 1. Verificamos cuál catálogo solicitó la interfaz de Stremio
    if (idDelCatalogo === "comedia_latino") {
      peliculas = obtenerPeliculasPorGenero("Comedia");
    } else if (idDelCatalogo === "terror_latino") {
      peliculas = obtenerPeliculasPorGenero("Terror");
    }

    // 2. Si el usuario seleccionó un género en el menú desplegable, filtramos la lista
    if (extra && extra.genre) {
      var generoBuscado = extra.genre;

      peliculas = peliculas.filter(function (pelicula) {
        // Comprueba si el género buscado está en el arreglo de géneros de la película
        return pelicula.genres.includes(generoBuscado);
      });
    }

    // 3. Enviamos la respuesta final a Stremio
    resolve({ metas: peliculas });
  });
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
