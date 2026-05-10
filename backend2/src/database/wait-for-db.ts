import "dotenv/config";
import mysql from "mysql2/promise";

const host = process.env.DB_HOST || "mysql";
const port = Number(process.env.DB_PORT || 3306);
const database = process.env.DB_DATABASE || "nglu_db";
const user = process.env.DB_USERNAME || "nglu_user";
const password = process.env.DB_PASSWORD || "password";
const retries = Number(process.env.DB_WAIT_RETRIES || 40);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS || 1500);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const connection = await mysql.createConnection({ host, port, database, user, password });
      await connection.ping();
      await connection.end();
      console.log(`Database is ready at ${host}:${port}/${database}.`);
      return;
    } catch (error) {
      if (attempt === retries) {
        console.error("Database did not become ready in time.", error);
        process.exit(1);
      }

      console.log(`Waiting for database ${host}:${port}/${database} (${attempt}/${retries})...`);
      await wait(delayMs);
    }
  }
}

main();
