// brujo.js
export class Brujo {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'brujo_sprite.png') {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;
        this.tipo = 'brujo';

        this.quitaEnergiaPorTurno = 8;
        this.quitaSaludPorTurno = 8;

        // Carga de imagen (un solo frame estático, sin grid de direcciones)
        this.imagen = new Image();
        this.imagen.src = rutaImagen;
        this.cargada = false;
        this.imagen.onload = () => { this.cargada = true; };

        // Contador para la animación de balanceo
        this._anguloTick = 0;
    }

    ocupaCasilla(cx, cy) {
        return cx === this.x && cy === this.y;
    }

    actualizar(agente) {
        if (agente.estaMuerta) return;

        const estaEncima = (agente.x === this.x && agente.y === this.y);
        if (estaEncima) {
            agente.energia = Math.max(0, agente.energia - this.quitaEnergiaPorTurno);
            agente.recibirDano(this.quitaSaludPorTurno, this.x, this.y);
            agente.estado = `🔮 El brujo esta drenando a C.C. (Energía: ${agente.energia}%)`;
        }
    }

    dibujar(ctx) {
        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;

        // Aura de peligro
        ctx.fillStyle = 'rgba(147, 51, 234, 0.25)';
        ctx.beginPath();
        ctx.arc(posX + this.tamanoCasilla / 2, posY + this.tamanoCasilla / 2, this.tamanoCasilla * 0.7, 0, Math.PI * 2);
        ctx.fill();

        if (!this.cargada) return;

        // Sombra bajo los pies (fija, no gira con él)
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

        // --- Balanceo sutil en el mismo lugar ---
        this._anguloTick += 0.15;
        const anguloBalanceo = Math.sin(this._anguloTick) * 0.06; // ~3.4 grados máximo

        const factorEscala = 1.5;
        const anchoVisual = this.tamanoCasilla * factorEscala;
        const altoVisual = this.tamanoCasilla * factorEscala * (this.imagen.height / this.imagen.width);
        const centroX = posX + this.tamanoCasilla / 2;
        const centroY = posY + this.tamanoCasilla * 0.75;

        ctx.save();
        ctx.translate(centroX, centroY);
        ctx.rotate(anguloBalanceo);
        ctx.drawImage(
            this.imagen,
            -anchoVisual / 2,
            -altoVisual + (this.tamanoCasilla * 0.25),
            anchoVisual,
            altoVisual
        );
        ctx.restore();
    }
}