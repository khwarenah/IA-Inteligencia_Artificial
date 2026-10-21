// hada.js — Claire, Aliada con Invocación de Daño Garantizada y Toma de Decisiones t+1
import { TIPO_CASILLA } from '../motor/mapa.js';
import { encontrarRutaAEstrella } from '../motor/astar.js';
import { FISICA } from '../fisica/constantesFisica.js';
import { EstadoAgente, ModeloTransicion } from '../motor/modeloTransicion.js';

export class Aliada {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'assets/aliada_sprite.png') {
        this.x = x;
        this.y = y;
        this.origenX = x;
        this.origenY = y;
        this.tamanoCasilla = tamanoCasilla;
        this.tipo = 'aliada';

        // Estadísticas, Masa y Frecuencia de Movimiento (coincidente con su peso)
        this.saludMax = 100;
        this.salud = 100;
        this.estaMuerta = false;
        this.peso = FISICA.MASAS.ALIADA; // 110 kg: la más pesada del grupo de exploradores
        this.frecuenciaMovimiento = 3;   // Se mueve cada 3 pasos de C.C. por su mayor peso
        this.contadorTurnos = 0;
        this.pasosMuerteCC = 0;          // Contador para revivir tras 15 movimientos de C.C.
        this.estado = "Acompañando a C.C.";

        // Feedback visual de daño
        this.turnosEfectoImpacto = 0;

        // Mapeo, Historial y Limitaciones del Mapa (Árboles, Castillo)
        this.posAnterior = { x: x, y: y };
        this.mapaMental = {};
        this.obstaculosBloqueantes = [];
        this.direccion = "ABAJO";

        // Poderes de la Aliada
        this.danoAtaque = 25;
        this.restauraEnergiaPorTurno = 20;
        this.restauraSaludPorTurno = 20;

        // Carga y Animación
        this.imagen = new Image();
        this.imagen.src = rutaImagen;
        this.cargada = false;
        this.imagen.onload = () => { this.cargada = true; };

