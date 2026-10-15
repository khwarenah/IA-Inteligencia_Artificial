// vortice.js
// Portal del Brujo: drena la energía de C.C. si se acerca.
// No bloquea el paso ni mata; solo la debilita.
export class Vortice {
    constructor(x, y, tamanoCasilla = 40, rutaImagen = 'vortice_sprite.png') {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;
        this.tipo = 'vortice';

        this.radio = 1;          // distancia (en casillas) a la que empieza a drenar
        this.drenajeCerca = 4;   // energía por turno a distancia <= 1
        this.drenajeLejos = 2;   // energía por turno a distancia 2

        this.imagen = new Image();
        this.imagen.src = rutaImagen;
        this.cargada = false;
        this.imagen.onload = () => { this.cargada = true; };
    }

    ocupaCasilla(cx, cy) {
        return cx === this.x && cy === this.y;
    }

    distanciaA(agente) {
        return Math.abs(agente.x - this.x) + Math.abs(agente.y - this.y);
    }

    actualizar(agente) {
        if (agente.estaMuerta) return;

        const d = this.distanciaA(agente);
        if (d > this.radio) return;

        // Mientras más cerca, más energía le chupa
        const drenaje = d <= 1 ? this.drenajeCerca : this.drenajeLejos;
        agente.energia = Math.max(0, agente.energia - drenaje);
        agente.estado = `🌀 El portal del brujo drena la energía de C.C. (Energía: ${agente.energia}%)`;
    }

    dibujar(ctx) {
        const t = this.tamanoCasilla;
        const cx = (this.x + 0.5) * t;
        const cy = (this.y + 0.5) * t;

        // Aura morada que marca la zona de peligro (radio de drenaje)
        const radioAura = (this.radio + 0.5) * t;
        const degradado = ctx.createRadialGradient(cx, cy, 0, cx, cy, radioAura);
        degradado.addColorStop(0, 'rgba(88, 28, 135, 0.35)');
        degradado.addColorStop(1, 'rgba(147, 51, 234, 0)');
        ctx.fillStyle = degradado;
        ctx.beginPath();
        ctx.arc(cx, cy, radioAura, 0, Math.PI * 2);
        ctx.fill();

        if (!this.cargada) return;

        // Giro basado en el tiempo (no en cuántas veces se llama dibujar)
        const segundos = Date.now() / 1000;
        const angulo = -segundos * 1.2;
        const pulso = 1 + Math.sin(segundos * 2) * 0.06;
        const lado = t * 1.0 * pulso;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angulo);
        ctx.drawImage(this.imagen, -lado / 2, -lado / 2, lado, lado);
        ctx.restore();
    }
}