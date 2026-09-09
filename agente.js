// agente.js
import { TIPO_CASILLA } from './mapa.js';

//  de colores para C.C (Agente)
const PALETA = {
    '.': null,                  // Transparente
    'K': '#121212',             // Delineado negro
    'G': '#8cd838',             // Pelo verde C.C.
    'g': '#b4f05c',             // Brillo de pelo
    'S': '#fbe2c3',             // Piel
    'E': '#cca028',             // Ojos dorados
    'M': '#b88168',             // Sombra rostro / boca
    'W': '#ffffff',             // Traje blanco
    'D': '#3b3154'              // Detalles traje morado/rojo
};

//  Sprite de C.C. 
// Matriz para dibujar al agente
const SPRITE_CC = [
    ".....KKKKKK.....",
    "...KKGGGGGGKK...",
    "..KGGgGGGGgGGK..",
    "..KGGGGGGGGGGK..",
    "..KGGSSSSSSGGK..",
    "..KGGSEESEEGGK..",
    "..KGGSKMMKSGGK..",
    "..KGGSSSSSSGGK..",
    ".KKGGSKKKKSGGKK.",
    ".KGGGWWWWWWGGGK.",
    ".KGGGWWDDWWGGGK.",
    ".KGGGWWDDWWGGGK.",
    "..KGGWWWWWWGGK..",
    "...KKWWDDWWKK...",
    "....KWW..WWK....",
    "....KWW..WWK....",
    "....KDD..DDK....",
    "....KKK..KKK...."
];

export class AgenteCC {
    constructor(x, y, tamanoCasilla = 40) {
        this.x = x;
        this.y = y;
        this.tamanoCasilla = tamanoCasilla;
        
        this.energia = 100;
        this.tieneFragmento = false;
        this.fragmentosRecolectados = 0;
    }

    // Percepcion del agente
    // La funcion de este metodo es actuar como los ojos del agente, extrae informacion del entorno en el instante de cada ciclo. Siempre en el ahora

    // const casillaActual = mapa.grid[this.y][this.x]; Esta funcion toma la matriz del mapa utilizando las coordenadas (x, y) donde se encuentra el agente
    //actualmente para saber que elemento u objeto hay en una casilla en especifico.

    //return { ... }; - Devuelve el estado de un objeto en valores booleanos
    //hayFragmento: - true si la casilla actual contiene un fragmento de espejo.
    //enBase: true si C.C.(Agente) - esta parada sobre la casilla del altar central.
    //energiaBaja: true - estado de la energia

    percibir(mapa) {
        const casillaActual = mapa.grid[this.y][this.x];
        return {
            hayFragmento: casillaActual === TIPO_CASILLA.FRAGMENTO,
            enBase: casillaActual === TIPO_CASILLA.BASE_ESPEJO,
            energiaBaja: this.energia <= 20
        };
    }




    // reglaReflejo(percepcion) - Es el nucleo del Agente T0. Recibe los datos de percepcion 
    //Es el núcleo conceptual del Agente de Reflejo Simple. Recibe el paquete de datos creado por percibir() y aplica una tabla estricta de reglas de prioridad mediante declaraciones if:



    reglaReflejo(percepcion) {
        if (percepcion.hayFragmento && !this.tieneFragmento) {
            return 'RECOGER_FRAGMENTO';
        }
        if (percepcion.enBase && this.tieneFragmento) {
            return 'DEPOSITAR_FRAGMENTO';
        }
        if (percepcion.enBase && percepcion.energiaBaja) {
            return 'RECARGAR';
        }
        return 'MOVER_ALEATORIO';
    }

    // Ejecución de la acción
    actuar(accion, mapa) {
        switch (accion) {
            case 'RECOGER_FRAGMENTO':
                this.tieneFragmento = true;
                mapa.grid[this.y][this.x] = TIPO_CASILLA.VACIA;
                console.log("C.C. recogió un fragmento de espejo.");
                break;

            case 'DEPOSITAR_FRAGMENTO':
                this.tieneFragmento = false;
                this.fragmentosRecolectados++;
                console.log(`C.C. colocó un fragmento en el espejo. Total: ${this.fragmentosRecolectados}`);
                break;

            case 'RECARGAR':
                this.energia = 100;
                console.log("C.C. recargó su energía en la base.");
                break;

            case 'MOVER_ALEATORIO':
                const direcciones = [
                    { dx: 0, dy: -1 },
                    { dx: 0, dy: 1 },
                    { dx: -1, dy: 0 },
                    { dx: 1, dy: 0 }
                ];
                const d = direcciones[Math.floor(Math.random() * direcciones.length)];
                
                const nuevoX = this.x + d.dx;
                const nuevoY = this.y + d.dy;

                if (nuevoX >= 0 && nuevoX < mapa.columnas && nuevoY >= 0 && nuevoY < mapa.filas) {
                    this.x = nuevoX;
                    this.y = nuevoY;
                    this.energia -= 2;
                }
                break;
        }
    }

    // Renderizado del sprite pixel por pixel en Canvas
    dibujar(ctx) {
        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;

        // Resplandor si lleva un fragmento de espejo
        if (this.tieneFragmento) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.fillRect(posX, posY, this.tamanoCasilla, this.tamanoCasilla);
        }

        const filas = SPRITE_CC.length;
        const cols = SPRITE_CC[0].length;
        
        // Calcula el tamaño de cada "píxel" dentro de la casilla de 40px
        const tamPixel = 2; 

        // Centrado del personaje en la casilla
        const offsetX = posX + (this.tamanoCasilla - (cols * tamPixel)) / 2;
        const offsetY = posY + (this.tamanoCasilla - (filas * tamPixel)) / 2;

        // Recorrido de la matriz para pintar pixel por pixel
        for (let r = 0; r < filas; r++) {
            for (let c = 0; c < cols; c++) {
                const charColor = SPRITE_CC[r][c];
                const colorHex = PALETA[charColor];

                if (colorHex) {
                    ctx.fillStyle = colorHex;
                    ctx.fillRect(
                        offsetX + (c * tamPixel),
                        offsetY + (r * tamPixel),
                        tamPixel,
                        tamPixel
                    );
                }
            }
        }
    }
}