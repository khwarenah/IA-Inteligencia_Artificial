// astar.js
// Implementación de A* para el grid del proyecto.
// Se recibe una función de costo externa (costoCasilla) para poder
// reutilizar el modelo de memoria/sentidos del agente (mapaMental):
// así A* planifica según lo que el agente CREE que cuesta cada casilla
// (terreno recordado + peligro recordado), no según un mapa omnisciente.

function clave(x, y) {
    return `${x},${y}`;
}

function aCoords(k) {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
}

/**
 * Busca la ruta de menor costo entre "inicio" y "objetivo" usando A*.
 *
 * @param {Object} mapa - solo se usa para los límites (mapa.columnas, mapa.filas).
 * @param {{x:number, y:number}} inicio
 * @param {{x:number, y:number}} objetivo
 * @param {(nx:number, ny:number) => number} costoCasilla - costo de ENTRAR a la
 *        casilla (nx, ny). Aquí es donde se inyecta la memoria del agente.
 * @param {number} costoMinimoPosible - el costo más bajo que puede tener
 *        cualquier casilla del mapa (en este proyecto, 0.5 = terreno normal).
 *        Se usa para construir una heurística admisible: heurística = distancia
 *        Manhattan × costoMinimoPosible, que NUNCA sobreestima el costo real
 *        (el costo real de moverse "d" casillas siempre es >= d × costoMinimoPosible).
 * @returns {Array<{x:number, y:number}>|null} camino desde inicio hasta objetivo
 *          (SIN incluir la posición de inicio), o null si no hay camino.
 */
export function encontrarRutaAEstrella(mapa, inicio, objetivo, costoCasilla, costoMinimoPosible = 0.5) {
    function heuristica(x, y) {
        return (Math.abs(x - objetivo.x) + Math.abs(y - objetivo.y)) * costoMinimoPosible;
    }

    const direcciones = [
        { dx: 0, dy: -1 }, // arriba
        { dx: 0, dy: 1 },  // abajo
        { dx: -1, dy: 0 }, // izquierda
        { dx: 1, dy: 0 }   // derecha
    ];

    const inicioKey = clave(inicio.x, inicio.y);
    const objetivoKey = clave(objetivo.x, objetivo.y);

    // Si ya estamos en el objetivo, no hay nada que recorrer.
    if (inicioKey === objetivoKey) return [];

    const listaAbierta = new Map(); // clave -> f(n)
    const listaCerrada = new Set();
    const costoG = new Map();       // clave -> g(n), costo real acumulado
    const vieneDe = new Map();      // clave -> clave del nodo padre (para reconstruir el camino)

    costoG.set(inicioKey, 0);
    listaAbierta.set(inicioKey, heuristica(inicio.x, inicio.y));

    while (listaAbierta.size > 0) {
        // 1. Extraer el nodo con menor f(n) = g(n) + h(n)
        let claveActual = null;
        let menorF = Infinity;
        for (const [k, f] of listaAbierta) {
            if (f < menorF) {
                menorF = f;
                claveActual = k;
            }
        }

        listaAbierta.delete(claveActual);
        listaCerrada.add(claveActual);

        // 2. ¿Llegamos al objetivo? Reconstruir y devolver el camino.
        if (claveActual === objetivoKey) {
            const camino = [];
            let k = claveActual;
            while (vieneDe.has(k)) {
                camino.unshift(aCoords(k));
                k = vieneDe.get(k);
            }
            return camino;
        }

        // 3. Expandir vecinos válidos dentro del grid.
        const actual = aCoords(claveActual);
        for (const d of direcciones) {
            const nx = actual.x + d.dx;
            const ny = actual.y + d.dy;
            if (nx < 0 || nx >= mapa.columnas || ny < 0 || ny >= mapa.filas) continue;

            const vKey = clave(nx, ny);
            if (listaCerrada.has(vKey)) continue;

            const gTentativo = costoG.get(claveActual) + costoCasilla(nx, ny);

            if (!costoG.has(vKey) || gTentativo < costoG.get(vKey)) {
                costoG.set(vKey, gTentativo);
                vieneDe.set(vKey, claveActual);
                listaAbierta.set(vKey, gTentativo + heuristica(nx, ny));
            }
        }
    }

    // Lista abierta vacía sin encontrar el objetivo: no existe camino conocido.
    return null;
}
