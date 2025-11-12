// -----------------------------------------------------
// 1. IMPORTACIONES (REQUIRES)
// -----------------------------------------------------
const express = require('express');
const mysql = require('mysql2/promise'); // Conector para MySQL
const cors = require('cors'); // Para permitir conexiones desde el frontend

// -----------------------------------------------------
// 2. INICIALIZACIÓN DE VARIABLES GLOBALES Y EXPRESS (APP)
// -----------------------------------------------------
const app = express();
const port = 3000; 

// -----------------------------------------------------
// CONFIGURACIÓN de la Conexión a MySQL (¡AJUSTA ESTOS VALORES!)
// -----------------------------------------------------
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root', // <-- ¡CAMBIA ESTO!
    database: 'bd_paes', 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// -----------------------------------------------------
// 3. MIDDLEWARE (Debe ir antes de las rutas API)
// -----------------------------------------------------
app.use(cors()); // Permite peticiones del frontend
app.use(express.json()); // Permite a Express leer cuerpos JSON

// -----------------------------------------------------
// 4. RUTAS CRUD (API)
// -----------------------------------------------------

/**
 * [POST] /api/resultados - Guarda un nuevo registro.
 * Recibe: rut, nombre_estudiante, nombre_evaluacion (ej: Lectora), numero_prueba (ej: Ensayo 1), respuestas_correctas, puntaje_paes
 */
app.post('/api/resultados', async (req, res) => {
    // Los campos son ahora nombre_evaluacion y numero_prueba
    const { rut, nombre_estudiante, nombre_evaluacion, numero_prueba, respuestas_correctas, puntaje_paes } = req.body;

    // Validación básica de datos
    if (!rut || !nombre_estudiante || !nombre_evaluacion || !numero_prueba || 
        respuestas_correctas === undefined || puntaje_paes === undefined) {
        return res.status(400).json({ message: "Faltan campos obligatorios para guardar el registro." });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // LA QUERY SE ACTUALIZA PARA USAR nombre_evaluacion y numero_prueba
        const query = `
            INSERT INTO resultados_paes 
            (rut, nombre_estudiante, nombre_evaluacion, numero_prueba, respuestas_correctas, puntaje_paes) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [rut, nombre_estudiante, nombre_evaluacion, numero_prueba, respuestas_correctas, puntaje_paes];

        const [results] = await connection.execute(query, values);
        
        res.status(201).json({ 
            message: "Registro creado exitosamente", 
            registro_id: results.insertId 
        });

    } catch (error) {
        console.error('Error al insertar en la base de datos:', error);
        // Manejo de error de clave única duplicada
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: "Ya existe un resultado registrado para este RUT, prueba PAES y número de ensayo." });
        } else {
            res.status(500).json({ message: "Error interno del servidor al registrar nota.", error: error.message });
        }
    } finally {
        if (connection) connection.end();
    }
});


/**
 * [GET] /api/resultados - Obtiene todos los resultados filtrados por nombre_evaluacion.
 */
app.get('/api/resultados', async (req, res) => {
    // El filtro viene ahora con el nuevo nombre de columna: nombre_evaluacion
    const nombreEvaluacion = req.query.nombre_evaluacion; 
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);

        let query = "SELECT * FROM resultados_paes";
        const values = [];

        // Filtra por nombre_evaluacion (ej. Competencia Lectora) si se proporciona
        if (nombreEvaluacion) {
            query += " WHERE nombre_evaluacion = ?";
            values.push(nombreEvaluacion);
        }
        
        query += " ORDER BY rut, fecha_registro DESC";

        const [results] = await connection.execute(query, values);
        
        res.status(200).json(results);

    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).json({ message: "Error interno del servidor al obtener resultados.", error: error.message });
    } finally {
        if (connection) connection.end();
    }
});

/**
 * [DELETE] /api/resultados/:id - Elimina un registro por ID.
 */
app.delete('/api/resultados/:id', async (req, res) => {
    const registroId = req.params.id;
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);

        const query = "DELETE FROM resultados_paes WHERE registro_id = ?";
        const [results] = await connection.execute(query, [registroId]);

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "Registro no encontrado." });
        }
        
        res.status(200).json({ message: "Registro eliminado exitosamente." });

    } catch (error) {
        console.error('Error al eliminar registro:', error);
        res.status(500).json({ message: "Error interno del servidor al eliminar registro.", error: error.message });
    } finally {
        if (connection) connection.end();
    }
});


// -----------------------------------------------------
// 5. SERVIR ARCHIVOS ESTÁTICOS Y ENCIENDER SERVIDOR
// -----------------------------------------------------

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Servidor Express escuchando en http://localhost:${port}`);
    console.log("¡RECUERDA ejecutar el nuevo script SQL 'bd_paes_creation_v2.sql' y REINICIAR el servidor!");
});