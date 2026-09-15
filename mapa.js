// Suelo normal (costo 1), Base del Altar (costo 1), Fragmento de Espejo (costo 1), Hielo (costo 2), Nieve Profunda (costo 4)
export const TIPO_CASILLA = {
    VACIA: 0,       
    BASE_ESPEJO: 1,
    FRAGMENTO: 2,
    HIELO: 3,        
    NIEVE: 4         
};

// 1. Suelo Normal 
const TILE_SUELO = [
    "bbbbbbbb",
    "bBbbbbBb",
    "bbbbbbbb",
    "bbbbbbbb",
    "bbbbbbbb",
    "bBbbbbbb",
    "bbbbbbbb",
    "bbbbbbBb"
];

// Terreno de Hielo 
const TILE_HIELO = [
    "iiiiiiii",
    "iIiiiiIi",
    "iiiiiiii",
    "iiiCiiii",
    "iiiiiiii",
    "iIiCiiii",
    "iiiiiiii",
    "iiiiiiIi"
];

// Terreno de Nieve Profunda 
const TILE_NIEVE = [
    "ssssssss",
    "sSssssSs",
    "ssssssss",
    "sssSssss",
    "ssssssss",
    "sSssssss",
    "ssssssss",
    "ssssssSs"
];

// 4. Altar Base
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

// Paleta expandida de colores
const PALETA_MAPA = {
    // Suelo normal
    'b': '#0f172a', 
    'B': '#1e293b', 

    // Hielo
    'i': '#0284c7', 
    'I': '#38bdf8', 
    'C': '#bae6fd', 

    // Nieve
    's': '#cbd5e1', 
    'S': '#94a3b8', 

    // Altar
    'k': '#1e1b4b', 
    'K': '#312e81', 
    'E': '#6366f1', 
    'h': '#e0e7ff'  
};

// Matriz del mapa expandida a 25x10 
const MAPA_ESTATICO = [
    [0, 2, 0, 0, 4, 4, 4, 0, 0, 0, 3, 3, 3, 2, 0, 0, 4, 4, 0, 0, 3, 3, 0, 2, 0],
    [0, 0, 0, 0, 4, 2, 4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 4, 2, 4, 0, 3, 0, 0, 0, 0],
    [3, 3, 3, 0, 4, 4, 4, 0, 2, 0, 3, 0, 4, 4, 4, 0, 4, 4, 4, 0, 3, 0, 4, 4, 4],
    [3, 2, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 4, 2, 4, 0, 0, 0, 0, 0, 3, 0, 4, 2, 4],
    [3, 3, 3, 0, 4, 4, 4, 4, 4, 0, 0, 0, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 4, 4, 4],
    [0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0], 
    [0, 2, 0, 0, 4, 0, 3, 3, 3, 3, 3, 0, 0, 0, 3, 3, 3, 3, 3, 4, 0, 0, 2, 0, 0],
    [4, 4, 4, 0, 4, 0, 3, 2, 0, 0, 3, 0, 0, 0, 3, 2, 0, 0, 3, 4, 0, 4, 4, 4, 0],
    [0, 2, 0, 0, 0, 0, 3, 3, 3, 0, 3, 0, 0, 0, 3, 3, 3, 0, 3, 0, 0, 0, 2, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

export class Mapa {
    constructor(columnas = 25, filas = 10, tamanoCasilla = 40) {
        this.columnas = columnas;
        this.filas = filas;
        this.tamanoCasilla = tamanoCasilla;
        
        // Carga la matriz estática fijada
        this.grid = MAPA_ESTATICO.map(row => [...row]);
        
        // Coordenadas fijas del Altar (Columna 12, Fila 5)
        this.baseX = 12;
        this.baseY = 5;
    }

    // Helper para consulta de terreno desde Tacto
    obtenerTipoTerreno(x, y) {
        const tipo = this.grid[y][x];
        if (tipo === TIPO_CASILLA.NIEVE) return 'NIEVE';
        if (tipo === TIPO_CASILLA.HIELO) return 'HIELO';
        return 'NORMAL';
    }

    dibujar(ctx) {
        const tamPixel = this.tamanoCasilla / 8;

        for (let r = 0; r < this.filas; r++) {
            for (let c = 0; c < this.columnas; c++) {
                const posX = c * this.tamanoCasilla;
                const posY = r * this.tamanoCasilla;
                const tipo = this.grid[r][c];

                // Selección de textura según el tipo de terreno
                let plantilla = TILE_SUELO;
                if (tipo === TIPO_CASILLA.BASE_ESPEJO) plantilla = TILE_ALTAR;
                else if (tipo === TIPO_CASILLA.HIELO) plantilla = TILE_HIELO;
                else if (tipo === TIPO_CASILLA.NIEVE) plantilla = TILE_NIEVE;

                // Renderizar azulejo (8x8 píxeles)
                for (let px = 0; px < 8; px++) {
                    for (let py = 0; py < 8; py++) {
                        const charColor = plantilla[py][px];
                        ctx.fillStyle = PALETA_MAPA[charColor];
                        ctx.fillRect(posX + (px * tamPixel), posY + (py * tamPixel), tamPixel, tamPixel);
                    }
                }

                // Renderizado de FRAGMENTO DE ESPEJO (Cristal Roto Afilado)
                if (tipo === TIPO_CASILLA.FRAGMENTO) {
                    ctx.save();

                    // Aura/Resplandor exterior mágico
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
                    ctx.beginPath();
                    ctx.arc(posX + 20, posY + 20, 14, 0, Math.PI * 2);
                    ctx.fill();

                    // Base del cristal afilado
                    ctx.beginPath();
                    ctx.moveTo(posX + 22, posY + 6);   
                    ctx.lineTo(posX + 32, posY + 18);  
                    ctx.lineTo(posX + 24, posY + 34);  
                    ctx.lineTo(posX + 8,  posY + 26);  
                    ctx.lineTo(posX + 14, posY + 14);  
                    ctx.closePath();
                    ctx.fillStyle = '#0284c7'; 
                    ctx.fill();

                    // Faceta reflectante de cristal
                    ctx.beginPath();
                    ctx.moveTo(posX + 22, posY + 6);
                    ctx.lineTo(posX + 24, posY + 18);
                    ctx.lineTo(posX + 8,  posY + 26);
                    ctx.lineTo(posX + 14, posY + 14);
                    ctx.closePath();
                    ctx.fillStyle = '#bae6fd'; 
                    ctx.fill();

                    // Destello especular blanco
                    ctx.beginPath();
                    ctx.moveTo(posX + 22, posY + 6);
                    ctx.lineTo(posX + 27, posY + 12);
                    ctx.lineTo(posX + 18, posY + 20);
                    ctx.closePath();
                    ctx.fillStyle = '#ffffff'; 
                    ctx.fill();

                    ctx.restore();
                }

                // Rejilla discreta
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.strokeRect(posX, posY, this.tamanoCasilla, this.tamanoCasilla);
            }
        }
    }
}