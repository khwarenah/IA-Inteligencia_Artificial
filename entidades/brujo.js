// brujo.js — Agente Brujo con Barra de Vida Dinámica, Toma de Decisiones t+1 y Huida a 3 Casillas
import { TIPO_CASILLA } from '../motor/mapa.js';
import { encontrarRutaAEstrella } from '../motor/astar.js';
import { FISICA } from '../fisica/constantesFisica.js';
import { EstadoAgente, ModeloTransicion } from '../motor/modeloTransicion.js';

export class Brujo {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'assets/brujo_sprite.png') {
        this.x = x;
        this.y = y;
        this.origenX = x;
        this.origenY = y;
        this.tamanoCasilla = tamanoCasilla;
        this.tipo = 'brujo';

        // Estadísticas, Masa y Frecuencia de Movimiento (coincidente con su peso)
        this.saludMax = 80;
        this.salud = 80;
        this.estaMuerto = false;
        this.peso = FISICA.MASAS.BRUJO; // 75 kg: peso intermedio
        this.frecuenciaMovimiento = 2;   // Se mueve cada 2 pasos de C.C.
        this.contadorTurnos = 0;
        this.pasosMuerteCC = 0;          // Contador para revivir tras 15 movimientos de C.C.
        this.estado = "Patrullando";

        // Feedback visual de daño
        this.turnosEfectoImpacto = 0;

        // Mapeo, Historial y Limitaciones del Mapa (Árboles, Castillo)
        this.posAnterior = { x: x, y: y };
        this.mapaMental = {};
        this.obstaculosBloqueantes = [];
        this.direccion = "ABAJO";

        // --- COMPROMISO DE HUIDA ---
        this.direccionHuida = null;
        this.ticksHuidaRestantes = 0;

        // Capacidad de Daño
        this.quitaEnergiaPorTurno = 8;
        this.quitaSaludPorTurno = 8;

