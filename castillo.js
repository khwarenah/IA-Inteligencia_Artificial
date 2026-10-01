// castillo.js
export class Castillo {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'castillo_sprite.png') {
        this.x = x; // columna de la entrada
        this.y = y; // fila de la entrada
        this.tamanoCasilla = tamanoCasilla;

        this.imagen = new Image();
        this.imagen.src = rutaImagen;
        this.cargada = false;
        this.imagen.onload = () => { this.cargada = true; };
    }

    // Casillas que bloquea (su "cuerpo"), dejando libre SOLO
    // la casilla de entrada (this.x, this.y)
    obtenerCasillasOcupadas() {
        return [
            { x: this.x - 1, y: this.y - 1 },
            { x: this.x,     y: this.y - 1 },
            { x: this.x + 1, y: this.y - 1 },
            { x: this.x - 1, y: this.y },
            { x: this.x + 1, y: this.y }
        ];
    }

    dibujar(ctx) {
        if (!this.cargada) return;

        const anchoVisual = this.tamanoCasilla * 3.5;
        const altoVisual = anchoVisual * (this.imagen.height / this.imagen.width);

        const centroX = (this.x + 0.5) * this.tamanoCasilla;
        const pieY = (this.y + 1) * this.tamanoCasilla;

        const offsetX = Math.max(0, centroX - anchoVisual / 2);
        const offsetY = pieY - altoVisual;

        ctx.drawImage(this.imagen, offsetX, offsetY, anchoVisual, altoVisual);
    }
}