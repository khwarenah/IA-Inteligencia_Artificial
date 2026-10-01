// astar.js
// Implementación de A* para el grid del proyecto.
// Se recibe una función de costo externa (costoCasilla) para poder
// reutilizar el modelo de memoria/sentidos de cada agente: así A*
// planifica según lo que el agente CREE que cuesta cada casilla, no
// según una verdad absoluta y omnisciente del mapa.

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
 *        casilla (nx, ny). Aquí es donde se inyecta la memoria/percepción de cada agente.
 * @param {number} costoMinimoPosible - el costo más bajo que puede tener
 *        cualquier casilla del mapa (en este proyecto, 0.5 = terreno normal).
 *        Se usa para construir una heurística admisible: heurística = distancia
 *        Manhattan × costoMinimoPosible, que NUNCA sobreestima el costo real.
 * @returns {Array<{x:number, y:number}>|null} camino desde inicio hasta objetivo
 *          (SIN incluir la posición de inicio), o null si no hay camino.
 */
export function encontrarRutaAEstrella(mapa, inicio, objetivo, costoCasilla, costoMinimoPosible = 0.5) {
    function heuristica(x, y) {
        return (Math.abs(x - objetivo.x) + Math.abs(y - objetivo.y)) * costoMinimoPosible;
    }

    const direcciones = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];

    const inicioKey = clave(inicio.x, inicio.y);
    const objetivoKey = clave(objetivo.x, objetivo.y);

    if (inicioKey === objetivoKey) return [];

    const listaAbierta = new Map();
    const listaCerrada = new Set();
    const costoG = new Map();
    const vieneDe = new Map();

    costoG.set(inicioKey, 0);
    listaAbierta.set(inicioKey, heuristica(inicio.x, inicio.y));

    while (listaAbierta.size > 0) {
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

        if (claveActual === objetivoKey) {
            const camino = [];
            let k = claveActual;
            while (vieneDe.has(k)) {
                camino.unshift(aCoords(k));
                k = vieneDe.get(k);
            }
            return camino;
        }

        const actual = aCoords(claveActual);

        // Límites del mapa (si no se conocen columnas/filas, usa un valor amplio por defecto)
        const maxCols = mapa?.columnas ?? 25;
        const maxFilas = mapa?.filas ?? 10;

        for (const d of direcciones) {
            const nx = actual.x + d.dx;
            const ny = actual.y + d.dy;
            if (nx < 0 || nx >= maxCols || ny < 0 || ny >= maxFilas) continue;

            const vKey = clave(nx, ny);
            if (listaCerrada.has(vKey)) continue;

            // Una función de costo puede devolver Infinity para marcar un
            // "muro" (obstáculo bloqueante, como un árbol o el castillo):
            // esa casilla simplemente no se expande, como si no existiera.
            const costoPaso = costoCasilla(nx, ny);
            if (!Number.isFinite(costoPaso)) continue;

            const gTentativo = costoG.get(claveActual) + costoPaso;

            if (!costoG.has(vKey) || gTentativo < costoG.get(vKey)) {
                costoG.set(vKey, gTentativo);
                vieneDe.set(vKey, claveActual);
                listaAbierta.set(vKey, gTentativo + heuristica(nx, ny));
            }
        }
    }

    return null;
}
