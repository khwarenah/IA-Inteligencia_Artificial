// dragon.js — Agente Dragón (2x2 casillas)
export class Dragon {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'dragon_sprite.png') {
        this.x = x; 
        this.y = y; 

        // Posición original de origen y radio de patrulla (7x7 -> 3 casillas en cada dirección)
        this.origenX = x;
        this.origenY = y;
        this.radioTerritorio = 3;

        // Dimensiones lógicas (Ocupa 2x2 en la cuadrícula)
        this.anchoEnCasillas = 2;
        this.altoEnCasillas = 2;
        
        this.tamanoCasilla = tamanoCasilla;
        this.danoPorTurno = 35;

        // Sistema de salud e interacciones
        this.saludMax = 100;
        this.salud = 100;
        this.estaMuerto = false;

        // Carga de la Hoja de Sprites
        this.imagen = new Image();
        this.imagen.src = rutaImagen;
        this.cargada = false;
        this.imagen.onload = () => { this.cargada = true; };

        // Cuadrícula 3x4 del Spritesheet
        this.columnas = 3; 
        this.filas = 4;    
        this.frameActual = 0;
        this.direccion = 'ABAJO';

        this.MAPA_FILAS = {
            'ARRIBA': 0,
            'DERECHA': 1,
            'ABAJO': 2,
            'IZQUIERDA': 3
        };

        this.MOVIMIENTOS = [
            { nombre: 'ARRIBA',    dx:  0, dy: -1 },
            { nombre: 'ABAJO',     dx:  0, dy:  1 },
            { nombre: 'IZQUIERDA', dx: -1, dy:  0 },
            { nombre: 'DERECHA',   dx:  1, dy:  0 }
        ];
    }

    // Método para recibir daño ejercido por la aliada
    recibirDano(cantidad) {
        if (this.estaMuerto) return;
        this.salud = Math.max(0, this.salud - cantidad);
        if (this.salud === 0) {
            this.estaMuerto = true;
        }
    }

    ocupaCasilla(cx, cy) {
        if (this.estaMuerto) return false;
        return cx >= this.x && cx < this.x + this.anchoEnCasillas &&
               cy >= this.y && cy < this.y + this.altoEnCasillas;
    }

    obtenerCasillasOcupadas() {
        if (this.estaMuerto) return [];
        const casillas = [];
        for (let dy = 0; dy < this.altoEnCasillas; dy++) {
            for (let dx = 0; dx < this.anchoEnCasillas; dx++) {
                casillas.push({ x: this.x + dx, y: this.y + dy });
            }
        }
        return casillas;
    }

    animar() {
        this.frameActual = (this.frameActual + 1) % this.columnas;
    }

    actualizar(agente, mapa = null) {
        if (this.estaMuerto) return;

        // 1. LÓGICA DE MOVIMIENTO DENTRO DEL DEL RANGO 7x7
        const movimiento = this.MOVIMIENTOS[Math.floor(Math.random() * this.MOVIMIENTOS.length)];
        const nuevoX = this.x + movimiento.dx;
        const nuevoY = this.y + movimiento.dy;

        // Revisa que la nueva posición no se aleje más de 3 casillas de su centro original
        const dentroDeTerritorio = 
            Math.abs(nuevoX - this.origenX) <= this.radioTerritorio &&
            Math.abs(nuevoY - this.origenY) <= this.radioTerritorio;

        let puedeMoverse = dentroDeTerritorio;

        // Revisa que la entidad entera (2x2) quede dentro de los bordes del mapa
        if (mapa && puedeMoverse) {
            const maxCols = mapa.columnas ?? mapa.ancho ?? 10;
            const maxFilas = mapa.filas ?? mapa.alto ?? 10;

            const dentroDelMapa = 
                nuevoX >= 0 && (nuevoX + this.anchoEnCasillas) <= maxCols &&
                nuevoY >= 0 && (nuevoY + this.altoEnCasillas) <= maxFilas;

            if (typeof mapa.esPasoValido === 'function') {
                let pasoValido = true;
                // Revisa que las 4 casillas del dragón sean navegables
                for (let dy = 0; dy < this.altoEnCasillas; dy++) {
                    for (let dx = 0; dx < this.anchoEnCasillas; dx++) {
                        if (!mapa.esPasoValido(nuevoX + dx, nuevoY + dy)) {
                            pasoValido = false;
                            break;
                        }
                    }
                }
                puedeMoverse = pasoValido;
            } else {
                puedeMoverse = dentroDelMapa;
            }
        }

        if (puedeMoverse) {
            this.x = nuevoX;
            this.y = nuevoY;
            this.direccion = movimiento.nombre;
        }

        this.animar();

        // 2. ATAQUE AL AGENTE PRINCIPAL
        const casillasDrag = this.obtenerCasillasOcupadas();
        const estaCerca = casillasDrag.some(c => {
            const dist = Math.abs(agente.x - c.x) + Math.abs(agente.y - c.y);
            return dist <= 1;
        });

        if (estaCerca && !agente.estaMuerta) {
            agente.recibirDano(this.danoPorTurno, this.x, this.y);
        }
    }

    dibujar(ctx) {
        if (this.estaMuerto) return;

        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;
        
        const anchoBase = this.tamanoCasilla * this.anchoEnCasillas; 
        const altoBase = this.tamanoCasilla * this.altoEnCasillas;   

        const factorEscala = 1.5; 
        const anchoVisual = anchoBase * factorEscala; 
        const altoVisual = altoBase * factorEscala;   

        const offsetX = posX - (anchoVisual - anchoBase) / 2;
        const offsetY = posY - (altoVisual - altoBase) / 2;

        // Aura de amenaza roja
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.beginPath();
        ctx.arc(
            posX + anchoBase / 2, 
            posY + altoBase / 2, 
            anchoBase * 0.9, 
            0, Math.PI * 2
        );
        ctx.fill();

        if (!this.cargada) return;

        const anchoFrame = this.imagen.width / this.columnas;
        const altoFrame = this.imagen.height / this.filas;

        const filaIndex = this.MAPA_FILAS[this.direccion] ?? 3;
        const sx = this.frameActual * anchoFrame;
        const sy = filaIndex * altoFrame;

        // Renderizado del sprite
        ctx.drawImage(
            this.imagen,
            sx, sy, anchoFrame, altoFrame,
            offsetX, offsetY,
            anchoVisual, altoVisual
        );

        // Barra de Vida
        const anchoBarra = anchoBase;
        const altoBarra = 6;
        const barraX = posX;
        const barraY = posY - 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barraX, barraY, anchoBarra, altoBarra);

        const porcentajeSalud = this.salud / this.saludMax;
        ctx.fillStyle = porcentajeSalud > 0.5 ? '#22c55e' : (porcentajeSalud > 0.2 ? '#eab308' : '#ef4444');
        ctx.fillRect(barraX, barraY, anchoBarra * porcentajeSalud, altoBarra);
    }
}