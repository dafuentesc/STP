// --- SIMULACIÓN DE DATOS DEL BACKEND ---
// En un proyecto real, esta función haría un 'fetch' a tu ruta backend (e.g., '/api/analitica-pruebas')
// y el backend devolvería un JSON con los resultados de la consulta SQL GROUP BY.

const datosAnaliticaSimulados = [
    {
        nombre_evaluacion: "Competencia Lectora",
        Total_Estudiantes: 5,
        Promedio_General: 749.6,
        Max_Puntaje: 954.0,
        Min_Puntaje: 471.0
    },
    {
        nombre_evaluacion: "Competencia Matemática",
        Total_Estudiantes: 3,
        Promedio_General: 810.0,
        Max_Puntaje: 980.0,
        Min_Puntaje: 650.0
    },
    {
        nombre_evaluacion: "Ciencias",
        Total_Estudiantes: 2,
        Promedio_General: 720.5,
        Max_Puntaje: 780.0,
        Min_Puntaje: 661.0
    }
    // Puedes agregar más objetos para simular otras pruebas
];


// --- LÓGICA PARA GENERAR LOS RECUADROS ---

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('analitica-container');

    // Función para formatear números (ej. 749.6 -> 750)
    const formatNumber = (num) => Math.round(num);

    // Iterar sobre cada conjunto de datos de evaluación
    datosAnaliticaSimulados.forEach(prueba => {
        // Crear la estructura de la columna que contendrá el recuadro
        const colDiv = document.createElement('div');
        // Usa col-md-4 para que sean 3 columnas en escritorio (12/3=4)
        colDiv.className = 'col-md-4'; 

        // Crear el contenido del recuadro (card)
        colDiv.innerHTML = `
            <div class="card-analitica">
                <h3 class="text-white">${prueba.nombre_evaluacion}</h3>
                
                <div class="mb-3">
                    <small class="text-secondary">Promedio General (PAES)</small>
                    <div class="kpi-value">${formatNumber(prueba.Promedio_General)}</div>
                </div>

                <ul class="list-unstyled">
                    <li class="mb-1">
                        <i class="fas fa-users text-info"></i> 
                        Total de Evaluados: <strong>${prueba.Total_Estudiantes}</strong>
                    </li>
                    <li class="mb-1">
                        <i class="fas fa-arrow-up text-success"></i> 
                        Puntaje Máximo: <strong>${formatNumber(prueba.Max_Puntaje)}</strong>
                    </li>
                    <li class="mb-1">
                        <i class="fas fa-arrow-down text-danger"></i> 
                        Puntaje Mínimo: <strong>${formatNumber(prueba.Min_Puntaje)}</strong>
                    </li>
                </ul>
            </div>
        `;
        
        // Agregar el recuadro al contenedor principal en el HTML
        container.appendChild(colDiv);
    });
});