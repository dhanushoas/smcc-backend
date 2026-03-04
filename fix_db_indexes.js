const { sequelize } = require('./config/db');

async function fixIndexes() {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB.");

        const [results] = await sequelize.query("SHOW INDEXES FROM Users;");

        let droppedCount = 0;
        for (const row of results) {
            const indexName = row.Key_name;
            // Don't drop PRIMARY key
            if (indexName !== 'PRIMARY') {
                try {
                    console.log(`Dropping index ${indexName}...`);
                    await sequelize.query(`ALTER TABLE Users DROP INDEX \`${indexName}\`;`);
                    droppedCount++;
                } catch (e) {
                    console.error(`Failed to drop ${indexName}: ${e.message}`);
                }
            }
        }
        console.log(`Successfully dropped ${droppedCount} duplicate indexes.`);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

fixIndexes();
