import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_PORT = 3307,
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'bursalink_db'
} = process.env;

export async function runMigration() {
  console.log(`Connecting to MySQL on ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    user: DB_USER,
    password: DB_PASSWORD
  });

  try {
    console.log(`Creating database '${DB_NAME}' if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${DB_NAME}\`;`);

    console.log('Creating tables...');

    // 1. users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. otps table (hashed one-time codes bound to a challenge)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(128) NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_code (email, code)
      ) ENGINE=InnoDB;
    `);

    // Modify existing table if code column is still VARCHAR(10)
    await connection.query(`ALTER TABLE otps MODIFY COLUMN code VARCHAR(128) NOT NULL;`).catch(() => {});

    // ---- Password authentication upgrade (idempotent; works on MySQL and MariaDB) ----
    const hasColumn = async (table, column) => {
      const [rows] = await connection.query(
        'SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1',
        [DB_NAME, table, column]
      );
      return rows.length > 0;
    };
    const addColumn = async (table, column, ddl) => {
      if (await hasColumn(table, column)) return false;
      await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
      return true;
    };

    const passwordColumnAdded = await addColumn('users', 'password_hash', 'VARCHAR(255) NULL');
    const verifiedColumnAdded = await addColumn('users', 'email_verified', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await addColumn('users', 'failed_attempts', 'INT NOT NULL DEFAULT 0');
    await addColumn('users', 'locked_until', 'DATETIME NULL');
    await addColumn('users', 'password_changed_at', 'DATETIME NULL');
    await addColumn('users', 'last_login_at', 'DATETIME NULL');
    if (verifiedColumnAdded) {
      // accounts created before passwords existed already proved their email with a one-time code
      await connection.query('UPDATE users SET email_verified = TRUE');
      console.log('ℹ️  Existing users have no password yet: they must use "Forgot password" once to set one.');
    }
    if (passwordColumnAdded) console.log('✅ users.password_hash added');

    await addColumn('otps', 'purpose', "VARCHAR(20) NOT NULL DEFAULT 'login'");
    await addColumn('otps', 'challenge_hash', 'CHAR(64) NULL');
    await addColumn('otps', 'attempts', 'TINYINT NOT NULL DEFAULT 0');
    await addColumn('otps', 'user_id', 'INT NULL');
    await addColumn('otps', 'pending_password_hash', 'VARCHAR(255) NULL');
    const [idx] = await connection.query(
      "SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = 'otps' AND index_name = 'idx_challenge' LIMIT 1",
      [DB_NAME]
    );
    if (!idx.length) await connection.query('CREATE INDEX idx_challenge ON otps (challenge_hash)');
    // legacy unkeyed-SHA256 codes are no longer valid under the new scheme
    await connection.query('UPDATE otps SET used = TRUE WHERE challenge_hash IS NULL');

    // server-side sessions (only a SHA-256 of the cookie token is stored)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id CHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        idle_seconds INT NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(255) NULL,
        INDEX idx_sessions_user (user_id),
        INDEX idx_sessions_expires (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 3. profiles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        user_id INT PRIMARY KEY,
        area JSON NULL,
        saver_mode BOOLEAN NOT NULL DEFAULT FALSE,
        lang VARCHAR(10) NOT NULL DEFAULT 'en',
        notify_status BOOLEAN NOT NULL DEFAULT TRUE,
        notify_deadline BOOLEAN NOT NULL DEFAULT TRUE,
        notify_match BOOLEAN NOT NULL DEFAULT TRUE,
        docs JSON NULL,
        details JSON NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 4. area_requests table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS area_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        target_area JSON NOT NULL,
        reason TEXT NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 5. bursaries table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bursaries (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        org VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        place JSON NULL,
        min INT NOT NULL,
        max INT NOT NULL,
        levels JSON NOT NULL,
        opens DATE NOT NULL,
        closes DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'published',
        docs JSON NOT NULL,
        \`desc\` TEXT,
        how TEXT,
        contact VARCHAR(255),
        q TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 6. saved_bursaries table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS saved_bursaries (
        user_id INT NOT NULL,
        bursary_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, bursary_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bursary_id) REFERENCES bursaries(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 7. drafts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS drafts (
        user_id INT NOT NULL,
        bursary_id VARCHAR(50) NOT NULL,
        data JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, bursary_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bursary_id) REFERENCES bursaries(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 8. applications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(50) PRIMARY KEY,
        ref VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        bursary_id VARCHAR(50) NOT NULL,
        answers JSON NOT NULL,
        status ENUM('submitted','under_review','more_info_needed','shortlisted','approved','unsuccessful','withdrawn') NOT NULL DEFAULT 'submitted',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bursary_id) REFERENCES bursaries(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 9. application_history table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS application_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 10. notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(60) PRIMARY KEY,
        user_id INT NOT NULL,
        text TEXT NOT NULL,
        go JSON NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 11. audit_logs table (Government security compliance)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(100) NOT NULL,
        details JSON NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_action (action),
        INDEX idx_user_action (user_id, action)
      ) ENGINE=InnoDB;
    `);

    console.log('✅ All tables successfully created or verified.');
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
