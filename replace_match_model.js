const fs = require('fs');
const file = './models/Match.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `    innings: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    manOfTheMatch: {`,
    `    innings: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    history: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    manOfTheMatch: {`
);

fs.writeFileSync(file, content);
