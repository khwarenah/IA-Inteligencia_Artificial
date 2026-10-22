// motor/algoritmoGenetico.js
// ALGORITMO GENÉTICO PARA APRENDIZAJE Y PLANIFICACIÓN DE CAMINOS (C.C.)
// Basado en el modelo canónico:
// - Gen: Dirección ('N', 'S', 'E', 'O')
// - Cromosoma / Individuo: Vector de direcciones (secuencia de pasos)
// - Población: Conjunto de caminos candidatos
// - Función Objetivo f(x): Costo acumulado del camino (distancia, choques, terreno, daño)
// - Aptitud (Fitness): fitness[i] = 1 / (1 + f(x))
// - Selección por Ruleta: Probabilidad relativa y acumulada C[i] con tiro aleatorio R[i]
// - Cruce (Crossover): Punto de corte simple con probabilidad Pc
// - Mutación: Modificación estocástica de genes con probabilidad Pm

import { TIPO_CASILLA } from './mapa.js';

export const DIRECCIONES_GENETICAS = ['N', 'S', 'E', 'O'];

export const DELTAS_GENETICOS = {
    'N': { dx: 0, dy: -1 },
    'S': { dx: 0, dy: 1 },
    'E': { dx: 1, dy: 0 },
    'O': { dx: -1, dy: 0 }
};

export class IndividuoCamino {
    constructor(longitudCromosoma = 15, genes = null) {
        this.longitud = longitudCromosoma;
        if (genes) {
            this.genes = [...genes];
        } else {
            this.genes = [];
            for (let i = 0; i < this.longitud; i++) {
                const aleatorio = DIRECCIONES_GENETICAS[Math.floor(Math.random() * DIRECCIONES_GENETICAS.length)];
                this.genes.push(aleatorio);
            }
        }

        // Métricas evaluadas
        this.costoFx = 0;          // f(x)
        this.fitness = 0;          // 1 / (1 + f(x))
        this.probabilidad = 0;     // fitness / totalFitness
        this.probAcumulada = 0;    // C[i]
        
        // Detalles de simulación del camino
        this.posicionFinal = { x: 0, y: 0 };
        this.distanciaFinal = 0;
        this.choques = 0;
        this.danioRecibido = 0;
        this.costoEnergia = 0;
        this.llegoAlObjetivo = false;
        this.trayectoria = [];
    }

    /**
     * Evalúa el camino propuesto en el mapa simulado.
     * Calcula f(x) y fitness = 1 / (1 + f(x)).
     */
    evaluar(inicio, objetivo, mapa, obstaculos = [], zonasPeligro = new Set()) {
        let actualX = inicio.x;
        let actualY = inicio.y;
        this.trayectoria = [{ x: actualX, y: actualY }];

        this.choques = 0;
        this.danioRecibido = 0;
        this.costoEnergia = 0;
        this.llegoAlObjetivo = false;

        const maxCols = mapa.columnas;
        const maxFilas = mapa.filas;

        // Normalizar función o lista de obstáculos
        const esObstaculo = typeof obstaculos === 'function' 
            ? obstaculos 
            : (Array.isArray(obstaculos) ? (ox, oy) => obstaculos.some(o => o.x === ox && o.y === oy) : () => false);

        for (let i = 0; i < this.genes.length; i++) {
            const dir = DELTAS_GENETICOS[this.genes[i]];
            const nx = actualX + dir.dx;
            const ny = actualY + dir.dy;

            // 1. Validar colisiones contra límites o árboles/castillo
            const fueraLimites = (nx < 0 || nx >= maxCols || ny < 0 || ny >= maxFilas);
            const esMuro = esObstaculo(nx, ny);

            if (fueraLimites || esMuro) {
                this.choques += 1;
                // Si choca, no avanza pero registra el intento
                this.trayectoria.push({ x: actualX, y: actualY });
                continue;
            }

            // Si el paso es válido, avanza
            actualX = nx;
            actualY = ny;
            this.trayectoria.push({ x: actualX, y: actualY });

            // 2. Costo de energía según el terreno
            if (mapa.grid && mapa.grid[actualY]) {
                const tipo = mapa.grid[actualY][actualX];
                if (tipo === TIPO_CASILLA.NIEVE) this.costoEnergia += 4;
                else if (tipo === TIPO_CASILLA.HIELO) this.costoEnergia += 2;
                else this.costoEnergia += 1;
            }

            // 3. Daño de zonas de peligro (aliento del dragón/brujo)
            if (zonasPeligro.has && zonasPeligro.has(`${actualX},${actualY}`)) {
                this.danioRecibido += 25;
            }

            // 4. Ver si llegó al objetivo antes de agotar los pasos
            if (actualX === objetivo.x && actualY === objetivo.y) {
                this.llegoAlObjetivo = true;
                break;
            }
        }

        this.posicionFinal = { x: actualX, y: actualY };
        this.distanciaFinal = Math.abs(actualX - objetivo.x) + Math.abs(actualY - objetivo.y);

        // FUNCIÓN OBJETIVO f(x): Costo acumulado a MINIMIZAR
        // Penaliza distancia final, choques, gasto excesivo de energía y fuego
        let fx = (this.distanciaFinal * 15) + (this.choques * 30) + (this.costoEnergia * 2) + (this.danioRecibido * 5);

        // Si alcanzó el objetivo, bonificación restando costo
        if (this.llegoAlObjetivo) {
            fx = Math.max(0, fx - 50);
        }

        this.costoFx = Math.max(0, Math.round(fx * 100) / 100);

        // FUNCIÓN DE APTITUD (FITNESS DE TU TABLA EXCEL): fitness = 1 / (1 + f(x))
        this.fitness = 1 / (1 + this.costoFx);

        return this.fitness;
    }
}

