// CONFIGURACIÓN INICIAL (ADAPTADO A PRUEBA PAES vs TIPO ENSAYO)
const COURSES = [ // Estas son las Pruebas PAES (nombre_evaluacion en la BD)
    'PAES Invierno',
    'PAES Verano',
    'Competencia Lectora',
    'Competencia Matemática',
    'M2'
];

const SERVER_URL = "http://localhost:3000"; // URL del servidor Express

let currentPaesTest = 'Competencia Lectora'; // Prueba PAES seleccionada por defecto
let appDataCache = {}; // Cache para los resultados cargados por prueba

// Instancias de Chart.js para actualizar sin recrear el canvas
let distributionChartInstance = null;
let topStudentsChartInstance = null;

// TABLAS DE CONVERSIÓN PAES (BASADO EN TUS IMAGENES)
const PAES_TABLES = {
    'Competencia Lectora': {
        // Adaptado de tablas de conversión
        0: 100, 1: 186, 2: 210, 3: 232, 4: 253, 5: 271, 6: 288, 7: 304, 8: 322, 9: 339, 10: 355, 11: 369, 12: 380, 13: 391, 14: 402, 15: 415, 16: 430, 17: 446, 18: 460, 19: 471, 20: 479, 21: 486, 22: 494, 23: 502, 24: 514, 25: 528, 26: 543, 27: 557, 28: 569, 29: 577, 30: 583, 31: 589, 32: 596, 33: 605, 34: 617, 35: 631, 36: 647, 37: 671, 38: 683, 39: 694, 40: 703, 41: 715, 42: 730, 43: 746, 44: 761, 45: 773, 46: 785, 47: 795, 48: 808, 49: 823, 50: 840, 51: 858, 52: 876, 53: 893, 54: 911, 55: 931, 56: 954, 57: 978, 58: 1000, 59: 1000, 60: 1000
    },
    'Competencia Matemática': {
        // Adaptado de tablas de conversión
        0: 100, 1: 173, 2: 199, 3: 222, 4: 244, 5: 265, 6: 284, 7: 301, 8: 316, 9: 331, 10: 346, 11: 362, 12: 378, 13: 391, 14: 402, 15: 412, 16: 422, 17: 434, 18: 447, 19: 462, 20: 476, 21: 487, 22: 496, 23: 503, 24: 510, 25: 518, 26: 529, 27: 542, 28: 557, 29: 570, 30: 581, 31: 589, 32: 596, 33: 602, 34: 610, 35: 621, 36: 634, 37: 648, 38: 662, 39: 674, 40: 683, 41: 691, 42: 700, 43: 710, 44: 723, 45: 738, 46: 753, 47: 767, 48: 779, 49: 792, 50: 805, 51: 821, 52: 838, 53: 856, 54: 875, 55: 894, 56: 915, 57: 938, 58: 964, 59: 992, 60: 1000
    }
    // NOTA: Si faltan otras pruebas (como PAES Invierno, Verano, M2) se usaría una tabla genérica o 
    // se le puede preguntar al usuario por sus tablas de conversión.
    // Por ahora, solo Lectora y Matemática tienen tablas específicas.
};

const MAX_CORRECTAS_PAES = 80;

/**
 * Convierte respuestas correctas a puntaje PAES.
 */
function convertToPaesScore(correctas, paesTest) {
    const table = PAES_TABLES[paesTest];
    if (!table) return null; // Devuelve null si no hay tabla para esa prueba
    const score = table[correctas];
    if (score !== undefined) {
        return score;
    }
    return correctas > 60 ? 1000 : 0; // Valor por defecto si se excede el rango (solo para este ejemplo)
}

/**
 * Calcula el promedio PAES para un estudiante (usando todos sus registros para la prueba activa).
 */
function calculateStudentAverage(rut, allResults) {
    const studentResults = allResults.filter(r => r.rut === rut);
    if (studentResults.length === 0) return 0;
    const totalScore = studentResults.reduce((sum, r) => sum + parseFloat(r.puntaje_paes), 0);
    return Math.round(totalScore / studentResults.length);
}

/**
 * Procesa los resultados del backend para calcular promedios.
 */
