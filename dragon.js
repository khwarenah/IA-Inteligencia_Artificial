// dragon.js
export class Dragon {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'dragon_sprite.png') {
        this.x = x;                      
        this.y = y;                      
        this.anchoEnCasillas = 2;        // Ocupa 2 casillas de ancho (Lógica)
        this.altoEnCasillas = 2;         // Ocupa 2 casillas de alto (Lógica)
        
        this.tamanoCasilla = tamanoCasilla;
        this.danoPorTurno = 35;

        // Carga de la Hoja de Sprites
        this.imagen = new Image();
        this.imagen.src = rutaImagen;
        this.cargada = false;
        this.imagen.onload = () => { this.cargada = true; };

        // Cuadrícula 3x4 del Spritesheet
        this.columnas = 3; 
        this.filas = 4;    
        this.frameActual = 0;
        
        // Rotación de vista estática
        this.secuenciaDirecciones = ['IZQUIERDA', 'ARRIBA', 'DERECHA', 'ABAJO'];
        this.indiceDireccion = 0;
        this.direccion = this.secuenciaDirecciones[this.indiceDireccion];
        this.ticksParaGiro = 0;

        this.MAPA_FILAS = {
            'ARRIBA': 0,
            'DERECHA': 1,
            'ABAJO': 2,
            'IZQUIERDA': 3
        };
    }

    ocupaCasilla(cx, cy) {
        return cx >= this.x && cx < this.x + this.anchoEnCasillas &&
               cy >= this.y && cy < this.y + this.altoEnCasillas;
    }

    obtenerCasillasOcupadas() {
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

        this.ticksParaGiro++;
        if (this.ticksParaGiro >= 4) {
            this.ticksParaGiro = 0;
            this.indiceDireccion = (this.indiceDireccion + 1) % this.secuenciaDirecciones.length;
            this.direccion = this.secuenciaDirecciones[this.indiceDireccion];
        }
    }

    actualizar(agente) {
        const casillasDrag = this.obtenerCasillasOcupadas();
        const estaCerca = casillasDrag.some(c => {
            const dist = Math.abs(agente.x - c.x) + Math.abs(agente.y - c.y);
            return dist <= 1;
        });

        if (estaCerca) {
            agente.recibirDano(this.danoPorTurno, this.x, this.y);
        }

        this.animar();
    }

    dibujar(ctx) {
        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;
        
        // Tamaño base de las 4 casillas (80px x 80px)
        const anchoBase = this.tamanoCasilla * this.anchoEnCasillas; 
        const altoBase = this.tamanoCasilla * this.altoEnCasillas;   

        // --- ESCALA VISUAL DEL SPRITE ---
        const factorEscala = 1.5; // Multiplica x1.5 el tamaño visual
        const anchoVisual = anchoBase * factorEscala; // 120px
        const altoVisual = altoBase * factorEscala;   // 120px

        // Offset para centrar la imagen agrandada sobre las 4 casillas lógicas
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

        // Renderizado del sprite agrandado y centrado
        ctx.drawImage(
            this.imagen,
            sx, sy, anchoFrame, altoFrame,
            offsetX, offsetY,
            anchoVisual, altoVisual
        );
    }
}