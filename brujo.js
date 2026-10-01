// brujo.js — Agente Brujo con Barra de Vida Dinámica y Efecto de Impacto
import { TIPO_CASILLA } from './mapa.js';
import { encontrarRutaAEstrella } from './astar.js';

export class Brujo {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'brujo_sprite.png') {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;
        this.tipo = 'brujo';

        // Estadísticas y Estado
        this.saludMax = 80;
        this.salud = 80;
        this.estaMuerto = false;
        // Más rápido que la Aliada (que se mueve cada 2 turnos): así sí puede
        // abrir distancia real al huir (no solo mantener el empate que
        // causaba el ir-y-venir) y tiene chance de llegar hasta C.C.
        this.frecuenciaMovimiento = 1;
        this.contadorTurnos = 0;
        this.estado = "Patrullando";

        // Feedback visual de daño
        this.turnosEfectoImpacto = 0;

        // Mapeo e Historial
        this.posAnterior = { x: x, y: y };
        this.mapaMental = {};
        this.direccion = "ABAJO";

        // --- COMPROMISO DE HUIDA ---
        // En vez de recalcular la dirección de escape en cada turno (lo que
        // provoca un "baile" sincronizado con un perseguidor que usa A*),
        // el Brujo se compromete con una dirección por varios turnos.
        this.direccionHuida = null;
        this.ticksHuidaRestantes = 0;

        // Capacidad de Daño al Jugador
        this.quitaEnergiaPorTurno = 8;
        this.quitaSaludPorTurno = 8;

        // Carga de Imagen
        this.imagen = new Image();
        this.imagen.src = rutaImagen;
        this.cargada = false;
        this.imagen.onload = () => { this.cargada = true; };
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

        // Reducción efectiva de salud
        this.salud = Math.max(0, this.salud - puntos);
        this.turnosEfectoImpacto = 3; // Activa destello visual por 3 fotogramas