export class AlgoritmoGeneticoCaminos {
    constructor({
        tamanoPoblacion = 6,      // Mismo tamaño que tu hoja de cálculo
        longitudCromosoma = 16,   // Cantidad de pasos por camino candidato
        tasaCruce = 0.25,         // Probabilidad de cruce (< 0.25 en tu hoja)
        tasaMutacion = 0.15,      // Probabilidad de mutar genes
        generacionesMax = 5       // Generaciones de evolución
    } = {}) {
        this.tamanoPoblacion = tamanoPoblacion;
        this.longitudCromosoma = longitudCromosoma;
        this.tasaCruce = tasaCruce;
        this.tasaMutacion = tasaMutacion;
        this.generacionesMax = generacionesMax;

        this.poblacion = [];
        this.mejorHistorico = null;
        this.historialGeneraciones = []; // Datos completos para la bitácora .txt
    }

    /**
     * Inicializa la población con cromosomas aleatorios
     */
    inicializarPoblacion() {
        this.poblacion = [];
        for (let i = 0; i < this.tamanoPoblacion; i++) {
            this.poblacion.push(new IndividuoCamino(this.longitudCromosoma));
        }
    }

    /**
     * Evalúa a todos los individuos y calcula probabilidades relativas y acumuladas
     */
    evaluarPoblacion(inicio, objetivo, mapa, obstaculos, zonasPeligro) {
        let totalFitness = 0;

        // 1. Evaluar cada individuo
        for (const ind of this.poblacion) {
            totalFitness += ind.evaluar(inicio, objetivo, mapa, obstaculos, zonasPeligro);
            if (!this.mejorHistorico || ind.fitness > this.mejorHistorico.fitness) {
                this.mejorHistorico = ind;
            }
        }

        // 2. Probabilidades relativas y acumuladas C[i] (Ruleta)
        let acumulada = 0;
        for (let i = 0; i < this.poblacion.length; i++) {
            const ind = this.poblacion[i];
            ind.probabilidad = totalFitness > 0 ? (ind.fitness / totalFitness) : (1 / this.poblacion.length);
            acumulada += ind.probabilidad;
            ind.probAcumulada = Math.min(1.0, acumulada);
        }

        return totalFitness;
    }

    /**
     * Selección por Ruleta: Selecciona un individuo según número aleatorio R[i]
     */
    seleccionarPorRuleta(rAleatorio) {
        for (let i = 0; i < this.poblacion.length; i++) {
            if (rAleatorio <= this.poblacion[i].probAcumulada) {
                return this.poblacion[i];
            }
        }
        return this.poblacion[this.poblacion.length - 1];
    }

