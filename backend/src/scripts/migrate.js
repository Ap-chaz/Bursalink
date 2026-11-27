import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

function getConnectionConfig() {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      const dbName = parsed.pathname.replace(/^\//, '') || 'railway';
      return {
        connectionConfig: { uri: url },
        dbName,
        display: `${parsed.username}@${parsed.host}/${dbName}`
      };
    } catch {
      return {
        connectionConfig: { uri: url },
        dbName: process.env.MYSQLDATABASE || process.env.DB_NAME || 'bursalink_db',
        display: 'remote-database'
      };
    }
  }

  const host = process.env.MYSQLHOST || process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);
  const user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
  const password = process.env.MYSQLPASSWORD !== undefined ? process.env.MYSQLPASSWORD : (process.env.DB_PASSWORD || '');
  const dbName = process.env.MYSQLDATABASE || process.env.DB_NAME || 'bursalink_db';

  return {
    connectionConfig: { host, port, user, password },
    dbName,
    display: `${user}@${host}:${port}/${dbName}`
  };
}

export async function runMigration() {
  const { connectionConfig, dbName, display } = getConnectionConfig();
  console.log(`Connecting to MySQL on ${display}...`);
  const connection = await mysql.createConnection(connectionConfig);

  try {
    try {
      console.log(`Creating database '${dbName}' if not exists...`);
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    } catch (dbErr) {
      console.log(`Note: CREATE DATABASE skipped (${dbErr.message}) - continuing with '${dbName}'`);
    }
    await connection.query(`USE \`${dbName}\`;`);

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
        [dbName, table, column]
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
      [dbName]
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

    // Auto-seed initial bursaries if table is empty
    const [bursaryRows] = await connection.query('SELECT COUNT(*) as cnt FROM bursaries');
    if (bursaryRows[0]?.cnt === 0) {
      console.log('Seeding initial verified bursaries...');
      const { sampleBursaries } = await import('./seed.js');
      for (const b of sampleBursaries) {
        await connection.query(
          `INSERT INTO bursaries (id, title, org, type, place, min, max, levels, opens, closes, status, docs, \`desc\`, how, contact, q)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title=VALUES(title)`,
          [
            b.id, b.title, b.org, b.type, b.place ? JSON.stringify(b.place) : null,
            b.min, b.max, JSON.stringify(b.levels), b.opens, b.closes, b.status,
            JSON.stringify(b.docs), b.desc, b.how, b.contact, b.q
          ]
        );
      }
      console.log('✅ Initial bursaries populated.');
    }

    // Auto-provision initial administrator if configured
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      try {
        const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
        const { hashPassword } = await import('../services/passwordService.js');
        const hash = await hashPassword(process.env.ADMIN_PASSWORD);
        const [admRows] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
        if (admRows.length > 0) {
          await connection.query(
            `UPDATE users SET role = 'admin', password_hash = ?, email_verified = TRUE, failed_attempts = 0, locked_until = NULL WHERE id = ?`,
            [hash, admRows[0].id]
          );
        } else {
          await connection.query(
            `INSERT INTO users (email, role, password_hash, email_verified) VALUES (?, 'admin', ?, TRUE)`,
            [email, hash]
          );
        }
        console.log(`✅ Admin account configured for ${email}`);
      } catch (adminErr) {
        console.warn(`Admin auto-provision note: ${adminErr.message}`);
      }
    }
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
