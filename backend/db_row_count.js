const mysql = require('mysql2/promise');

async function main() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'db_syabab'
        });
        console.log("Connected!");
        const [tables] = await conn.query("SHOW TABLES");
        for (let row of tables) {
            const tableName = Object.values(row)[0];
            const [[countRow]] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
            console.log(`Table ${tableName} has ${countRow.cnt} rows.`);
        }
        await conn.end();
    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
