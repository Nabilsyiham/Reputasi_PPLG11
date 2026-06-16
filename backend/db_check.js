const mysql = require('mysql2/promise');

async function main() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'db_syabab'
        });
        console.log("Connected to db_syabab!");
        const [tables] = await conn.query("SHOW TABLES");
        console.log("Tables in db_syabab:", JSON.stringify(tables));
        for (let row of tables) {
            const tableName = Object.values(row)[0];
            const [columns] = await conn.query(`DESCRIBE \`${tableName}\``);
            console.log(`Columns in ${tableName}:`, columns.map(c => `${c.Field} (${c.Type})` + (c.Null === 'NO' ? ' NOT NULL' : '') + (c.Key ? ` KEY:${c.Key}` : '')));
        }
        await conn.end();
    } catch (e) {
        console.error("Error connecting to database:", e.message);
    }
}

main();