        // Carga de Imagen
        this.imagen = new Image();
        this.imagen.src = rutaImagen;
        this.cargada = false;
        this.imagen.onload = () => { this.cargada = true; };
    }

    registrarObstaculosBloqueantes(lista) {
        this.obstaculosBloqueantes = lista || [];
    }

    estaBloqueado(x, y) {
        return this.obstaculosBloqueantes.some(o => o.x === x && o.y === y);
    }

    actualizarDireccion(dx, dy) {
        const MAPA_DIRECCIONES = {
            '0,-1': 'ARRIBA',
            '0,1':  'ABAJO',
            '-1,0': 'IZQUIERDA',
            '1,0':  'DERECHA'
        };
        const nuevaDir = MAPA_DIRECCIONES[`${dx},${dy}`];
        if (nuevaDir) this.direccion = nuevaDir;
    }

    recibirDano(puntos, origenX, origenY) {
        if (this.estaMuerto) return;

        this.salud = Math.max(0, this.salud - puntos);
        this.turnosEfectoImpacto = 3;

        if (this.salud <= 0) {
            this.estaMuerto = true;
            this.salud = 0;
            this.pasosMuerteCC = 0;
            this.estado = "El Brujo ha sido derrotado (esperando revivir)";
        } else {
            this.estado = `¡Brujo atacado! HP restante: ${this.salud}/${this.saludMax}`;
        }
    }

    /**
     * Incrementa el contador de espera cada vez que C.C. se desplaza.
     * Revive tras 15 movimientos de C.C.
     */
    notificarPasoCC() {
        if (!this.estaMuerto) return;
        this.pasosMuerteCC++;
        if (this.pasosMuerteCC >= 15) {
            this.revivir();
        }
    }

    revivir() {
        this.estaMuerto = false;
        this.salud = this.saludMax;
        this.x = this.origenX;
        this.y = this.origenY;
        this.pasosMuerteCC = 0;
        this.turnosEfectoImpacto = 0;
        this.posAnterior = { x: this.x, y: this.y };
        this.direccionHuida = null;
        this.ticksHuidaRestantes = 0;
        this.estado = "El Brujo ha revivido. Patrullando";
    }

    percibirDistanciaManhattan(obj) {
        if (!obj || obj.estaMuerta || obj.estaMuerto) return Infinity;
        return Math.abs(this.x - obj.x) + Math.abs(this.y - obj.y);
    }

    reglaReflejo(aliada, agente) {
        if (this.estaMuerto) return 'MUERTO';

        // Comienza a huir exactamente a 3 casillas de distancia de la Aliada
        const distAliada = this.percibirDistanciaManhattan(aliada);
        if (distAliada <= 3) {
            return 'HUIR_DE_ALIADA';
        }

        // Si la Aliada no está amenazando de cerca, el Brujo siempre sabe dónde está C.C. y la acecha constantemente
        if (agente && !agente.estaMuerta) {
            return 'ASECHAR_AGENTE';
        }

        return 'EXPLORAR_INTELIGENTE';
    }

    evaluarMovimiento(nx, ny, objetivo, modoAccion) {
        const clave = `${nx},${ny}`;
        const infoMemoria = this.mapaMental[clave];

        let pesoTerreno = infoMemoria?.costo || 0.5;

        const esRegresoInmediato = (nx === this.posAnterior.x && ny === this.posAnterior.y);
        let pesoHistorial = esRegresoInmediato ? 40 : 0;

        // MODO HUIDA: Inversión del gradiente de distancia
        if (modoAccion === 'HUIR_DE_ALIADA' && objetivo) {
            const distFuturaAliada = Math.abs(nx - objetivo.x) + Math.abs(ny - objetivo.y);
            return pesoTerreno + pesoHistorial - (distFuturaAliada * 35);
        }

        // MODO ASECHAR / EXPLORAR
        let distObjetivo = objetivo ? (Math.abs(nx - objetivo.x) + Math.abs(ny - objetivo.y)) : 0;
        const numVisitas = infoMemoria?.visitas || 0;
        return pesoTerreno + pesoHistorial + (numVisitas * 8) + (distObjetivo * 3);
    }

    seleccionarMejorPaso(mapa, objetivo, modoAccion) {
        const direcciones = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        let mejorOpcion = null;
        let menorPuntaje = Infinity;

        const maxCols = mapa?.columnas || 25;
        const maxFilas = mapa?.filas || 10;

        for (const dir of direcciones) {
            const nx = this.x + dir.dx;
            const ny = this.y + dir.dy;

            const esValido = (mapa && typeof mapa.esPasoValido === 'function') 
                ? mapa.esPasoValido(nx, ny) 
                : (nx >= 0 && nx < maxCols && ny >= 0 && ny < maxFilas);

            // Respeta los límites y los obstáculos bloqueantes (árboles y castillo)
            if (esValido && !this.estaBloqueado(nx, ny)) {
                const puntaje = this.evaluarMovimiento(nx, ny, objetivo, modoAccion);
                if (puntaje < menorPuntaje) {
                    menorPuntaje = puntaje;
                    mejorOpcion = { nx, ny, dx: dir.dx, dy: dir.dy };
                }
            }
        }

        return mejorOpcion;
    }

    huirConCompromiso(mapa, aliada) {
        const maxCols = mapa?.columnas || 25;
        const maxFilas = mapa?.filas || 10;

        const direccionValida = (d) => {
            const nx = this.x + d.dx;
            const ny = this.y + d.dy;
            const enMapa = (mapa && typeof mapa.esPasoValido === 'function')
                ? mapa.esPasoValido(nx, ny)
                : (nx >= 0 && nx < maxCols && ny >= 0 && ny < maxFilas);
            return enMapa && !this.estaBloqueado(nx, ny);
        };

        if (this.ticksHuidaRestantes > 0 && this.direccionHuida && direccionValida(this.direccionHuida)) {
            this.ticksHuidaRestantes--;
            const d = this.direccionHuida;
            return { nx: this.x + d.dx, ny: this.y + d.dy, dx: d.dx, dy: d.dy };
        }

        const paso = this.seleccionarMejorPaso(mapa, aliada, 'HUIR_DE_ALIADA');
        if (paso) {
            this.direccionHuida = { dx: paso.dx, dy: paso.dy };
            this.ticksHuidaRestantes = 3;
        }
        return paso;
    }

    /**
     * Costo real de entrar a (nx, ny) respetando los obstáculos bloqueantes
     * (árboles y castillo) como muros infinitos para A*.
     */
    costoTerrenoReal(mapa, nx, ny) {
        if (this.estaBloqueado(nx, ny)) return Infinity;
        if (!mapa || !mapa.grid || !mapa.grid[ny]) return 0.5;
        const tipo = mapa.grid[ny][nx];
        if (tipo === TIPO_CASILLA.NIEVE) return 4;
        if (tipo === TIPO_CASILLA.HIELO) return 2;
        return 0.5;
    }

    planificarPasoAEstrella(mapa, objetivo) {
        if (!mapa || !objetivo) return null;

        const ruta = encontrarRutaAEstrella(
            mapa,
            { x: this.x, y: this.y },
            { x: objetivo.x, y: objetivo.y },
            (nx, ny) => this.costoTerrenoReal(mapa, nx, ny),
            0.5
        );

        if (!ruta || ruta.length === 0) return null;
        const siguiente = ruta[0];
        return { nx: siguiente.x, ny: siguiente.y, dx: siguiente.x - this.x, dy: siguiente.y - this.y };
    }

    /**
     * TOMA DE DECISIONES t+1
     * Simula en la mente del agente las 4 direcciones posibles, evalúa su utilidad futura
     * y elige la mejor acción, registrando el proceso en la bitácora.
     */
    tomarDecisionT1(mapa, objetivo, modoAccion, pasoAEstrella = null) {
        const estadoActual = new EstadoAgente({
            x: this.x,
            y: this.y,
            energia: 100,
            salud: this.salud,
            peso: this.peso,
            estaMuerta: this.estaMuerto
        });

        const entorno = {
            mapa: mapa,
            obstaculos: this.obstaculosBloqueantes,
            zonasPeligro: new Set(),
            trampas: []
        };

        const accionesCandidatas = ['ARRIBA', 'ABAJO', 'IZQUIERDA', 'DERECHA'];
        let mejorDecision = null;
        let mayorUtilidad = -Infinity;

        for (const accion of accionesCandidatas) {
            const { estadoSiguiente, prediccion } = ModeloTransicion.simularPaso(estadoActual, accion, entorno);

            let utilidad = 0;

            // 1. Evitar colisiones contra árboles, castillo y límites del mapa
            if (prediccion.esColision) {
                utilidad = -Infinity;
            } else {
                // 2. Comportamiento según el objetivo
                if (modoAccion === 'HUIR_DE_ALIADA' && objetivo) {
                    // Maximizar la distancia hacia la Aliada
                    const distFuturaAliada = Math.abs(estadoSiguiente.x - objetivo.x) + Math.abs(estadoSiguiente.y - objetivo.y);
                    utilidad += (distFuturaAliada * 35);

                    // Bonificación por persistencia en la dirección de huida previa
                    if (this.direccionHuida) {
                        const dx = estadoSiguiente.x - this.x;
                        const dy = estadoSiguiente.y - this.y;
                        if (dx === this.direccionHuida.dx && dy === this.direccionHuida.dy) {
                            utilidad += 25;
                        }
                    }
                } else if (modoAccion === 'ASECHAR_AGENTE' && objetivo) {
                    // Minimizar distancia a C.C.
                    const distFuturaAgente = Math.abs(estadoSiguiente.x - objetivo.x) + Math.abs(estadoSiguiente.y - objetivo.y);
                    utilidad -= (distFuturaAgente * 15);

                    // Bonificación por seguir la ruta óptima global A*
                    if (pasoAEstrella && estadoSiguiente.x === pasoAEstrella.nx && estadoSiguiente.y === pasoAEstrella.ny) {
                        utilidad += 50;
                    }
                } else {
                    // Exploración / patrulla
                    const clave = `${estadoSiguiente.x},${estadoSiguiente.y}`;
                    const visitas = this.mapaMental[clave]?.visitas || 0;
                    utilidad -= (visitas * 10);
                }

                // 3. Eficiencia de terreno
                utilidad -= (prediccion.costoEnergia * 3);

                // 4. Penalización por retroceso inmediato (anti-oscilación t_-1)
                if (this.posAnterior && estadoSiguiente.x === this.posAnterior.x && estadoSiguiente.y === this.posAnterior.y) {
                    utilidad -= 40;
                }
            }

            const candidato = {
                accion,
                estadoSiguiente,
                prediccion,
                utilidadTotal: utilidad
            };

            if (utilidad > mayorUtilidad) {
                mayorUtilidad = utilidad;
                mejorDecision = candidato;
            }
        }

        if (!mejorDecision || mayorUtilidad === -Infinity) {
            return null;
        }

        return mejorDecision;
    }

    actuar(accion, mapa, agente, aliada) {
        if (this.estaMuerto) return;

        switch (accion) {
            case 'HUIR_DE_ALIADA':
            case 'ASECHAR_AGENTE':
            case 'EXPLORAR_INTELIGENTE': {
                this.posAnterior = { x: this.x, y: this.y };

                let objetivo = null;
                let pasoAEstrella = null;

                if (accion === 'HUIR_DE_ALIADA') {
                    objetivo = aliada;
                    this.estado = "¡Aliada a 3 casillas! Huyendo...";
                } else if (accion === 'ASECHAR_AGENTE') {
                    objetivo = agente;
                    this.estado = "Asechando al Agente C.C. (A*)";
                    this.direccionHuida = null;
                    this.ticksHuidaRestantes = 0;
                    pasoAEstrella = this.planificarPasoAEstrella(mapa, objetivo);
                } else {
                    this.estado = "Patrullando la zona";
                    this.direccionHuida = null;
                    this.ticksHuidaRestantes = 0;
                }

                // Toma de decisiones t+1 evaluando las 4 direcciones hipotéticas
                const decision = this.tomarDecisionT1(mapa, objetivo, accion, pasoAEstrella);

                let paso = null;
                if (decision && decision.accion !== 'ESPERAR') {
                    const dirVec = ModeloTransicion.DIRECCIONES[decision.accion];
                    paso = {
                        nx: decision.estadoSiguiente.x,
                        ny: decision.estadoSiguiente.y,
                        dx: dirVec.dx,
                        dy: dirVec.dy
                    };

                    if (accion === 'HUIR_DE_ALIADA') {
                        this.direccionHuida = { dx: dirVec.dx, dy: dirVec.dy };
                        this.ticksHuidaRestantes = 3;
                    }
                } else {
                    if (accion === 'HUIR_DE_ALIADA') {
                        paso = this.huirConCompromiso(mapa, objetivo);
                    } else if (accion === 'ASECHAR_AGENTE') {
                        paso = pasoAEstrella || this.seleccionarMejorPaso(mapa, objetivo, accion);
                    } else {
                        paso = this.seleccionarMejorPaso(mapa, null, accion);
                    }
                }

                if (paso) {
                    this.actualizarDireccion(paso.dx, paso.dy);
                    this.x = paso.nx;
                    this.y = paso.ny;

                    const clave = `${this.x},${this.y}`;
                    if (!this.mapaMental[clave]) {
                        this.mapaMental[clave] = { visitas: 1, costo: 0.5 };
                    } else {
                        this.mapaMental[clave].visitas += 1;
                    }
                }
                break;
            }
        }

        // Ataque al agente principal C.C. si comparten casilla
        if (agente && !agente.estaMuerta && agente.x === this.x && agente.y === this.y) {
            if (typeof agente.recibirDano === 'function') {
                agente.recibirDano(this.quitaSaludPorTurno, this.x, this.y, 0);
            }
        }

        // Ataque/defensa contra la Aliada si está adyacente o en la misma casilla
        if (aliada && !aliada.estaMuerta) {
            const distAliada = Math.abs(this.x - aliada.x) + Math.abs(this.y - aliada.y);
            if (distAliada <= 1 && typeof aliada.recibirDano === 'function') {
                aliada.recibirDano(this.quitaSaludPorTurno, this.x, this.y);
            }
        }
    }

    actualizar(agente, mapa = null, aliada = null) {
        if (this.estaMuerto) return;

        this.contadorTurnos++;
        if (this.contadorTurnos % this.frecuenciaMovimiento === 0) {
            const accion = this.reglaReflejo(aliada, agente);
            this.actuar(accion, mapa, agente, aliada);
        }
    }

    dibujar(ctx) {
        if (this.estaMuerto) return;

        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;

        // Aura violeta base
        ctx.fillStyle = 'rgba(147, 51, 234, 0.25)';
        ctx.beginPath();
        ctx.arc(posX + this.tamanoCasilla / 2, posY + this.tamanoCasilla / 2, this.tamanoCasilla * 0.7, 0, Math.PI * 2);
        ctx.fill();

        if (this.cargada) {
            ctx.drawImage(this.imagen, posX, posY, this.tamanoCasilla, this.tamanoCasilla);
        }

        // Destello rojo cuando es golpeado
        if (this.turnosEfectoImpacto > 0) {
            this.turnosEfectoImpacto--;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.fillRect(posX, posY, this.tamanoCasilla, this.tamanoCasilla);
        }

        // --- BARRA DE SALUD VISUALMENTE DINÁMICA ---
        const altoBarra = 6;
        const anchoBarra = this.tamanoCasilla;
        const posBarraY = posY - 8;
        const porcentajeSalud = Math.max(0, this.salud / this.saludMax);

        // 1. Fondo de barra (Rojo oscuro)
        ctx.fillStyle = 'rgba(220, 38, 38, 0.8)';
        ctx.fillRect(posX, posBarraY, anchoBarra, altoBarra);

        // 2. Barra frontal (Morado/Magenta)
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(posX, posBarraY, anchoBarra * porcentajeSalud, altoBarra);

        // 3. Borde exterior negro
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(posX, posBarraY, anchoBarra, altoBarra);
    }
}
