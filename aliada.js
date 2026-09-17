// hada.js — ahora es Claire, la aliada
export class Aliada {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'aliada_sprite.png') {
        this.x = x; //posicion fija en el mapa (columna)
        this.y = y; //posicion fija en el mapa (fila)
        this.tamanoCasilla = tamanoCasilla;
        this.tipo = 'aliada';

        //cuanto cura por turno C.C que pase parada en claire
        this.restauraEnergiaPorTurno = 20;
        this.restauraSaludPorTurno = 20;

        // Carga de imagen, igual que dragon.js
        this.imagen = new Image();
        this.imagen.src = rutaImagen;
        this.cargada = false;
        this.imagen.onload = () => { this.cargada = true; };

        // Grid del spritesheet: 4 columnas x 4 filas
        //aunque solo se usa mirando "ABAJO" pq claire no se mueve
        this.columnas = 4;
        this.filas = 4;
        this.frameActual = 2;

        // Estática, siempre mirando hacia abajo (frente)
        this.direccion = 'ABAJO';

        //fila del spritesheet corresponde a cada direccion
        //se dejo completo por si en el futuro se anima el mov
        this.MAPA_FILAS = {
            'ARRIBA': 0,
            'DERECHA': 1,
            'ABAJO': 2,
            'IZQUIERDA': 3
        };
    }

    ocupaCasilla(cx, cy) {
        return cx === this.x && cy === this.y;
    }
    // Se llama cada turno (cada 500ms). Si C.C. está parada
    // exactamente en la misma casilla que Claire, la cura.
    actualizar(agente) {
        // Animación de "respiración" alternando 2 frames similares
    this._contadorAnim = (this._contadorAnim || 0) + 1;
    if (this._contadorAnim % 4 === 0) {
        this.frameActual = this.frameActual === 2 ? 1 : 2;
    }
        if (agente.estaMuerta) return;

        const estaEncima = (agente.x === this.x && agente.y === this.y);
        if (estaEncima) {
             // Math.min(100, ...) evita que la energía/salud pase de 100
            
            agente.energia = Math.min(100, agente.energia + this.restauraEnergiaPorTurno);
            agente.salud = Math.min(100, agente.salud + this.restauraSaludPorTurno);
            agente.estado = `✨ Claire esta restaurando a C.C. (Energía: ${agente.energia}% | Salud: ${agente.salud}%)`;
        }
    }
    //dibuja a claire en su casilla con un balanceo sutil
    //gira un poco en su lugar, sin desplazarse para
    //no verse congelada
    dibujar(ctx) {
        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;

        // Aura de ayuda alrededor de su casilla
        ctx.fillStyle = 'rgba(94, 234, 212, 0.35)';
        ctx.beginPath();
        ctx.arc(posX + this.tamanoCasilla / 2, posY + this.tamanoCasilla / 2, this.tamanoCasilla * 0.7, 0, Math.PI * 2);
        ctx.fill();

        if (!this.cargada) return;
        
        //recorta el frame correcto del spritesheet
        const anchoFrame = this.imagen.width / this.columnas;
        const altoFrame = this.imagen.height / this.filas;
        const filaIndex = this.MAPA_FILAS[this.direccion] ?? 2;
        const sx = this.frameActual * anchoFrame;
        const sy = filaIndex * altoFrame;

        // tamaño final en pantalla mas grande q una casilla
        //para q se note bien sobre el mapa
        const factorEscala = 1.3;
        const anchoVisual = this.tamanoCasilla * factorEscala;
        const altoVisual = this.tamanoCasilla * factorEscala;
        const offsetX = posX - (anchoVisual - this.tamanoCasilla) / 2;
        const offsetY = posY - (altoVisual - this.tamanoCasilla) / 2;

        // Sombra elíptica bajo los pies
ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
ctx.beginPath();
ctx.ellipse(
    posX + this.tamanoCasilla / 2,
    posY + this.tamanoCasilla * 0.9,
    this.tamanoCasilla * 0.35,
    this.tamanoCasilla * 0.12,
    0, 0, Math.PI * 2
);
ctx.fill();

        ctx.drawImage(
            this.imagen,
            sx, sy, anchoFrame, altoFrame,
            offsetX, offsetY,
            anchoVisual, altoVisual
        );
    }
}