const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const firstNames = [
    "Arun", "Priya", "Rahul", "Sneha", "Vijay", "Anitha", "Mohammed", "Kavitha",
    "Rajesh", "Divya", "Karthik", "Meera", "Suresh", "Deepika", "Arjun", "Lakshmi",
    "Sanjay", "Pooja", "Vikram", "Nithya", "Harish", "Swetha", "Ganesh", "Revathi",
    "Prasad", "Keerthana", "Naveen", "Sangeetha", "Dinesh", "Bhavani", "Ramesh", "Saranya",
    "Venkat", "Pavithra", "Kumar", "Janani", "Ashok", "Dharani", "Manoj", "Kiruthika",
    "Praveen", "Nandhini", "Sathish", "Gayathri", "Balaji", "Thenmozhi"
];

const lastNames = [
    "Kumar", "Sharma", "Prakash", "Reddy", "Krishna", "Devi", "Farhan", "Sundaram",
    "Babu", "Lakshmi", "Raja", "Nair", "Gupta", "Venkat", "Menon", "Priya"
];

async function generate() {
    const saltRounds = 10;
    // Hash '1234' once, as it is the same for everyone
    const hash = await bcrypt.hash('1234', saltRounds);

    let sql = `-- Drop table if exists
DROP TABLE IF EXISTS students;

-- Create Table
CREATE TABLE students (
    register_number TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    canteen_access BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert Data
INSERT INTO students (register_number, name, password_hash, canteen_access) VALUES
`;

    const values = [];

    for (let i = 1; i <= 46; i++) {
        const regNo = `43613${String(i).padStart(3, '0')}`;
        const firstName = firstNames[i - 1] || firstNames[i % firstNames.length];
        const lastName = lastNames[i % lastNames.length];
        const fullName = `${firstName} ${lastName}`;

        // Escape single quotes just in case (though these names are safe)
        values.push(`('${regNo}', '${fullName}', '${hash}', TRUE)`);
    }

    sql += values.join(',\n') + ';';

    const outputPath = path.join(__dirname, '../../database_setup.sql');
    fs.writeFileSync(outputPath, sql);
    console.log('SQL file generated at:', outputPath);
}

generate();
