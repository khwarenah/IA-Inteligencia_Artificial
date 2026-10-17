// MODELO DE TRANSICIÓN DE ESTADOS (t+1)
// Permite al agente simular en su mente las consecuencias de una acción
// antes de ejecutarla físicamente en el entorno.

import { TIPO_CASILLA } from './mapa.js';
import { FISICA } from '../fisica/constantesFisica.js';

/**
 * Representa una fotografía o estado instantáneo del agente en un tiempo t.
 */
export class EstadoAgente {
    constructor({
        x,
        y,
        energia = 100,
        salud = 100,
        tieneFragmento = false,
        peso = FISICA.MASAS.CC_BASE,
        estaMuerta = false
    }) {
        this.x = x;
        this.y = y;
        this.energia = energia;
        this.salud = salud;
        this.tieneFragmento = tieneFragmento;
        this.peso = peso;
        this.estaMuerta = estaMuerta;
    }

    /**
     * Clona el estado actual para no alterar el original al hacer simulaciones.
     */
    clonar() {
        return new EstadoAgente({
            x: this.x,
            y: this.y,
            energia: this.energia,
            salud: this.salud,
            tieneFragmento: this.tieneFragmento,
            peso: this.peso,
            estaMuerta: this.estaMuerta
        });
    }
}

/**
 * Motor del Modelo de Transición: S_(t+1) = f(S_t, a_t)
 */
export class ModeloTransicion {
    // Vectores unitarios para cada acción posible
    static DIRECCIONES = {
        'ARRIBA':    { dx: 0, dy: -1 },
        'ABAJO':     { dx: 0, dy: 1 },
        'IZQUIERDA': { dx: -1, dy: 0 },
        'DERECHA':   { dx: 1, dy: 0 },
        'ESPERAR':   { dx: 0, dy: 0 }
    };

    /**
     * Costo energético teórico de cada terreno en el mapa
     */
    static COSTO_POR_TERRENO = {
        [TIPO_CASILLA.VACIA]: 1,
        [TIPO_CASILLA.BASE_ESPEJO]: 1,
        [TIPO_CASILLA.FRAGMENTO]: 1,
        [TIPO_CASILLA.HIELO]: 2,
        [TIPO_CASILLA.NIEVE]: 4
    };

    /**
     * Función de Transición principal:
     * Toma el estado actual s_t y una acción a_t, y predice el estado futuro s_(t+1)
     *
     * @param {EstadoAgente} estadoActual - Estado actual S_t
     * @param {string} accion - 'ARRIBA' | 'ABAJO' | 'IZQUIERDA' | 'DERECHA' | 'ESPERAR'
     * @param {Object} entorno - Información del mundo conocida por el agente:
     *   - mapa: grid con casillas
     *   - obstaculos: lista de árboles, castillos, etc. [{x, y}]
     *   - zonasPeligro: Set de claves "x,y" bajo fuego o amenaza
     *   - trampas: lista de trampas [{x, y}]
     * @returns {Object} { estadoSiguiente, prediccion }
     */
    static simularPaso(estadoActual, accion, entorno = {}) {
        const dir = this.DIRECCIONES[accion] || { dx: 0, dy: 0 };
        const mapa = entorno.mapa;
        const obstaculos = entorno.obstaculos || [];
        const zonasPeligro = entorno.zonasPeligro || new Set();
        const trampas = entorno.trampas || [];

        // 1. Calcular coordenadas hipotéticas en t+1
        const nx = estadoActual.x + dir.dx;
        const ny = estadoActual.y + dir.dy;

        let esColision = false;
        let finalX = nx;
        let finalY = ny;

        // Validar si la casilla hipotética se sale del mapa o choca con árbol/castillo
        const fueraDeLimites = (mapa && (nx < 0 || nx >= mapa.columnas || ny < 0 || ny >= mapa.filas));
        const esObstaculo = obstaculos.some(o => o.x === nx && o.y === ny);

        if (fueraDeLimites || esObstaculo) {
            esColision = true;
            finalX = estadoActual.x;
            finalY = estadoActual.y;
        }

        // 2. Predecir gasto de energía en t+1
        let costoEnergia = 0;
        if (!esColision && mapa && mapa.grid && mapa.grid[finalY]) {
            const tipoTerreno = mapa.grid[finalY][finalX];
            costoEnergia = this.COSTO_POR_TERRENO[tipoTerreno] || 1;
        }
        const energiaFutura = Math.max(0, estadoActual.energia - costoEnergia);

        // 3. Predecir salud y peligros en t+1 (Fuego, Trampas, etc.)
        let danioEstimado = 0;
        const claveCasilla = `${finalX},${finalY}`;

        // ¿Está en rango de fuego del dragón?
        if (zonasPeligro.has && zonasPeligro.has(claveCasilla)) {
            danioEstimado += 25; // Daño proyectado por fuego
        }

        // ¿Hay una trampa conocida en esa casilla?
        const hayTrampa = trampas.some(t => t.x === finalX && t.y === finalY);
        if (hayTrampa) {
            danioEstimado += 15;
        }

        const saludFutura = Math.max(0, estadoActual.salud - danioEstimado);
        const moriria = (saludFutura <= 0 || energiaFutura <= 0);

        // 4. Predecir recolección o entrega de cristales y peso en t+1
        let tieneFragmentoFuturo = estadoActual.tieneFragmento;
        let pesoFuturo = estadoActual.peso;
        let recogeCristal = false;
        let entregaCristal = false;

        if (!esColision && mapa && mapa.grid && mapa.grid[finalY]) {
            const tipo = mapa.grid[finalY][finalX];
            
            // Si llega a un fragmento y no tenía uno
            if (tipo === TIPO_CASILLA.FRAGMENTO && !tieneFragmentoFuturo) {
                tieneFragmentoFuturo = true;
                pesoFuturo += FISICA.MASAS.FRAGMENTO; // +5 kg
                recogeCristal = true;
            }
            // Si llega al altar cargando un fragmento
            else if (tipo === TIPO_CASILLA.BASE_ESPEJO && tieneFragmentoFuturo) {
                tieneFragmentoFuturo = false;
                pesoFuturo -= FISICA.MASAS.FRAGMENTO; // Vuelve a su masa base
                entregaCristal = true;
            }
        }

        // 5. Construir y devolver el estado s_(t+1)
        const estadoSiguiente = new EstadoAgente({
            x: finalX,
            y: finalY,
            energia: energiaFutura,
            salud: saludFutura,
            tieneFragmento: tieneFragmentoFuturo,
            peso: pesoFuturo,
            estaMuerta: moriria
        });

        return {
            estadoSiguiente,
            prediccion: {
                accion,
                esColision,
                costoEnergia,
                danioEstimado,
                recogeCristal,
                entregaCristal,
                moriria
            }
        };
    }
}