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
        this.tasaRecarga = 20;
        this.tieneFragmento = false;
        this.fragmentosRecolectados = 0;

        this.estado = "Dormida";
      
    }

    // 5 Sentidos para el Agente

    // Vista del agente, aplicando la distancia de Chebyshev
    //Doble bucle (dx, dy de -1 a 1) xplora un desplazamiento relativo alrededor de C.C., 
    //generando las 9 casillas del área de observación (radio Chebyshev $r = 1$)
    //Validación de límites (if): Garantiza que las coordenadas calculadas nx y ny esten dentro de los límites del mapa 
    // evitando errores por índices fuera de rango.
    // Retorno de datos (push): Empaqueta la posición absoluta y 
    // el valor almacenado en mapa.grid[ny][nx] para que A* sepa qué casillas adyacentes son explorables.


    percibirVista(mapa) {
        const observacion = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = this.x + dx;
                const ny = this.y + dy;

                if (nx >= 0 && nx < mapa.columnas && ny >= 0 && ny < mapa.filas) {
                    observacion.push({
                        x: nx,
                        y: ny,
                        contenido: mapa.grid[ny][nx]
                    });
                }
            }
        }
        return observacion;
    }

    // Oido del agente utilizando Distancia de Manhattan al Altar Base
    //Cálculo Manhattan: Determina los pasos ortogonales directos mediante la suma de las diferencias absolutas de las coordenadas x e y entre la posición del agente y la posición base del altar.
    // Clasificación de intensidad: Basado en la distancia calculada, se asigna un nivel de percepción auditiva (FUERTE, MEDIO, DEBIL) que indica qué tan cerca está el agente del altar.
    percibirOido(posicionBase = { x: 7, y: 5 }) {
        const d = Math.abs(this.x - posicionBase.x) + Math.abs(this.y - posicionBase.y);
        let nivel = 'DEBIL';
        if (d <= 2) nivel = 'FUERTE';
        else if (d <= 5) nivel = 'MEDIO';
        
        return { nivel, distancia: d };
    }

    // Olfato del agente utilizando la Gradiente Inverso al Fragmento mas Cercano
    // if inicial - Si no quedan fragmentos en el mapa, retorna un objeto con intensidad 0, distancia infinita y objetivo nulo.
    //Algoritmo del vecino más cercano (forEach) - Itera sobre cada fragmento en la lista, calculando la distancia Manhattan desde la posición del agente hasta el fragmento.
    // Actualización de la distancia mínima - Si la distancia calculada es menor que la distancia mínima almacenada, actualiza dMin y establece el fragmento actual como el objetivo más cercano.
    // Cálculo de intensidad - La intensidad del olor se calcula como el inverso de la distancia más uno (1 / (dMin + 1)), asegurando que la intensidad disminuya a medida que la distancia aumenta.
    percibirOlfato(listaFragmentos = []) {
        if (listaFragmentos.length === 0) return { intensidad: 0, distancia: Infinity, objetivo: null };

        let dMin = Infinity;
        let objetivoCercano = null;

        listaFragmentos.forEach(frag => {
            const d = Math.abs(this.x - frag.x) + Math.abs(this.y - frag.y);
            if (d < dMin) {
                dMin = d;
                objetivoCercano = frag;
            }
        });

        const intensidad = 1 / (dMin + 1);
        return { intensidad, distancia: dMin, objetivo: objetivoCercano };
    }

    // Tacto para el agente utilizando Costo de Terreno Actual y Validación de Paredes
    // La función percibirTacto(mapa) determina el tipo de casilla en la que se encuentra el agente y asigna un costo de movimiento basado en ese tipo.
    // Además, proporciona una función puedoMovermeA(nx, ny) que valida si las coordenadas propuestas están dentro de los límites del mapa, 
    // asegurando que el agente no intente moverse fuera del área definida.
    // La función retorna un objeto que incluye el tipo de casilla actual, el costo de movimiento y la función de validación de movimiento.
    percibirTacto(mapa) {
        const casillaActual = mapa.grid[this.y][this.x];
        
        // Asignación de costo segun el tipo de casilla en la que se encuentre (Nieve/Hielo/Normal)
        let costoTerreno = 1;
        if (casillaActual === TIPO_CASILLA.NIEVE) costoTerreno = 4;
        else if (casillaActual === TIPO_CASILLA.HIELO) costoTerreno = 2;

        return {
            casillaActual,
            costoMovimiento: costoTerreno,
            puedoMovermeA: (nx, ny) => (nx >= 0 && nx < mapa.columnas && ny >= 0 && ny < mapa.filas)
        };
    }

    // Gusto del agente para evaluar la calidad y eficiencia de la recarga en la base
    // La función percibirGusto(baseEstable) evalúa la eficiencia de la recarga de energía del agente en la base.
    // Si la base está estable, la eficiencia es máxima (1.0), de lo contrario, es reducida (0.25).
    // La función retorna un objeto que incluye la eficiencia y la cantidad de energía que se puede recargar, 
    // asegurando que no exceda el 100% de energía del agente.
    percibirGusto(baseEstable = true) {
        const u = baseEstable ? 1.0 : 0.25;
        return {
            eficiencia: u,
            energiaARecargar: Math.min(100 - this.energia, this.tasaRecarga * u)
        };
    }

    // Método principal de percepción que combina los 5 sentidos del agente
    // La función percibir(mapa, posicionBase, listaFragmentos, baseEstable) integra los cinco sentidos del agente para proporcionar un paquete completo de información sensorial.
    // Retorna un objeto que incluye banderas básicas (hayFragmento, enBase, energiaIncompleta) y los resultados de cada sentido (vista, oido, olfato, tacto, gusto).
    percibir(mapa, posicionBase, listaFragmentos, baseEstable) {
        const casillaActual = mapa.grid[this.y][this.x];
        
        return {
            // banderas basicas para la logica rapida
            hayFragmento: casillaActual === TIPO_CASILLA.FRAGMENTO,
            enBase: casillaActual === TIPO_CASILLA.BASE_ESPEJO,
            energiaIncompleta: this.energia < 100,

            // Paquete sensorial 
            vista: this.percibirVista(mapa),
            oido: this.percibirOido(posicionBase),
            olfato: this.percibirOlfato(listaFragmentos),
            tacto: this.percibirTacto(mapa),
            gusto: this.percibirGusto(baseEstable)
        };
    }



    // reglaReflejo(percepcion) - Es el nucleo del Agente T0. Recibe los datos de percepcion 
    //Es el núcleo conceptual del Agente de Reflejo Simple. Recibe el paquete de datos creado por percibir() y aplica una tabla estricta de reglas de prioridad mediante declaraciones if:



    reglaReflejo(percepcion) {
        if (this.energia <= 0) {
        return 'SIN_ENERGIA';
    }
        if (percepcion.hayFragmento && !this.tieneFragmento) {
            return 'RECOGER_FRAGMENTO';
        }
        if (percepcion.enBase && this.tieneFragmento) {
            return 'DEPOSITAR_FRAGMENTO';
        }
        if (percepcion.enBase && percepcion.energiaIncompleta) {
            return 'RECARGAR';
        }
        return 'MOVER_ALEATORIO';
    }

    // Acciones que realiza el agente
    actuar(accion, mapa) {
        switch (accion) {
            case 'SIN_ENERGIA':
            this.estado = "la Agente t0 C.C. ha entrado en un letargo eterno.";
            console.log("la Agente t0 C.C.ha entrado en un letargo eterno.");
            break;

            case 'RECOGER_FRAGMENTO':
                this.tieneFragmento = true;
                mapa.grid[this.y][this.x] = TIPO_CASILLA.VACIA;
                console.log("C.C. recupero un fragmento de espejo.");
                break;

            case 'DEPOSITAR_FRAGMENTO':
                this.tieneFragmento = false;
                this.fragmentosRecolectados++;
                console.log(`C.C. deposito un fragmento en el altar. Total: ${this.fragmentosRecolectados}`);
                break;

            case 'RECARGAR':
                this.energia = Math.min(100, this.energia + this.tasaRecarga);
                this.estado = `La agente C.C. esta recuperando energia en el altar. (${this.energia}%)`;
                console.log(`La agente C.C. esta recuperando energia en el altar. Energia actual: ${this.energia}%`);
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
                    this.energia -= 1;
                }
                this.estado = this.tieneFragmento ? "Vagando con  un Fragmento del espejo por el mundo sin rumbo" : "Busqueda";
                break;
        }
    }

    // Renderizado del agente en el canvas
    dibujar(ctx) {
        const posX = this.x * this.tamanoCasilla;
        const posY = this.y * this.tamanoCasilla;

        // Resplandor en caso de que lleve un fragmento de espejo
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