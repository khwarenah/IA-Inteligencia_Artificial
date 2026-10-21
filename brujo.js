// brujo.js 
export class Brujo {
    constructor(x, y, tamanoCasilla = 60) {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;
        this.tipo = 'brujo';

        // Estadísticas y Estado original
        this.saludMax = 80;
        this.salud = 80;
        this.estaMuerto = false;
        this.frecuenciaMovimiento = 2;
        this.contadorTurnos = 0;
        this.estado = "Patrullando";

        // Feedback visual de daño
        this.turnosEfectoImpacto = 0;

        // Mapeo e Historial original
        this.posAnterior = { x: x, y: y };
        this.mapaMental = {};
        this.direccion = "ABAJO";
        this.mirandoIzquierda = false; // Control de orientación visual

        // Capacidad de Daño al Jugador
        this.quitaEnergiaPorTurno = 8;
        this.quitaSaludPorTurno = 8;

        // Factor de escala visual (1.0 = tamaño de casilla, 1.8 = 80% más grande)
        this.escalaVisual = 1.8;

        // --- SISTEMA DE SPRITES ANIMADOS ---
        this.estadoAnimacion = 'idle'; // 'idle', 'fly', 'attack', 'death'
        this.frameActual = 0;
        this.contadorTicksAnim = 0;
        this.velocidadAnimacion = 6; 

        // Configuración de las grillas de imágenes
        this.spritesInfo = {
            idle:   { src: 'wizard idle.png', frames: 10, cols: 10, rows: 1 },
            fly:    { src: 'wizard fly forward.png', frames: 6, cols: 6, rows: 1 },
            attack: { src: 'wizard attack.png', frames: 8, cols: 6, rows: 2 },
            death:  { src: 'wizard death.png', frames: 10, cols: 10, rows: 1 }
        };

        this.imagenes = {};
        this.cargadas = false;
        let imagenesCargadas = 0;
        const totalImagenes = Object.keys(this.spritesInfo).length;

        // Carga de todas las hojas de sprites
        for (const [clave, info] of Object.entries(this.spritesInfo)) {
            const img = new Image();
            img.src = info.src;
            img.onload = () => {
                imagenesCargadas++;
                if (imagenesCargadas === totalImagenes) this.cargadas = true;
            };
            this.imagenes[clave] = img;
        }
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

        // Actualiza hacia dónde mira el sprite
        if (dx < 0) this.mirandoIzquierda = true;
        if (dx > 0) this.mirandoIzquierda = false;
    }

    recibirDano(puntos, origenX, origenY) {
        if (this.estaMuerto) return;

        this.salud = Math.max(0, this.salud - puntos);
        this.turnosEfectoImpacto = 3; 

        if (this.salud <= 0) {
            this.estaMuerto = true;
            this.salud = 0;
            this.estado = "El Brujo ha sido derrotado";
            
            // Cambia la animación a muerte y la reinicia desde el frame 0
            this.estadoAnimacion = 'death';
            this.frameActual = 0; 
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

        const distAliada = this.percibirDistanciaManhattan(aliada);
        if (distAliada <= 4) {
            return 'HUIR_DE_ALIADA';
        }

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

        const esRegresoInmediato = (nx === this.posAnterior.x && ny === this.posAnterior.y);
        let pesoHistorial = esRegresoInmediato ? 30 : 0;

        if (modoAccion === 'HUIR_DE_ALIADA' && objetivo) {
            const distFuturaAliada = Math.abs(nx - objetivo.x) + Math.abs(ny - objetivo.y);
            return pesoTerreno + pesoHistorial - (distFuturaAliada * 35);
        }

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

        let seMovio = false;

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
                    seMovio = true;

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

        // Selección de la animación correspondiente al final del turno
        const atacando = agente && !agente.estaMuerta && agente.x === this.x && agente.y === this.y;
        
        if (atacando) {
            if (this.estadoAnimacion !== 'attack') this.frameActual = 0;
            this.estadoAnimacion = 'attack';
            if (typeof agente.recibirDano === 'function') {
                agente.recibirDano(this.quitaSaludPorTurno, this.x, this.y);
            }
        } else if (seMovio) {
            this.estadoAnimacion = 'fly';
        } else {
            this.estadoAnimacion = 'idle';
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
        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;

        // Tamaño visual escalado y offset para centrar sobre la casilla
        const tamDibujo = this.tamanoCasilla * this.escalaVisual;
        const offsetX = (this.tamanoCasilla - tamDibujo) / 2;
        const offsetY = (this.tamanoCasilla - tamDibujo) / 2;
        const drawX = posX + offsetX;
        const drawY = posY + offsetY;

        // Aura violeta base (solo si está vivo)
        if (!this.estaMuerto) {
            ctx.fillStyle = 'rgba(147, 51, 234, 0.25)';
            ctx.beginPath();
            ctx.arc(posX + this.tamanoCasilla / 2, posY + this.tamanoCasilla / 2, tamDibujo * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dibuja el sprite correspondiente al estado
        if (this.cargadas) {
            const estadoActual = this.estadoAnimacion;
            const imgActual = this.imagenes[estadoActual];
            const info = this.spritesInfo[estadoActual];

            this.contadorTicksAnim++;
            if (this.contadorTicksAnim >= this.velocidadAnimacion) {
                this.contadorTicksAnim = 0;
                
                // Detiene la animación en el último fotograma si el brujo muere
                if (estadoActual === 'death' && this.frameActual >= info.frames - 1) {
                    this.frameActual = info.frames - 1;
                } else {
                    this.frameActual = (this.frameActual + 1) % info.frames;
                }
            }

            // Lógica de recorte de la grilla (X y Y)
            const anchoFrame = imgActual.width / info.cols;
            const altoFrame = imgActual.height / info.rows;
            
            const col = this.frameActual % info.cols;
            const row = Math.floor(this.frameActual / info.cols);
            
            const srcX = col * anchoFrame;
            const srcY = row * altoFrame;

            ctx.save();

            // El sprite original mira a la izquierda, así que se refleja cuando mira a la derecha
            if (!this.mirandoIzquierda) {
                ctx.translate(drawX + tamDibujo, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(imgActual, srcX, srcY, anchoFrame, altoFrame, 0, 0, tamDibujo, tamDibujo);
            } else {
                ctx.drawImage(imgActual, srcX, srcY, anchoFrame, altoFrame, drawX, drawY, tamDibujo, tamDibujo);
            }

            ctx.restore();
        }

        if (this.estaMuerto) return;

        // Destello rojo cuando es golpeado
        if (this.turnosEfectoImpacto > 0) {
            this.turnosEfectoImpacto--;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.fillRect(posX, posY, this.tamanoCasilla, this.tamanoCasilla);
        }

        // Barra de salud dinámica
        const altoBarra = 6;
        const anchoBarra = this.tamanoCasilla;
        const posBarraY = posY - 8;
        const porcentajeSalud = Math.max(0, this.salud / this.saludMax);

        ctx.fillStyle = 'rgba(220, 38, 38, 0.8)';
        ctx.fillRect(posX, posBarraY, anchoBarra, altoBarra);
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(posX, posBarraY, anchoBarra * porcentajeSalud, altoBarra);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(posX, posBarraY, anchoBarra, altoBarra);
    }
}