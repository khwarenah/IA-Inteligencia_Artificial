// arbol.js
export class Arbol {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'arbol_cold.png') {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;

        this.imagen = new Image();
        this.imagen.src = rutaImagen;
        this.cargada = false;
        this.imagen.onload = () => { this.cargada = true; };

        this._desfaseX = ((x * 17 + y * 31) % 10) - 5;
        this._escalaExtra = 0.9 + ((x * 13 + y * 7) % 20) / 100;
    }

    dibujar(ctx) {
        if (!this.cargada) return;

        const anchoVisual = this.tamanoCasilla * 0.7 * this._escalaExtra;
        const altoVisual = anchoVisual * (this.imagen.height / this.imagen.width);

        const centroX = (this.x + 0.5) * this.tamanoCasilla + this._desfaseX;
        const pieY = (this.y + 1) * this.tamanoCasilla;

        const offsetX = centroX - anchoVisual / 2;
        const offsetY = pieY - altoVisual;

        ctx.drawImage(this.imagen, offsetX, offsetY, anchoVisual, altoVisual);
    }
}