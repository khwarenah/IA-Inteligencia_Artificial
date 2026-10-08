// fisica/constantesFisica.js

export const FISICA = {
    // Constante de gravitación universal para el modelo, se puede modificar para ajustar la intensidad de las fuerzas
    G: 10.0,
    // Epsilon para evitar divisiones por cero al estar en la misma casilla
    EPSILON: 1.0,

    // Masas y pesos en kg
    MASAS: {
        CC_BASE: 46.5,
        FRAGMENTO: 5.0,     // Peso adicional que carga C.C., y masa del cristal en el mapa
        ALTAR: 200.0,       // Gran masa atractora
        DRAGON: 400.0,      // Enorme masa repulsora (amenaza letal)
        BRUJO: 80.0,        // Masa repulsora secundaria
        ALIADA: 50.0,       // Masa aliada (atractora para apoyo)
        TRAMPA: 30.0        // Repulsor local (peligro menor)
    },

    // Polaridad por defecto (desde la perspectiva de C.C.)
    // 1 = Atracción, -1 = Repulsión
    POLARIDAD_CC: {
        FRAGMENTO: 1,
        ALTAR: 1,
        ALIADA: 0.5,        // Ligera atracción hacia aliados
        DRAGON: -1,         // Fuerte repulsión
        BRUJO: -1,
        TRAMPA: -1
    }
};
