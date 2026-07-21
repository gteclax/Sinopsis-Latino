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
    id: "org.sinopsislatino.official",
    version: "1.1.0",
    name: "Sinopsis Latino",
    description: "Catálogo y descripciones en Español Latino con géneros y más contenido",
    resources: ["catalog", "meta"],
    types: ["movie"],
    catalogs: [
        {
            type: "movie",
            id: "sinopsis_latino_populares",
            name: "Sinopsis Latino",
            extra: [
                { 
                    name: "genre", 
                    options: ["Todos", "Terror", "Comedia"],
                    isRequired: false 
                },
                { 
                    name: "search", 
                    isRequired: false 
                },
                {
                    name: "skip", // Permite la paginación para cargar MÁS películas al hacer scroll
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
builder.defineCatalogHandler(async (args) => {
    try {
        // Cálculo de página según el scroll de Stremio (Stremio pide de a 100 elementos)
        const skip = args.extra && args.extra.skip ? parseInt(args.extra.skip) : 0;
        const page = Math.floor(skip / 20) + 1; 

        let url = "";

        // 1. Si el usuario busca algo por texto:
        if (args.extra && args.extra.search) {
            const query = encodeURIComponent(args.extra.search);
            url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=${IDIOMA}&query=${query}&page=${page}`;
        } 
        // 2. Si el usuario selecciona un género específico (Terror o Comedia):
        else if (args.extra && args.extra.genre && GENRES_MAP[args.extra.genre]) {
            const genreId = GENRES_MAP[args.extra.genre];
            url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=${IDIOMA}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`;
        } 
        // 3. Catálogo general por defecto (Populares):
        else {
            url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=${IDIOMA}&page=${page}`;
        }

        const response = await axios.get(url);

        const metas = response.data.results.map(movie => ({
            id: `tmdb:${movie.id}`,
            type: "movie",
            name: movie.title,
            poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
            description: movie.overview || "Sin descripción disponible en español."
        }));

        return { metas };
    } catch (error) {
        console.error("Error al obtener catálogo/búsqueda:", error.message);
        return { metas: [] };
    }
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
