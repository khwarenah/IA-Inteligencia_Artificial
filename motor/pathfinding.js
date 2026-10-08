// pathfinding.js
// Envoltorio sobre la librería easystarjs (A*) para usarla con nuestro Mapa.
// Librería: https://github.com/prettymuchbryce/easystarjs
// Se importa desde CDN (esm.sh) porque el proyecto no usa npm/bundler.
import EasyStar from 'https://esm.sh/easystarjs';

const easystar = new EasyStar.js();

// Todas las casillas del mapa son transitables por ahora
// (TIPO_CASILLA.VACIA = 0, BASE_ESPEJO = 1, FRAGMENTO = 2 — ver mapa.js).
// Si más adelante agregas muros, simplemente no incluyas ese valor aquí.
easystar.setAcceptableTiles([0, 1, 2]);

// enableSync() hace que calculate() se ejecute de forma inmediata/síncrona
// en vez de asíncrona. Es más simple de integrar en un ciclo por turnos
// como el de este proyecto (setInterval en main.js).
easystar.enableSync();

/**
 * Calcula la ruta más corta entre "origen" y "destino" usando A*.
 * @param {Object} mapa - instancia de Mapa (usa mapa.grid).
 * @param {{x:number, y:number}} origen
 * @param {{x:number, y:number}} destino
 * @returns {Array<{x:number, y:number}>|null} ruta completa (incluye origen y destino)
 *          o null si no existe camino.
 */
export function calcularRuta(mapa, origen, destino) {
    easystar.setGrid(mapa.grid);

    let rutaEncontrada = null;

    easystar.findPath(origen.x, origen.y, destino.x, destino.y, (ruta) => {
        rutaEncontrada = ruta; // gracias a enableSync(), esto corre antes de que calculate() retorne
    });

    easystar.calculate();

    return rutaEncontrada;
}
