const { sequelize } = require('./config/db');

async function fixSchema() {
    try {
        console.log('Checking for missing columns...');

        // Attempt to add history column if it doesn't exist
        try {
            await sequelize.query('ALTER TABLE Matches ADD COLUMN history JSON NULL AFTER manOfTheMatch');
            console.log('Successfully added "history" column to Matches table.');
        } catch (err) {
            if (err.message.includes('Duplicate column name')) {
                console.log('Column "history" already exists.');
            } else {
                throw err;
            }
        }

        // Also check for other columns that might be missing like teamASquad, teamBSquad (just in case)
        const columnsToFix = [
            { name: 'teamASquad', type: 'JSON NULL' },
            { name: 'teamBSquad', type: 'JSON NULL' },
            { name: 'currentBowler', type: 'VARCHAR(255) DEFAULT ""' },
            { name: 'currentBatsmen', type: 'JSON NULL' },
            { name: 'toss', type: 'JSON NULL' },
            { name: 'score', type: 'JSON NULL' },
            { name: 'innings', type: 'JSON NULL' }
        ];

        for (const col of columnsToFix) {
            try {
                await sequelize.query(`ALTER TABLE Matches ADD COLUMN ${col.name} ${col.type}`);
                console.log(`Successfully added "${col.name}" column.`);
            } catch (err) {
                // Ignore duplicate column errors
            }
        }

        console.log('Schema fix completed.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to fix schema:', err.message);
        process.exit(1);
    }
}

fixSchema();