        this.columnas = 4;
        this.filas = 4;
        this.frameActual = 0;
        this.MAPA_FILAS = { 'ARRIBA': 0, 'DERECHA': 1, 'ABAJO': 2, 'IZQUIERDA': 3 };
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
        if (this.estaMuerta) return;
        this.salud = Math.max(0, this.salud - puntos);
        this.turnosEfectoImpacto = 3;
        if (this.salud <= 0) {
            this.estaMuerta = true;
            this.salud = 0;
            this.pasosMuerteCC = 0;
            this.estado = "La Aliada ha caído en combate (esperando revivir)";
        } else {
            this.estado = `¡Aliada atacada! HP: ${this.salud}/${this.saludMax}`;
        }
    }

    /**
     * Incrementa el contador de espera cada vez que C.C. se desplaza.
     * Revive tras 15 movimientos de C.C.
     */
    notificarPasoCC() {
        if (!this.estaMuerta) return;
        this.pasosMuerteCC++;
        if (this.pasosMuerteCC >= 15) {
            this.revivir();
        }
    }

    revivir() {
        this.estaMuerta = false;
        this.salud = this.saludMax;
        this.x = this.origenX;
        this.y = this.origenY;
        this.pasosMuerteCC = 0;
        this.turnosEfectoImpacto = 0;
        this.posAnterior = { x: this.x, y: this.y };
        this.estado = "La Aliada ha revivido. Acompañando a C.C.";
    }

    percibirDistanciaManhattan(obj) {
        if (!obj || obj.estaMuerto || obj.estaMuerta) return Infinity;
        return Math.abs(this.x - obj.x) + Math.abs(this.y - obj.y);
    }

    reglaReflejo(brujo, dragon, agente) {
        if (this.estaMuerta) return 'MUERTA';

        const distBrujo = this.percibirDistanciaManhattan(brujo);
        const distDragon = this.percibirDistanciaManhattan(dragon);

        // 1. ATAQUE DIRECTO: Si el enemigo está en casilla adyacente (Distancia <= 1)
        if (distBrujo <= 1) return 'ATACAR_BRUJO';
        if (distDragon <= 1) return 'ATACAR_DRAGON';

        // 2. PERSECUCIÓN: Comienza la persecución si ve al Brujo desde 4 casillas de distancia
        if (distBrujo <= 4) return 'PERSEGUIR_BRUJO';
        if (distDragon <= 3) return 'PERSEGUIR_DRAGON';

        // 3. REGLA DE APOYO: Acompañar al Agente Principal C.C.
        return 'ACOMPANAR_AGENTE';
    }

    evaluarMovimiento(nx, ny, objetivo, modoAccion) {
        const clave = `${nx},${ny}`;
        const infoMemoria = this.mapaMental[clave];

        let pesoTerreno = infoMemoria?.costo || 0.5;

        // Penalización t_-1 para evitar giros repetitivos
        const esRegresoInmediato = (nx === this.posAnterior.x && ny === this.posAnterior.y);
        let pesoHistorial = esRegresoInmediato ? 25 : 0;

        let distObjetivo = objetivo ? (Math.abs(nx - objetivo.x) + Math.abs(ny - objetivo.y)) : 0;
        
        return pesoTerreno + pesoHistorial + (distObjetivo * 15);
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

    /**
     * Usa A* para planificar hacia "objetivo" ({x,y}) esquivando obstáculos bloqueantes.
     */
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
            estaMuerta: this.estaMuerta
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

            // 1. Evitar colisiones contra árboles, castillo y bordes
            if (prediccion.esColision) {
                utilidad = -Infinity;
            } else {
                // 2. Progreso hacia el objetivo (enemigo o C.C.)
                if (objetivo) {
                    const distFutura = Math.abs(estadoSiguiente.x - objetivo.x) + Math.abs(estadoSiguiente.y - objetivo.y);
                    utilidad -= (distFutura * 15);
                }

                // 3. Eficiencia de terreno
                utilidad -= (prediccion.costoEnergia * 4);

                // 4. Bonificación por seguir la ruta óptima global A*
                if (pasoAEstrella && estadoSiguiente.x === pasoAEstrella.nx && estadoSiguiente.y === pasoAEstrella.ny) {
                    utilidad += 60;
                }

                // 5. Penalización por retroceso inmediato (anti-oscilación t_-1)
                if (this.posAnterior && estadoSiguiente.x === this.posAnterior.x && estadoSiguiente.y === this.posAnterior.y) {
                    utilidad -= 30;
                }

                // 6. Bonificación si se alcanza rango de impacto directo
                if (objetivo && (modoAccion === 'ATACAR_BRUJO' || modoAccion === 'ATACAR_DRAGON')) {
                    const dist = Math.abs(estadoSiguiente.x - objetivo.x) + Math.abs(estadoSiguiente.y - objetivo.y);
                    if (dist <= 1) utilidad += 100;
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

    actuar(accion, mapa, agente, dragon, brujo) {
        if (this.estaMuerta) return;

        switch (accion) {
            case 'ATACAR_BRUJO':
                this.estado = "¡Atacando al Brujo!";
                if (brujo && typeof brujo.recibirDano === 'function') {
                    brujo.recibirDano(this.danoAtaque, this.x, this.y);
                }
                break;

            case 'ATACAR_DRAGON':
                this.estado = "¡Atacando al Dragón!";
                if (dragon && typeof dragon.recibirDano === 'function') {
                    dragon.recibirDano(this.danoAtaque, this.x, this.y);
                }
                break;

            case 'PERSEGUIR_BRUJO':
            case 'PERSEGUIR_DRAGON':
            case 'ACOMPANAR_AGENTE': {
                this.posAnterior = { x: this.x, y: this.y };

                let objetivo = null;
                if (accion === 'PERSEGUIR_BRUJO') {
                    objetivo = brujo;
                    this.estado = "Rastreando al Brujo a 4 casillas";
                } else if (accion === 'PERSEGUIR_DRAGON') {
                    objetivo = dragon;
                    this.estado = "Aproximándose al Dragón";
                } else {
                    objetivo = agente;
                    this.estado = "Acompañando a C.C.";
                }

                const pasoAEstrella = this.planificarPasoAEstrella(mapa, objetivo);

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
                } else {
                    paso = pasoAEstrella || this.seleccionarMejorPaso(mapa, objetivo, accion);
                }

                if (paso) {
                    this.actualizarDireccion(paso.dx, paso.dy);
                    this.x = paso.nx;
                    this.y = paso.ny;
                    this.frameActual = (this.frameActual + 1) % this.columnas;
                }
                break;
            }
        }

        // Curación al Agente Principal si comparten casilla
        if (agente && !agente.estaMuerta && agente.x === this.x && agente.y === this.y) {
            agente.energia = Math.min(100, (agente.energia || 0) + this.restauraEnergiaPorTurno);
            agente.salud = Math.min(100, (agente.salud || 0) + this.restauraSaludPorTurno);
        }
    }

    actualizar(agente, mapa = null, dragon = null, brujo = null) {
        if (this.estaMuerta) return;

        this.contadorTurnos++;
        if (this.contadorTurnos % this.frecuenciaMovimiento === 0) {
            const accion = this.reglaReflejo(brujo, dragon, agente);
            this.actuar(accion, mapa, agente, dragon, brujo);
        }
    }

    dibujar(ctx) {
        if (this.estaMuerta) return;

        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;

        // Aura protectora cian
        ctx.fillStyle = 'rgba(94, 234, 212, 0.35)';
        ctx.beginPath();
        ctx.arc(posX + this.tamanoCasilla / 2, posY + this.tamanoCasilla / 2, this.tamanoCasilla * 0.7, 0, Math.PI * 2);
        ctx.fill();

        if (this.cargada) {
            const anchoFrame = this.imagen.width / this.columnas;
            const altoFrame = this.imagen.height / this.filas;
            const filaIndex = this.MAPA_FILAS[this.direccion] ?? 2;

            ctx.drawImage(
                this.imagen,
                this.frameActual * anchoFrame, filaIndex * altoFrame, anchoFrame, altoFrame,
                posX, posY, this.tamanoCasilla, this.tamanoCasilla
            );
        }

        // Destello rojo cuando es impactada
        if (this.turnosEfectoImpacto > 0) {
            this.turnosEfectoImpacto--;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.fillRect(posX, posY, this.tamanoCasilla, this.tamanoCasilla);
        }

        // --- BARRA DE VIDA DINÁMICA DE LA ALIADA ---
        const altoBarra = 6;
        const anchoBarra = this.tamanoCasilla;
        const posBarraY = posY - 8;
        const porcentajeSalud = Math.max(0, this.salud / this.saludMax);

        // 1. Fondo de barra (Rojo oscuro)
        ctx.fillStyle = 'rgba(220, 38, 38, 0.8)';
        ctx.fillRect(posX, posBarraY, anchoBarra, altoBarra);

        // 2. Barra frontal dinámica (Verde esmeralda / amarillo / rojo)
        ctx.fillStyle = porcentajeSalud > 0.5 ? '#10b981' : (porcentajeSalud > 0.2 ? '#eab308' : '#ef4444');
        ctx.fillRect(posX, posBarraY, anchoBarra * porcentajeSalud, altoBarra);

        // 3. Borde negro
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(posX, posBarraY, anchoBarra, altoBarra);
    }
}
