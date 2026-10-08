// fisica/campoGravitatorio.js
import { FISICA } from './constantesFisica.js';

export class MotorGravitatorio {
    /**
     * Calcula la fuerza gravitacional entre dos cuerpos.
     * F = G * (m1 * m2) / (d^2 + epsilon)
     */
    static calcularFuerza(masa1, masa2, distancia, polaridad) {
        const magnitud = FISICA.G * (masa1 * masa2) / (Math.pow(distancia, 2) + FISICA.EPSILON);
        return magnitud * polaridad;
    }

    /**
     * Calcula la distancia Euclidiana entre dos coordenadas (Grid).
     */
    static calcularDistancia(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    /**
     * Evalúa el potencial de fuerza total que recibiría el agente al pararse en "posOrigen".
     * @param {Object} posOrigen - Coordenada {x, y} a evaluar.
     * @param {number} masaAgente - Masa actual del agente evaluador.
     * @param {Array} entidades - Lista de objetos en el mapa: [{x, y, masa, polaridad}]
     * @returns {Object} { vectorFuerza: {x, y}, potencialTotal: number }
     */
    static calcularPotencialCasilla(posOrigen, masaAgente, entidades) {
        let fuerzaTotalX = 0;
        let fuerzaTotalY = 0;
        let potencialTotal = 0;

        for (const entidad of entidades) {
            const distancia = this.calcularDistancia(posOrigen, entidad);
            
            // Si la distancia es cero, omitimos o manejamos de forma especial
            if (distancia === 0) {
                // Penalización extrema si estamos cayendo sobre un repulsor
                if (entidad.polaridad < 0) potencialTotal -= (FISICA.G * masaAgente * entidad.masa);
                continue; 
            }

            const fuerza = this.calcularFuerza(masaAgente, entidad.masa, distancia, entidad.polaridad);

            // Vector de dirección normalizado
            const dx = entidad.x - posOrigen.x;
            const dy = entidad.y - posOrigen.y;
            const dirX = dx / distancia;
            const dirY = dy / distancia;

            // Sumatoria del vector fuerza (Atracción jala hacia el objetivo, repulsión empuja en contra)
            fuerzaTotalX += dirX * fuerza;
            fuerzaTotalY += dirY * fuerza;

            // Potencial escalar neto para tomar decisiones simplificadas
            potencialTotal += fuerza;
        }

        return {
            vectorFuerza: { x: fuerzaTotalX, y: fuerzaTotalY },
            potencialTotal: potencialTotal
        };
    }

    /**
     * Calcula la aceleración resultante (Segunda ley de Newton: a = F / m)
     * Util cuando el agente modula su inercia al llevar carga.
     */
    static calcularAceleracion(vectorFuerza, masaAgente) {
        return {
            ax: vectorFuerza.x / masaAgente,
            ay: vectorFuerza.y / masaAgente
        };
    }
}