function processResults(results) {
    if (!results || results.length === 0) return [];
    const studentsRuts = [...new Set(results.map(r => r.rut))];
    const averages = {};
    
    studentsRuts.forEach(rut => {
        averages[rut] = calculateStudentAverage(rut, results);
    });

    const processed = results.map(result => ({
        ...result,
        promedio_parcial: averages[result.rut] 
    }));

    return processed;
}

/**
 * Renderiza la tabla de resultados.
 */
function renderNotesTable(paesTest) {
    const tableBody = document.querySelector('#notes-table tbody');
    const results = appDataCache[paesTest] || []; 
    const processedResults = processResults(results);
    let html = '';

    if (processedResults.length === 0) {
        html += `<tr><td colspan="8" class="text-center py-4 text-gray-400">No hay registros para esta prueba en la base de datos.</td></tr>`;
    } else {
        html = processedResults.map(r => `
            <tr data-registro-id="${r.registro_id}">
                <td>${r.rut}</td>
                <td>${r.nombre_estudiante}</td>
                <td>${r.nombre_evaluacion}</td> 
                <td>${r.numero_prueba}</td>
                <td>${r.respuestas_correctas}</td>
                <td class="${getScoreClass(r.puntaje_paes)}">${r.puntaje_paes}</td>
                <td class="${getScoreClass(r.promedio_parcial)}">${r.promedio_parcial || 'N/A'}</td>
                <td>
                    <button class="text-red-500 hover:text-red-700 font-bold" onclick="deleteNote('${r.registro_id}', '${r.nombre_estudiante}')">
                        <i class="fas fa-trash-alt"></i> ELIMINAR
                    </button>
                </td>
            </tr>
        `).join('');
    }

    tableBody.innerHTML = html;

    if (processedResults.length > 0) {
        const studentAveragesMap = processedResults.reduce((acc, r) => {
            acc[r.rut] = { 
                name: r.nombre_estudiante, 
                average: r.promedio_parcial 
            };
            return acc;
        }, {});
        
        const studentAverages = Object.values(studentAveragesMap).map(s => ({
            name: s.name,
            average: s.average
        }));

        renderDistributionChart(processedResults.map(r => r.puntaje_paes)); 
        renderTopStudentsChart(studentAverages); 
    } else {
        // Asegura que si no hay datos, se destruyan los gráficos existentes para liberar recursos.
        if (distributionChartInstance) { distributionChartInstance.destroy(); distributionChartInstance = null; }
        if (topStudentsChartInstance) { topStudentsChartInstance.destroy(); topStudentsChartInstance = null; }
        
        // Puedes agregar aquí un mensaje en el canvas si quieres que no se vea vacío
        // Para simplicidad, solo los destruyo.
    }
}

function getScoreClass(score) {
    if (score >= 800) return 'text-green-400 font-bold'; 
    if (score >= 700) return 'text-sky-400 font-bold';    
    if (score >= 500) return 'text-yellow-400 font-bold'; 
    return 'text-red-400 font-bold';                      
}

/**
 * Maneja el envío del formulario para registrar un nuevo resultado PAES.
 */
