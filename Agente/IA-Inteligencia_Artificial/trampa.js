// trampa.js
export class Trampa {
    constructor(x, y, tamanoCasilla = 40) {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;
        this.tipo = 'trampa';

        this.danoSalud = 20;
        this.revelada = false;
        this._flashTicks = 0;
    }

    ocupaCasilla(cx, cy) {
        return cx === this.x && cy === this.y;
    }

    actualizar(agente) {
        if (agente.estaMuerta) return;
        const estaEncima = (agente.x === this.x && agente.y === this.y);
        if (!estaEncima) return;

        if (!this.revelada) {
            this.revelada = true;
            agente.estado = `❄️💥 ¡C.C. activó una trampa de hielo oculta!`;

            const clave = `${this.x},${this.y}`;
            if (!agente.mapaMental[clave]) {
                agente.mapaMental[clave] = { revelado: true, visitas: 0, costo: 0.5, tieneCristal: false, esZonaFuego: false };
            }
            agente.mapaMental[clave].esZonaFuego = true;

            agente.recibirDano(this.danoSalud, this.x, this.y);
            this._flashTicks = 3;
        }
    }

    dibujar(ctx) {
        if (!this.revelada) return;

        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;
        const cx = posX + this.tamanoCasilla / 2;
        const cy = posY + this.tamanoCasilla / 2;

        if (this._flashTicks > 0) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
            ctx.beginPath();
            ctx.arc(cx, cy, this.tamanoCasilla * 0.7, 0, Math.PI * 2);
            ctx.fill();
            this._flashTicks--;
        }

        ctx.fillStyle = '#bfe8f5';
        ctx.strokeStyle = '#3fa9c9';
        ctx.lineWidth = 1.5;
        const picos = [{ dx: -10, alto: 14 }, { dx: -3, alto: 20 }, { dx: 4, alto: 16 }, { dx: 11, alto: 10 }];
        picos.forEach(p => {
            ctx.beginPath();
            ctx.moveTo(cx + p.dx - 4, posY + this.tamanoCasilla - 4);
            ctx.lineTo(cx + p.dx, posY + this.tamanoCasilla - 4 - p.alto);
            ctx.lineTo(cx + p.dx + 4, posY + this.tamanoCasilla - 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });
    }
}