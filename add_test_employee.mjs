import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { employees } from './drizzle/schema.ts';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const passwordHash = await bcrypt.hash('123456', 10);

await db.insert(employees).values({
  id: nanoid(),
  employeeCode: 'EMP001',
  phone: '0920563695',
  fullName: 'أحمد المدير',
  jobTitle: 'manager',
  passwordHash: passwordHash,
  status: 'active',
  permissions: ['all'],
  createdBy: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log('✅ تم إضافة الموظف التجريبي بنجاح');
console.log('رقم الهاتف: 0920563695');
console.log('كلمة المرور: 123456');

await connection.end();