    /**
     * Cruce en un punto (Single-point Crossover)
     */
    cruzar(padre1, padre2, puntoCorte) {
        const genesHijo1 = [
            ...padre1.genes.slice(0, puntoCorte),
            ...padre2.genes.slice(puntoCorte)
        ];
        const genesHijo2 = [
            ...padre2.genes.slice(0, puntoCorte),
            ...padre1.genes.slice(puntoCorte)
        ];

        return [
            new IndividuoCamino(this.longitudCromosoma, genesHijo1),
            new IndividuoCamino(this.longitudCromosoma, genesHijo2)
        ];
    }

    /**
     * Mutación estocástica de genes
     */
    mutar(individuo) {
        const genesMutados = [...individuo.genes];
        let huboMutacion = false;
        let posicionesMutadas = [];

        for (let i = 0; i < genesMutados.length; i++) {
            if (Math.random() < this.tasaMutacion) {
                const nuevoGen = DIRECCIONES_GENETICAS[Math.floor(Math.random() * DIRECCIONES_GENETICAS.length)];
                genesMutados[i] = nuevoGen;
                huboMutacion = true;
                posicionesMutadas.push(i + 1);
            }
        }

        return {
            individuo: new IndividuoCamino(this.longitudCromosoma, genesMutados),
            huboMutacion,
            posicionesMutadas
        };
    }

    /**
     * Ejecuta el ciclo evolutivo completo de generaciones
     */
    ejecutarEvolucion(inicio, objetivo, mapa, obstaculos = [], zonasPeligro = new Set()) {
        this.historialGeneraciones = [];
        this.mejorHistorico = null;
        this.inicializarPoblacion();

        for (let gen = 1; gen <= this.generacionesMax; gen++) {
            const totalFitness = this.evaluarPoblacion(inicio, objetivo, mapa, obstaculos, zonasPeligro);

            // Registro de auditoría de la generación actual
            const registroGen = {
                numeroGeneracion: gen,
                totalFitness,
                individuos: this.poblacion.map((ind, idx) => ({
                    indice: idx + 1,
                    cromosoma: ind.genes.join(''),
                    genesArray: [...ind.genes],
                    fx: ind.costoFx,
                    fitness: ind.fitness,
                    probabilidad: ind.probabilidad,
                    probAcumulada: ind.probAcumulada,
                    distanciaFinal: ind.distanciaFinal,
                    choques: ind.choques,
                    costoEnergia: ind.costoEnergia,
                    danio: ind.danioRecibido,
                    llego: ind.llegoAlObjetivo
                })),
                operaciones: []
            };

            // Si es la última generación, guarda y finaliza
            if (gen === this.generacionesMax) {
                this.historialGeneraciones.push(registroGen);
                break;
            }

            // Crear la siguiente generación mediante Selección, Cruce y Mutación
            const nuevaPoblacion = [];

            // Elitismo: Conservar siempre una copia del mejor de la generación
            const mejorActual = [...this.poblacion].sort((a, b) => b.fitness - a.fitness)[0];
            nuevaPoblacion.push(new IndividuoCamino(this.longitudCromosoma, mejorActual.genes));

            while (nuevaPoblacion.length < this.tamanoPoblacion) {
                // 1. Selección por Ruleta de dos padres
                const r1 = Math.random();
                const r2 = Math.random();
                const padre1 = this.seleccionarPorRuleta(r1);
                const padre2 = this.seleccionarPorRuleta(r2);

                let hijo1 = new IndividuoCamino(this.longitudCromosoma, padre1.genes);
                let hijo2 = new IndividuoCamino(this.longitudCromosoma, padre2.genes);

                // 2. Cruce
                const rCruce = Math.random();
                let seCruzo = false;
                let puntoCorte = 0;

                if (rCruce < this.tasaCruce) {
                    puntoCorte = Math.floor(Math.random() * (this.longitudCromosoma - 1)) + 1;
                    const hijos = this.cruzar(padre1, padre2, puntoCorte);
                    hijo1 = hijos[0];
                    hijo2 = hijos[1];
                    seCruzo = true;
                }

                // 3. Mutación
                const mut1 = this.mutar(hijo1);
                const mut2 = this.mutar(hijo2);

                hijo1 = mut1.individuo;
                hijo2 = mut2.individuo;

                registroGen.operaciones.push({
                    r1: r1.toFixed(3),
                    r2: r2.toFixed(3),
                    seCruzo,
                    rCruce: rCruce.toFixed(3),
                    puntoCorte,
                    mutadoHijo1: mut1.huboMutacion,
                    posMut1: mut1.posicionesMutadas,
                    mutadoHijo2: mut2.huboMutacion,
                    posMut2: mut2.posicionesMutadas
                });

                nuevaPoblacion.push(hijo1);
                if (nuevaPoblacion.length < this.tamanoPoblacion) {
                    nuevaPoblacion.push(hijo2);
                }
            }

            this.historialGeneraciones.push(registroGen);
            this.poblacion = nuevaPoblacion;
        }

        // Evaluación final del mejor histórico
        this.evaluarPoblacion(inicio, objetivo, mapa, obstaculos, zonasPeligro);
        const mejorFinal = [...this.poblacion].sort((a, b) => b.fitness - a.fitness)[0];
        if (!this.mejorHistorico || mejorFinal.fitness > this.mejorHistorico.fitness) {
            this.mejorHistorico = mejorFinal;
        }

        return {
            mejorCamino: this.mejorHistorico,
            historial: this.historialGeneraciones
        };
    }

