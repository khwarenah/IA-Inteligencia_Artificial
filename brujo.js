// brujo.js — Agente Brujo con Barra de Vida Dinámica y Efecto de Impacto
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
        this.frecuenciaMovimiento = 2;
        this.contadorTurnos = 0;
        this.estado = "Patrullando";

        // Feedback visual de daño
        this.turnosEfectoImpacto = 0;

        // Mapeo e Historial
        this.posAnterior = { x: x, y: y };
        this.mapaMental = {};
        this.direccion = "ABAJO";

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

        // Penalización t_-1 para evitar oscilaciones de casillas
        const esRegresoInmediato = (nx === this.posAnterior.x && ny === this.posAnterior.y);
        let pesoHistorial = esRegresoInmediato ? 30 : 0;

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

    actuar(accion, mapa, agente, aliada) {
        if (this.estaMuerto) return;

        switch (accion) {
            case 'HUIR_DE_ALIADA':
            case 'ASECHAR_AGENTE':
            case 'EXPLORAR_INTELIGENTE': {
                this.posAnterior = { x: this.x, y: this.y };

                let objetivo = null;
                if (accion === 'HUIR_DE_ALIADA') {
                    objetivo = aliada;
                    this.estado = "¡Sintiendo la presencia de la Aliada! Huyendo...";
                } else if (accion === 'ASECHAR_AGENTE') {
                    objetivo = agente;
                    this.estado = "Asechando al Agente C.C.";
                } else {
                    this.estado = "Patrullando la zona";
                }

                const paso = this.seleccionarMejorPaso(mapa, objetivo, accion);
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
                agente.recibirDano(this.quitaSaludPorTurno, this.x, this.y);
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