        if (this.salud <= 0) {
            this.estaMuerto = true;
            this.salud = 0;
            this.estado = "El Brujo ha sido derrotado";
        } else {
            this.estado = `¡Brujo atacado! HP restante: ${this.salud}/${this.saludMax}`;
        }
    }

    percibirDistanciaManhattan(obj) {
        if (!obj || obj.estaMuerta || obj.estaMuerto) return Infinity;
        return Math.abs(this.x - obj.x) + Math.abs(this.y - obj.y);
    }

    reglaReflejo(aliada, agente) {
        if (this.estaMuerto) return 'MUERTO';

        // Vista / Olfato: Detecta la proximidad de la Aliada
        const distAliada = this.percibirDistanciaManhattan(aliada);
        if (distAliada <= 4) {
            return 'HUIR_DE_ALIADA';
        }

        // Si la Aliada está lejos, intenta perseguir al Agente Principal
        const distAgente = this.percibirDistanciaManhattan(agente);
        if (distAgente <= 6) {
            return 'ASECHAR_AGENTE';
        }

        return 'EXPLORAR_INTELIGENTE';
    }

    evaluarMovimiento(nx, ny, objetivo, modoAccion) {
        const clave = `${nx},${ny}`;
        const infoMemoria = this.mapaMental[clave];

        let pesoTerreno = infoMemoria?.costo || 0.5;

        // Penalización t_-1 para evitar oscilaciones de casillas.
        // Debe ser MAYOR al peso por casilla de distancia (35 en modo huida)
        // para que retroceder nunca valga la pena solo por ganar 1 casilla
        // de distancia; si no, el freno anti-oscilación queda anulado.
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

            if (esValido) {
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
     * Huye manteniendo una dirección fija por varios turnos en vez de
     * recalcular cada vez. Esto es lo que rompe el "baile" con un
     * perseguidor que usa A*: si recalculara cada turno según la posición
     * exacta de la Aliada, cualquier perseguidor óptimo lo mantendría a
     * distancia constante indefinidamente, y al chocar con el borde del
     * mapa eso se ve como ir y venir. Al comprometerse con una dirección,
     * se aleja de forma más decidida y solo reevalúa cuando hace falta.
     */
    huirConCompromiso(mapa, aliada) {
        const maxCols = mapa?.columnas || 25;
        const maxFilas = mapa?.filas || 10;

        const direccionValida = (d) => {
            const nx = this.x + d.dx;
            const ny = this.y + d.dy;
            return (mapa && typeof mapa.esPasoValido === 'function')
                ? mapa.esPasoValido(nx, ny)
                : (nx >= 0 && nx < maxCols && ny >= 0 && ny < maxFilas);
        };

        // Si ya tiene un compromiso vigente y la dirección sigue siendo
        // válida (no se salió del mapa), lo mantiene.
        if (this.ticksHuidaRestantes > 0 && this.direccionHuida && direccionValida(this.direccionHuida)) {
            this.ticksHuidaRestantes--;
            const d = this.direccionHuida;
            return { nx: this.x + d.dx, ny: this.y + d.dy, dx: d.dx, dy: d.dy };
        }

        // Si no (primera vez huyendo, o la dirección actual ya no sirve),
        // elige una nueva dirección y se compromete con ella por varios turnos.
        const paso = this.seleccionarMejorPaso(mapa, aliada, 'HUIR_DE_ALIADA');
        if (paso) {
            this.direccionHuida = { dx: paso.dx, dy: paso.dy };
            this.ticksHuidaRestantes = 3; // turnos de compromiso antes de reevaluar
        }
        return paso;
    }

    /** Costo real de entrar a (nx, ny) leyendo el terreno directamente del mapa. */
    costoTerrenoReal(mapa, nx, ny) {
        if (!mapa || !mapa.grid || !mapa.grid[ny]) return 0.5;
        const tipo = mapa.grid[ny][nx];
        if (tipo === TIPO_CASILLA.NIEVE) return 4;
        if (tipo === TIPO_CASILLA.HIELO) return 2;
        return 0.5;
    }

    /**
     * Usa A* para calcular la ruta óptima hacia "objetivo" (un punto {x,y})
     * y devuelve solo el primer paso. Como el objetivo (el agente) se mueve,
     * se recalcula la ruta completa cada turno; al no tener percepción
     * limitada como C.C., el Brujo conoce el terreno real (sin optimismo
     * sobre casillas no visitadas), así que no hay razón para oscilar.
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

    actuar(accion, mapa, agente, aliada) {
        if (this.estaMuerto) return;

        switch (accion) {
            case 'HUIR_DE_ALIADA':
            case 'ASECHAR_AGENTE':
            case 'EXPLORAR_INTELIGENTE': {
                this.posAnterior = { x: this.x, y: this.y };

                let objetivo = null;
                let paso = null;

                if (accion === 'HUIR_DE_ALIADA') {
                    objetivo = aliada;
                    this.estado = "¡Sintiendo la presencia de la Aliada! Huyendo...";
                    // Huir es "maximizar distancia", no "minimizar costo a un
                    // punto" — A* no aplica aquí. Se usa compromiso de huida
                    // (dirección fija por varios turnos) en vez de recalcular
                    // cada turno, que es lo que causaba el ir y venir.
                    paso = this.huirConCompromiso(mapa, objetivo);
                } else if (accion === 'ASECHAR_AGENTE') {
                    objetivo = agente;
                    this.estado = "Asechando al Agente C.C. (A*)";
                    this.direccionHuida = null; // ya no está huyendo: libera el compromiso
                    this.ticksHuidaRestantes = 0;
                    paso = this.planificarPasoAEstrella(mapa, objetivo) || this.seleccionarMejorPaso(mapa, objetivo, accion);
                } else {
                    this.estado = "Patrullando la zona";
                    this.direccionHuida = null;
                    this.ticksHuidaRestantes = 0;
                    paso = this.seleccionarMejorPaso(mapa, null, accion);
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

        // Ataque al agente principal si comparten casilla
        if (agente && !agente.estaMuerta && agente.x === this.x && agente.y === this.y) {
            if (typeof agente.recibirDano === 'function') {
                // Radio 0: el brujo solo hace daño si estás exactamente
                // parado encima; la zona "viva" de radio 1 ya la maneja
                // agente.actualizarZonasPeligroVivas de forma continua.
                agente.recibirDano(this.quitaSaludPorTurno, this.x, this.y, 0);
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

        // Sprite
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

        // 1. Fondo de barra (Vida perdida / contenedor)
        ctx.fillStyle = 'rgba(220, 38, 38, 0.8)'; // Rojo oscuro
        ctx.fillRect(posX, posBarraY, anchoBarra, altoBarra);

        // 2. Barra frontal (Vida restante en Morado/Magenta)
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(posX, posBarraY, anchoBarra * porcentajeSalud, altoBarra);

        // 3. Borde exterior negro
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(posX, posBarraY, anchoBarra, altoBarra);
    }
}