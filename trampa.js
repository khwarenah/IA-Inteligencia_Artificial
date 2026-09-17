// trampa.js
export class Trampa {
    constructor(x, y, tamanoCasilla = 40) {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;
        this.tipo = 'trampa';

        this.danoSalud = 20;
        this.revelada = false;   // invisible hasta que se activa la primera vez
        this._flashTicks = 0;    // destello de aviso al activarse
    }

    ocupaCasilla(cx, cy) {
        return cx === this.x && cy === this.y;
    }

    actualizar(agente) {
        if (agente.estaMuerta) return;

        const estaEncima = (agente.x === this.x && agente.y === this.y);
        if (!estaEncima) return;

        // Solo hace algo la PRIMERA vez que la pisa; después queda "gastada"
        if (!this.revelada) {
            this.revelada = true;
            agente.estado = `❄️💥 ¡C.C. activó una trampa de hielo oculta!`;

            // Aprendizaje: registra la casilla como peligrosa en su memoria,
            // igual que hace con las zonas de fuego del dragón
            const clave = `${this.x},${this.y}`;
            if (!agente.mapaMental[clave]) {
                agente.mapaMental[clave] = { revelado: true, visitas: 0, costo: 0.5, tieneCristal: false, esZonaFuego: false };
            }
            agente.mapaMental[clave].esZonaFuego = true; // reutiliza el mismo peso de penalización

            agente.recibirDano(this.danoSalud, this.x, this.y);
            this._flashTicks = 3;
        }
    }

    dibujar(ctx) {
        // Mientras no se active, no se dibuja NADA -> sorpresa real
        if (!this.revelada) return;

        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;
        const cx = posX + this.tamanoCasilla / 2;
        const cy = posY + this.tamanoCasilla / 2;

        // Destello rojo breve justo al activarse
        if (this._flashTicks > 0) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
            ctx.beginPath();
            ctx.arc(cx, cy, this.tamanoCasilla * 0.7, 0, Math.PI * 2);
            ctx.fill();
            this._flashTicks--;
        }

        // Picos de hielo dibujados con canvas (sin necesitar imagen)
        ctx.fillStyle = '#bfe8f5';
        ctx.strokeStyle = '#3fa9c9';
        ctx.lineWidth = 1.5;

        const picos = [
            { dx: -10, alto: 14 },
            { dx: -3,  alto: 20 },
            { dx: 4,   alto: 16 },
            { dx: 11,  alto: 10 }
        ];

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