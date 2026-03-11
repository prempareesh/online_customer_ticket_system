const db = require('./config/db');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Setup command line interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function createAdmin() {
    console.log("\n=================================");
    console.log("   TICKFLOW ADMIN SETUP WIZARD   ");
    console.log("=================================\n");
    console.log("Use this to generate a specific Admin account for a college/organization.");

    try {
        const adminName = await askQuestion("Enter College/Organization Name (e.g., 'MIT Admin'): ");
        const adminEmail = await askQuestion("Enter Admin Email (e.g., 'admin@mit.edu'): ");
        const adminPassword = await askQuestion("Enter Admin Password: ");

        if (!adminEmail || !adminPassword || !adminName) {
            console.log("\n[Error] All fields are required. Setup cancelled.");
            process.exit(1);
        }

        console.log("\nGenerating Admin Profile...");

        // Wait for hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // Ensure email isn't already used
        const [existing] = await db.execute('SELECT * FROM Users WHERE email = ?', [adminEmail]);
        if (existing.length > 0) {
            console.log("\n[Error] An account with this email already exists in the database!");
            process.exit(0);
        }

        await db.execute(
            'INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [adminName, adminEmail, hashedPassword, 'admin']
        );

        console.log("\n---------------------------------------");
        console.log("✅ SUCCESS! Administrator account created.");
        console.log(`Organization: ${adminName}`);
        console.log(`Email:        ${adminEmail}`);
        console.log(`Password:     ${adminPassword}`);
        console.log("---------------------------------------\n");
        console.log("They can now use these credentials to log into the Admin Portal.");

        process.exit(0);
    } catch (err) {
        console.error("\n[Fatal Error] Database connection failed:", err.message);
        process.exit(1);
    }
}

createAdmin();