async function handleNoteSubmission(event) {
    event.preventDefault(); 

    // Obtención de datos
    const rut = document.getElementById('rut').value.trim();
    const studentName = document.getElementById('student-name').value.trim();
    const ensayoType = document.getElementById('ensayo-type').value; // -> numero_prueba
    const correctAnswers = parseInt(document.getElementById('correct-answers').value);
    const paesTestName = currentPaesTest; // -> nombre_evaluacion

    // Validación
    if (!rut || !studentName || !ensayoType || isNaN(correctAnswers) || correctAnswers < 0 || correctAnswers > MAX_CORRECTAS_PAES) {
        alert("Por favor, complete todos los campos y asegúrese de que las respuestas correctas sean válidas (0-80).");
        return;
    }
    if (paesTestName === 'NINGUNA') {
        alert("Debe seleccionar una Prueba PAES activa (Ej: Competencia Lectora) antes de registrar una nota.");
        return;
    }

    const paesScore = convertToPaesScore(correctAnswers, paesTestName);
    if (paesScore === null) {
        // En este caso, si la prueba no tiene una tabla de conversión, la asumo como una prueba de 80 preguntas.
        // Si no tienes la tabla de conversión, podrías usar una escala lineal o 
        // pedirle al usuario que complete la tabla de conversión en PAES_TABLES.
        alert(`Advertencia: No se encontró una tabla de conversión específica para la prueba "${paesTestName}". Usando puntaje 0-1000 por defecto.`);
        // Para evitar errores de backend, asignamos un valor, por ejemplo, asumiendo 80 correctas = 1000.
        // Esto es un parche temporal, lo ideal es tener todas las tablas.
        // Por ahora, usaremos 0 si no encuentra tabla (el convertToPaesScore devuelve null)
        return; 
    }

    // Preparación de Datos (Coinciden con las columnas de la BD)
    const dataToSend = {
        rut: rut,
        nombre_estudiante: studentName, 
        nombre_evaluacion: paesTestName, // Nombre de la prueba (e.j., Competencia Lectora)
        numero_prueba: ensayoType,       // Tipo de ensayo (e.j., Ensayo 1)
        respuestas_correctas: correctAnswers, 
        puntaje_paes: paesScore, 
    };

    // Conexión al Backend (POST)
    try {
        const response = await fetch(`${SERVER_URL}/api/resultados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Nota registrada exitosamente para ${paesTestName} - ${ensayoType}. Puntaje PAES: ${paesScore}`);
            document.getElementById('note-form').reset();
            fetchResults(paesTestName);
        } else {
            alert(`Error al registrar nota: ${result.message || 'Error desconocido'}`);
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        alert("Error al conectar con el servidor. Verifique que Node.js esté ejecutándose.");
    }
}

/**
 * Elimina un registro de nota de la base de datos.
 */
