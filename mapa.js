// mapa.js
export const TIPO_CASILLA = {
    VACIA: 0,
    BASE_ESPEJO: 1,
    FRAGMENTO: 2
};

// Textura de Nieve / Hielo despejado (8x8 píxeles)
const TILE_HIELO = [
    "bbbbbbbb",
    "bBbbbbBb",
    "bbbbbbbb",
    "bbbCbbbb",
    "bbbbbbbb",
    "bBbCbbbb",
    "bbbbbbbb",
    "bbbbbbBb"
];

// Textura del Altar del Espejo Central (8x8 píxeles)
const TILE_ALTAR = [
    "kkkkkkkk",
    "kKKKKKKk",
    "kKEEEEKK",
    "kKEhhEEK",
    "kKEhhEEK",
    "kKEEEEKK",
    "kKKKKKKk",
    "kkkkkkkk"
];

const PALETA_MAPA = {
    'b': '#0f172a', // Azul noche (suelo)
    'B': '#1e293b', // Detalle nieve
    'C': '#38bdf8', // Brillo de hielo
    'k': '#1e1b4b', // Borde altar
    'K': '#312e81', // Piedra
    'E': '#6366f1', // Marco
    'h': '#e0e7ff'  // Cristal central
};

export class Mapa {
    constructor(columnas = 10, filas = 10, tamanoCasilla = 40) {
        this.columnas = columnas;
        this.filas = filas;
        this.tamanoCasilla = tamanoCasilla;
        
        // Creacion de una cuadricula limpia sin muros
        this.grid = Array(filas).fill(null).map(() => Array(columnas).fill(TIPO_CASILLA.VACIA));
        
        // Posicion el altar
        this.baseX = Math.floor(columnas / 2);
        this.baseY = Math.floor(filas / 2);
        this.grid[this.baseY][this.baseX] = TIPO_CASILLA.BASE_ESPEJO;

        this.generarFragmentos(10);
    }

    generarFragmentos(cantidad) {
        let colocados = 0;
        while (colocados < cantidad) {
            const x = Math.floor(Math.random() * this.columnas);
            const y = Math.floor(Math.random() * this.filas);

            // Asegurar que solo se coloquen en casillas totalmente vacías
            if (this.grid[y][x] === TIPO_CASILLA.VACIA) {
                this.grid[y][x] = TIPO_CASILLA.FRAGMENTO;
                colocados++;
            }
        }
    }

    dibujar(ctx) {
        const tamPixel = this.tamanoCasilla / 8;

        for (let r = 0; r < this.filas; r++) {
            for (let c = 0; c < this.columnas; c++) {
                const posX = c * this.tamanoCasilla;
                const posY = r * this.tamanoCasilla;
                const tipo = this.grid[r][c];

                // Textura del suelo o altar
                const plantilla = (tipo === TIPO_CASILLA.BASE_ESPEJO) ? TILE_ALTAR : TILE_HIELO;

                for (let px = 0; px < 8; px++) {
                    for (let py = 0; py < 8; py++) {
                        const charColor = plantilla[py][px];
                        ctx.fillStyle = PALETA_MAPA[charColor];
                        ctx.fillRect(posX + (px * tamPixel), posY + (py * tamPixel), tamPixel, tamPixel);
                    }
                }

                // Fragmento de espejo
                if (tipo === TIPO_CASILLA.FRAGMENTO) {
                    ctx.fillStyle = '#06b6d4';
                    ctx.fillRect(posX + 15, posY + 15, 10, 10);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(posX + 18, posY + 18, 4, 4);
                }

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.strokeRect(posX, posY, this.tamanoCasilla, this.tamanoCasilla);
            }
        }
    }
}