    /**
     * Genera la bitácora descargable en formato de texto (.txt) sin emojis
     */
    generarReporteTexto(inicio, objetivo) {
        if (!this.historialGeneraciones || this.historialGeneraciones.length === 0) {
            return "No hay datos de evolucion del algoritmo genetico.";
        }

        let txt = "===================================================================================================================================================\n";
        txt += "                                   BITACORA DE EVOLUCION: ALGORITMO GENETICO (AGENTE C.C.)\n";
        txt += "===================================================================================================================================================\n";
        txt += `Parametros de Configuracion:\n`;
        txt += ` - Tamano de Poblacion (N): ${this.tamanoPoblacion} individuos\n`;
        txt += ` - Longitud de Cromosoma:   ${this.longitudCromosoma} genes por camino\n`;
        txt += ` - Tasa de Cruce (Pc):       ${this.tasaCruce} (25% probabilidad de cruce en un punto)\n`;
        txt += ` - Tasa de Mutacion (Pm):    ${this.tasaMutacion} (5% probabilidad por gen)\n`;
        txt += ` - Coordenada de Partida:   (${inicio.x}, ${inicio.y})\n`;
        txt += ` - Coordenada de Destino:   (${objetivo.x}, ${objetivo.y})\n`;
        txt += ` - Codificacion de Genes:    N = Norte (Arriba) | S = Sur (Abajo) | E = Este (Derecha) | O = Oeste (Izquierda)\n`;
        txt += ` - Funcion de Aptitud:      fitness[i] = 1 / (1 + f(x))\n`;
        txt += "===================================================================================================================================================\n\n";

        for (const gen of this.historialGeneraciones) {
            txt += `+-------------------------------------------------------------------------------------------------------------------------------------------------+\n`;
            txt += `| GENERACION ${gen.numeroGeneracion.toString().padEnd(3)} | SUMATORIA DE APTITUD TOTAL (TotalFitness) = ${gen.totalFitness.toFixed(6).padEnd(12)}                                                          |\n`;
            txt += `+-----+----------------------+----------+-------------+----------------------+----------------------+---------------------------------------------+\n`;
            txt += `| Ind | Cromosoma (Camino)   |   f(x)   |   Fitness   | Probabilidad P[i]    | Prob. Acumulada C[i] | Estado de Trayectoria (Dist, Choques, E)    |\n`;
            txt += `|     | (Secuencia de Genes) |  (Costo) | 1 / (1+f(x))| fitness[i] / Total   | Particion de Ruleta  | [D: Distancia Manhattan, C: Choques]        |\n`;
            txt += `+-----+----------------------+----------+-------------+----------------------+----------------------+---------------------------------------------+\n`;

            for (const ind of gen.individuos) {
                const idStr = ind.indice.toString().padStart(3);
                const cromoStr = ind.cromosoma.padEnd(20);
                const fxStr = ind.fx.toFixed(2).padStart(8);
                const fitStr = ind.fitness.toFixed(6).padStart(11);
                const probStr = (ind.probabilidad * 100).toFixed(2).padStart(6) + "% (" + ind.probabilidad.toFixed(4) + ")";
                const acumStr = (ind.probAcumulada * 100).toFixed(2).padStart(6) + "% (" + ind.probAcumulada.toFixed(4) + ")";
                const estadoStr = ind.llego 
                    ? " ALCANZO OBJETIVO CON EXITO " 
                    : ` D=${ind.distanciaFinal.toString().padEnd(2)} | C=${ind.choques.toString().padEnd(2)} | Terreno E=${ind.costoEnergia.toString().padEnd(3)}`;

                txt += `| ${idStr} | ${cromoStr} | ${fxStr} | ${fitStr} | ${probStr.padEnd(20)} | ${acumStr.padEnd(20)} | ${estadoStr.padEnd(43)} |\n`;
            }
            txt += `+-----+----------------------+----------+-------------+----------------------+----------------------+---------------------------------------------+\n`;

            if (gen.operaciones && gen.operaciones.length > 0) {
                txt += `| DETALLE DE REPRODUCCION (RULETA, CRUCE Y MUTACION PARA GENERAR LA SIGUIENTE GENERACION):                                                        |\n`;
                txt += `+-------------------------------------------------------------------------------------------------------------------------------------------------+\n`;
                for (let opIdx = 0; opIdx < gen.operaciones.length; opIdx++) {
                    const op = gen.operaciones[opIdx];
                    const p1Info = `Padre 1: Ind #${op.indPadre1 || '?'} (Tiro R1=${op.r1})`;
                    const p2Info = `Padre 2: Ind #${op.indPadre2 || '?'} (Tiro R2=${op.r2})`;
                    let cruceInfo = op.seCruzo 
                        ? `CRUCE: SI (Tiro Rc=${op.rCruce} < ${this.tasaCruce}, Punto de Corte = ${op.puntoCorte})`
                        : `CRUCE: NO (Tiro Rc=${op.rCruce} >= ${this.tasaCruce}, Hijos conservan a Padres)`;
                    let mutInfo = `MUTACION: Hijo 1 = ${op.mutadoHijo1 ? `SI (Gen[${op.posMut1.join(',')}])` : 'NO'} | Hijo 2 = ${op.mutadoHijo2 ? `SI (Gen[${op.posMut2.join(',')}])` : 'NO'}`;

                    txt += `| Pareja ${opIdx + 1}: ${p1Info} & ${p2Info}\n`;
                    txt += `|           ${cruceInfo}\n`;
                    txt += `|           ${mutInfo}\n`;
                }
                txt += `+-------------------------------------------------------------------------------------------------------------------------------------------------+\n`;
            }
            txt += "\n";
        }

        if (this.mejorHistorico) {
            txt += "===================================================================================================================================================\n";
            txt += "                                              RESULTADO FINAL: MEJOR CAMINO OPTIMIZADO POR EVOLUCION\n";
            txt += "===================================================================================================================================================\n";
            txt += ` - Cromosoma Ganador (Secuencia de Direcciones): ${this.mejorHistorico.genes.join('')}\n`;
            txt += ` - Costo Minimo f(x):                           ${this.mejorHistorico.costoFx.toFixed(2)}\n`;
            txt += ` - Aptitud Maxima (Fitness):                    ${this.mejorHistorico.fitness.toFixed(6)}\n`;
            txt += ` - Distancia Manhattan al Objetivo:             ${this.mejorHistorico.distanciaFinal} casillas de separacion\n`;
            txt += ` - Choques contra Muros/Arboles:                 ${this.mejorHistorico.choques} colisiones\n`;
            txt += ` - Gasto Energetico Estimado:                   ${this.mejorHistorico.costoEnergia}% de energia\n`;
            txt += ` - Estado de Llegada:                           ${this.mejorHistorico.llegoAlObjetivo ? 'LLEGO AL CRISTAL / OBJETIVO DIRECTAMENTE' : 'Ruta convergente aproximada mas cercana'}\n`;
            txt += ` - Coordenadas Paso a Paso en Cuadricula:        ` + this.mejorHistorico.trayectoria.map(t => `(${t.x},${t.y})`).join(' -> ') + "\n";
            txt += "===================================================================================================================================================\n";
        }

        return txt;
    }

    /**
     * Exporta y descarga directamente la bitácora .txt en el navegador
     */
        descargarBitacoraTxt(inicio, objetivo) {
        const contenido = this.generarReporteTexto(inicio, objetivo);
        const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bitacora_algoritmo_genetico_CC_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
