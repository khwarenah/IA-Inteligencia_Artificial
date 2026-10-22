//FUNCIÓN DE EVALUACIÓN Y UTILIDAD DE ESTADOS (t+1)
// Califica numéricamente qué tan deseable es un estado futuro s_(t+1)

import { MotorGravitatorio } from '../fisica/campoGravitatorio.js';

export class EvaluadorUtilidad {
    /**
     * Calcula la utilidad total de un estado hipotético s_(t+1)
     * 
     * @param {EstadoAgente} estadoFuturo - El estado s_(t+1) devuelto por ModeloTransicion
     * @param {Object} prediccion - Detalles (colisión, daño, eventos)
     * @param {Object} contexto - Datos para evaluar:
     *   - objetivo: {x, y} (Coordenada del cristal o de la base)
     *   - posAnterior: {x, y} (Para penalizar oscilaciones/retrocesos)
     *   - entidadesFisicas: Lista de atractores y repulsores para gravedad
     *   - mapaMental: Memoria de visitas del agente
     * @returns {Object} { utilidadTotal, desglose }
     */
    static calcularUtilidad(estadoFuturo, prediccion, contexto = {}) {
        const desglose = {
            supervivencia: 0,
            progresoObjetivo: 0,
            costoTerreno: 0,
            gravedad: 0,
            eventosEspeciales: 0,
            penalizacionBucle: 0
        };

        // 1.Evitar la muerte y las colisiones
        if (prediccion.esColision) {
            return {
                utilidadTotal: -Infinity,
                desglose: { ...desglose, colision: -Infinity }
            };
        }

        if (estadoFuturo.estaMuerta || estadoFuturo.salud <= 0 || estadoFuturo.energia <= 0) {
            return {
                utilidadTotal: -Infinity,
                desglose: { ...desglose, supervivencia: -Infinity }
            };
        }

        // 2. Supervivencia: Castigo masivo si la casilla recibe daño (fuego/trampa)
        if (prediccion.danioEstimado > 0) {
            // Un impacto de fuego (25 daño) genera un castigo de -875 puntos
            desglose.supervivencia -= (prediccion.danioEstimado * 35);
        }

        // 3. Progreso hacia el objetivo (Distancia Manhattan)
        const objetivo = contexto.objetivo;
        if (objetivo) {
            const distancia = Math.abs(estadoFuturo.x - objetivo.x) + Math.abs(estadoFuturo.y - objetivo.y);
            desglose.progresoObjetivo = - (distancia * 12);
        }

        // 4. Eficiencia Energética (Costo del terreno)
        // Si la energía es baja (<= 40%), el costo de la nieve se penaliza al doble
        const factorEnergia = (estadoFuturo.energia <= 40) ? 8 : 4;
        desglose.costoTerreno = - (prediccion.costoEnergia * factorEnergia);

        // 5. Bonificación por Eventos Trascendentales
        if (prediccion.recogeCristal) {
            desglose.eventosEspeciales += 600; // Incentivo contundente para tomar el cristal
        }
        if (prediccion.entregaCristal) {
            desglose.eventosEspeciales += 1800; // Máxima recompensa por completar el viaje al altar
        }

        // 6. Integración con el Motor Gravitatorio y el Peso Dinámico
        // NORMALIZACIÓN: Escalamos y acotamos la gravedad a [-50, +50] para que oriente al agente
        // como una brújula física sin eclipsar las prioridades vitales ni crear valles de oscilación.
        if (contexto.entidadesFisicas && contexto.entidadesFisicas.length > 0) {
            const resFisica = MotorGravitatorio.calcularPotencialCasilla(
                { x: estadoFuturo.x, y: estadoFuturo.y },
                estadoFuturo.peso,
                contexto.entidadesFisicas
            );
            const gravEscalada = resFisica.potencialTotal * 0.001;
            desglose.gravedad = Math.max(-50, Math.min(50, gravEscalada));
        }

        // 7. Evitar oscilaciones y bucles
        // Castigo severo por volver inmediatamente a la casilla anterior
        const posAnterior = contexto.posAnterior;
        if (posAnterior && estadoFuturo.x === posAnterior.x && estadoFuturo.y === posAnterior.y) {
            desglose.penalizacionBucle -= 120;
        }

        // Penalizar casillas ya visitadas para motivar a explorar y no dar vueltas
        const clave = `${estadoFuturo.x},${estadoFuturo.y}`;
        const infoMemoria = contexto.mapaMental ? contexto.mapaMental[clave] : null;
        if (infoMemoria && infoMemoria.visitas > 0) {
            desglose.penalizacionBucle -= (infoMemoria.visitas * 25);
        }

        // 8. Bonificación por seguir la guía de ruta global óptima (A*)
        if (contexto.pasoAEstrella && estadoFuturo.x === contexto.pasoAEstrella.x && estadoFuturo.y === contexto.pasoAEstrella.y) {
            desglose.guiaRuta = 200; // Prioridad directriz firme para evitar desvíos innecesarios en bucle
        }

        // 9. Suma ponderada total
        const utilidadTotal = 
            desglose.supervivencia +
            desglose.progresoObjetivo +
            desglose.costoTerreno +
            desglose.eventosEspeciales +
            desglose.gravedad +
            desglose.penalizacionBucle +
            (desglose.guiaRuta || 0);

        return {
            utilidadTotal: Math.round(utilidadTotal * 100) / 100,
            desglose
        };
    }
}