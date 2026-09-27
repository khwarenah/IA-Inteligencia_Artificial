
const musicaFondo = new Audio('./audio/wind_of_winterbell.mp3');


musicaFondo.loop = true;   
musicaFondo.volume = 0.80; 


export function reproducirMusica() {
    musicaFondo.play().catch(error => {
        console.log("Audio a la espera de interacción del usuario:", error);
    });
}


export function pausarMusica() {
    musicaFondo.pause();
}


export function alternarMusica() {
    if (musicaFondo.paused) {
        reproducirMusica();
    } else {
        pausarMusica();
    }
}

/**
 * Ajusta el volumen de la música.
 * @param {number} nivel - Valor decimal entre 0.0 (silencio) y 1.0 (máximo).
 */
export function ajustarVolumen(nivel) {
    musicaFondo.volume = Math.max(0, Math.min(1, nivel));
}