async function deleteNote(registroId, studentName) {
    // Usamos el id del registro y no el rut, ya que el ID es único para cada nota individual.
    if (!confirm(`¿Estás seguro de que quieres eliminar el registro de ${studentName}?`)) {
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/resultados/${registroId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Registro de ${studentName} eliminado exitosamente.`);
            fetchResults(currentPaesTest);
        } else {
            alert(`Error al eliminar el registro: ${result.message || 'Error desconocido'}`);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        alert("Error al conectar con el servidor. Verifique que Node.js esté ejecutándose.");
    }
}


/**
 * Maneja la selección de una nueva Prueba PAES y actualiza la UI.
 */
function selectCourse(paesTestName) {
    currentPaesTest = paesTestName;
    document.getElementById('current-course-display').textContent = paesTestName;
    document.getElementById('detail-course-title').textContent = paesTestName;

    document.querySelectorAll('.btn-course').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === paesTestName) {
            btn.classList.add('active');
        }
    });

    fetchResults(paesTestName);
}

/**
 * Obtiene los resultados del backend para la prueba PAES dada.
 */
async function fetchResults(paesTestName) {
    try {
        const response = await fetch(`${SERVER_URL}/api/resultados?nombre_evaluacion=${encodeURIComponent(paesTestName)}`);
        
        if (!response.ok) {
            console.error(`Error al cargar los datos del curso. Respuesta no válida del servidor.`);
            appDataCache[paesTestName] = [];
            renderNotesTable(paesTestName);
            return;
        }

        const results = await response.json();
        appDataCache[paesTestName] = results;
        renderNotesTable(paesTestName); 

    } catch (error) {
        console.error('Error al obtener datos del servidor:', error);
        // Si hay error de conexión, se vacía la caché y se muestra el error
        // para que no se vea la tabla congelada.
        appDataCache[paesTestName] = [];
        renderNotesTable(paesTestName);
    }
}

/**
 * Inicializa los botones de selección de curso (Prueba PAES).
 */
function initializeCourseButtons() {
    const container = document.getElementById('course-buttons');
    container.innerHTML = ''; // Limpiar por si acaso
    COURSES.forEach(course => {
        const button = document.createElement('button');
        button.className = 'btn-course';
        button.textContent = course;
        button.onclick = () => selectCourse(course);
        container.appendChild(button);
    });

    if (COURSES.length > 0) {
        // Inicia el sistema seleccionando la primera prueba de la lista.
        selectCourse(COURSES[0]); 
    }
}

// -----------------------------------------------------------------
// LÓGICA DE GRÁFICOS (DEJADA AQUÍ PARA COMPLETITUD, PERO NO MODIFICADA)
// -----------------------------------------------------------------

/**
 * Función genérica para renderizar el gráfico de distribución de puntajes (Histograma/Barras).
 */
function renderDistributionChart(scores) {
    const ctx = document.getElementById('distribution-chart').getContext('2d');
    
    // Agrupa los puntajes por rangos (ejemplo: 400-499, 500-599, etc.)
    const scoreRanges = { '0-499': 0, '500-699': 0, '700-799': 0, '800-1000': 0};

    scores.forEach(score => {
        const s = parseInt(score);
        if (s >= 0 && s <= 499) scoreRanges['0-499']++;
        else if (s >= 500 && s <= 699) scoreRanges['500-699']++;
        else if (s >= 700 && s <= 799) scoreRanges['700-799']++;
        else if (s >= 800 && s <= 1000) scoreRanges['800-1000']++;
        
    });

    const data = {
        labels: Object.keys(scoreRanges),
        datasets: [{
            label: 'Frecuencia de Puntajes',
            data: Object.values(scoreRanges),
            backgroundColor: [
                'rgba(255, 99, 132, 0.6)', 
                'rgba(241, 238, 6, 0.88)',
                'rgba(10, 199, 206, 0.6)',
                'rgba(50, 209, 18, 0.6)',
            ],
            borderColor: '#f3f4f6',
            borderWidth: 1
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Número de Estudiantes', color: '#f3f4f6' },
                ticks: { color: '#9ca3af' }
            },
            x: {
                title: { display: true, text: 'Rango de Puntaje PAES', color: '#f3f4f6' },
                ticks: { color: '#9ca3af' }
            }
        },
        plugins: {
            legend: { display: false },
            title: { display: false }
        }
    };

    if (distributionChartInstance) distributionChartInstance.destroy();
    distributionChartInstance = new Chart(ctx, { type: 'bar', data: data, options: options });
}

/**
 * Función genérica para renderizar el gráfico de Top 5 Estudiantes por Promedio.
 */
function renderTopStudentsChart(studentAverages) {
    const ctx = document.getElementById('top-students-chart').getContext('2d');
    
    // 1. Ordenar y tomar el Top 5
    const topStudents = studentAverages
        .sort((a, b) => b.average - a.average)
        .slice(0, 5);
    
    const labels = topStudents.map(s => s.name.split(' ')[0] + ' ' + s.name.split(' ')[1][0] + '.'); // Nombre y primera inicial del apellido
    const dataValues = topStudents.map(s => s.average);

    const data = {
        labels: labels,
        datasets: [{
            label: 'Promedio PAES',
            data: dataValues,
            backgroundColor: [
                '#10b981', // Verde
                '#3b82f6', // Azul
                '#f59e0b', // Amarillo
                '#ef4444' // Rojo
            
            ],
            borderColor: '#f3f4f6',
            borderWidth: 1
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Gráfico de barras horizontal
        scales: {
            x: {
                beginAtZero: true,
                max: 1000,
                title: { display: true, text: 'Promedio PAES', color: '#f3f4f6' },
                ticks: { color: '#9ca3af' }
            },
            y: {
                ticks: { color: '#9ca3af' }
            }
        },
        plugins: {
            legend: { display: false },
            title: { display: false }
        }
    };

    if (topStudentsChartInstance) topStudentsChartInstance.destroy();
    topStudentsChartInstance = new Chart(ctx, { type: 'bar', data: data, options: options });
}


// ... (Todo el código anterior de script.js se mantiene igual)

// -----------------------------------------------------------------
// NUEVAS FUNCIONES DE GENERACIÓN DE REPORTES (DEBES REEMPLAZAR LA FUNCIÓN PLACEHOLDER)
// -----------------------------------------------------------------

/**
 * Función principal para generar el reporte basado en el formato.
 */
async function generateReport(format) {
    const results = appDataCache[currentPaesTest] || [];
    if (results.length === 0) {
        alert(`No hay datos para generar el reporte de ${currentPaesTest}.`);
        return;
    }
    
    // Procesamos los resultados para obtener los promedios parciales que se muestran en la tabla
    const dataToExport = processResults(results); 
    const filename = `${currentPaesTest}_Reporte`;

    try {
        if (format === 'pdf') {
            await generatePdfReport(filename, dataToExport);
        } else if (format === 'excel') {
            generateExcelReport(filename, dataToExport);
        } else if (format === 'word') {
            generateWordReport(filename, dataToExport);
        } else {
            alert("Formato de reporte no soportado.");
        }
    } catch (error) {
        console.error(`Error al generar el reporte ${format}:`, error);
        alert(`Hubo un error al generar el archivo ${format}. Revise la consola.`);
    }
}

/**
 * Genera el reporte en formato PDF (usando html2canvas y jsPDF).
 * Exporta directamente la tabla que ya está renderizada.
 */
async function generatePdfReport(filename, data) {
    // Tomamos el elemento que contiene la tabla
    const element = document.getElementById('notes-table'); 
    
    // Convertimos la tabla a imagen (canvas)
    const canvas = await html2canvas(element, { scale: 2, logging: false });
    const imgData = canvas.toDataURL('image/png');
    
    // Usamos jsPDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' para landscape (horizontal), A4

    const imgWidth = 280; // A4 landscape width approx
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Añadir encabezado
    pdf.setFontSize(16);
    pdf.text(`Reporte PAES: ${currentPaesTest}`, 10, 10);
    pdf.setFontSize(10);
    pdf.text(`Fecha de Generación: ${new Date().toLocaleDateString()}`, 10, 15);
    
    // Añadir la imagen de la tabla al PDF
    pdf.addImage(imgData, 'PNG', 10, 20, imgWidth - 20, imgHeight - 20); 

    pdf.save(`${filename}.pdf`);
    alert("¡PDF generado con éxito!");
}

/**
 * Genera el reporte en formato Excel (usando SheetJS/xlsx).
 */
function generateExcelReport(filename, data) {
    // 1. Mapear los datos para las columnas del Excel
    const worksheetData = data.map(r => ({
        RUT: r.rut,
        ALUMNO: r.nombre_estudiante,
        'PRUEBA PAES': r.nombre_evaluacion,
        'TIPO ENSAYO': r.numero_prueba,
        'RESPUESTAS CORRECTAS': r.respuestas_correctas,
        'PUNTAJE PAES': r.puntaje_paes,
        'PROMEDIO PARCIAL': r.promedio_parcial
    }));

    // 2. Crear la hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    
    // 3. Crear el libro de trabajo (workbook) y añadir la hoja
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, currentPaesTest);
    
    // 4. Escribir el archivo binario y forzar la descarga
    XLSX.writeFile(wb, `${filename}.xlsx`);
    alert("¡Excel generado con éxito!");
}

/**
 * Genera un reporte en formato Word (.doc o .docx simple) usando FileSaver.js
 * (La generación de DOCX requiere librerías complejas como docxtemplater. Aquí solo se genera un HTML que Word puede abrir).
 */
function generateWordReport(filename, data) {
    // Generamos una representación HTML simple de la tabla para que Word la pueda interpretar (.doc)
    const headers = ["RUT", "Alumno", "Prueba PAES", "Tipo Ensayo", "Correctas", "Puntaje PAES", "Promedio Parcial"];
    
    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Notas</title>
            <style>
                body { font-family: sans-serif; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Reporte PAES: ${currentPaesTest}</h1>
            <p>Generado el: ${new Date().toLocaleDateString()}</p>
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.map(r => `
                        <tr>
                            <td>${r.rut}</td>
                            <td>${r.nombre_estudiante}</td>
                            <td>${r.nombre_evaluacion}</td>
                            <td>${r.numero_prueba}</td>
                            <td>${r.respuestas_correctas}</td>
                            <td>${r.puntaje_paes}</td>
                            <td>${r.promedio_parcial}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    // Crea un Blob (Binary Large Object) con el contenido y lo guarda como .doc
    const blob = new Blob([htmlContent], {
        type: "application/vnd.ms-word"
    });
    
    saveAs(blob, `${filename}.doc`);
    alert("¡Word generado con éxito! (Se descarga como archivo .doc con formato HTML simple)");
}


// ... (El resto del código como la ejecución inicial document.addEventListener('DOMContentLoaded', initializeCourseButtons); se mantiene)

// -----------------------------------------------------------------
// EJECUCIÓN INICIAL (CORRECCIÓN)
// -----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', initializeCourseButtons);