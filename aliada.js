// hada.js — Claire, Aliada con Invocación de Daño Garantizada
import { TIPO_CASILLA } from './mapa.js';
import { encontrarRutaAEstrella } from './astar.js';

export class Aliada {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'aliada_sprite.png') {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;
        this.tipo = 'aliada';

        // Estadísticas y Estado
        this.saludMax = 100;
        this.salud = 100;
        this.estaMuerta = false;
        this.frecuenciaMovimiento = 2;
        this.contadorTurnos = 0;
        this.estado = "Acompañando a C.C.";

        // Mapeo e Historial
        this.posAnterior = { x: x, y: y };
        this.mapaMental = {};
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
        if (this.salud <= 0) {
            this.estaMuerta = true;
            this.salud = 0;
            this.estado = "La Aliada ha caído en combate";
        }
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

        // 2. PERSECUCIÓN: Si el enemigo está en línea de vista / olfato
        if (distBrujo <= 6) return 'PERSEGUIR_BRUJO';
        if (distDragon <= 6) return 'PERSEGUIR_DRAGON';

        // 3. REGLA DE APOYO: Acompañar al Agente Principal
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

    /** Costo real de entrar a (nx, ny) leyendo el terreno directamente del mapa. */
    costoTerrenoReal(mapa, nx, ny) {
        if (!mapa || !mapa.grid || !mapa.grid[ny]) return 0.5;
        const tipo = mapa.grid[ny][nx];
        if (tipo === TIPO_CASILLA.NIEVE) return 4;
        if (tipo === TIPO_CASILLA.HIELO) return 2;
        return 0.5;
    }

    /**
     * Usa A* para ir hacia "objetivo" ({x,y}), devolviendo solo el primer
     * paso. Como persigue objetivos que se mueven (agente, brujo o dragón),
     * se recalcula cada turno; la Aliada conoce el terreno real, así que no
     * hay optimismo que corregir sobre la marcha.
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

    actuar(accion, mapa, agente, dragon, brujo) {
        if (this.estaMuerta) return;

        switch (accion) {
            case 'ATACAR_BRUJO':
                this.estado = "¡Atacando al Brujo!";
                // Aplica el daño al Brujo y activa su animación de recibo de impacto
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
                    this.estado = "Rastreando al Brujo";
                } else if (accion === 'PERSEGUIR_DRAGON') {
                    objetivo = dragon;
                    this.estado = "Aproximándose al Dragón";
                } else {
                    objetivo = agente;
                    this.estado = "Acompañando a C.C.";
                }

                // Todos sus modos de movimiento tienen un objetivo concreto
                // (perseguir o acompañar), así que A* aplica en los tres.
                const paso = this.planificarPasoAEstrella(mapa, objetivo)
                    || this.seleccionarMejorPaso(mapa, objetivo, accion);

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

        ctx.fillStyle = 'rgba(94, 234, 212, 0.35)';
        ctx.beginPath();
        ctx.arc(posX + this.tamanoCasilla / 2, posY + this.tamanoCasilla / 2, this.tamanoCasilla * 0.7, 0, Math.PI * 2);
        ctx.fill();

        if (!this.cargada) return;

        const anchoFrame = this.imagen.width / this.columnas;
        const altoFrame = this.imagen.height / this.filas;
        const filaIndex = this.MAPA_FILAS[this.direccion] ?? 2;

        ctx.drawImage(
            this.imagen,
            this.frameActual * anchoFrame, filaIndex * altoFrame, anchoFrame, altoFrame,
            posX, posY, this.tamanoCasilla, this.tamanoCasilla
        );
    }
}