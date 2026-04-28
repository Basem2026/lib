import { User } from '@/types/auth';

// بيانات المستخدمين الأوليين (سيتم نقلها لقاعدة البيانات لاحقاً)
export const initialUsers: User[] = [
  {
    id: '1',
    phone: '0920563695',
    name: 'محمد مصطفى زهمول',
    role: 'admin',
    isDelegate: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    phone: '0922453889',
    name: 'أحمد محمود',
    role: 'data_entry',
    isDelegate: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    phone: '0934597442',
    name: 'فاطمة محمد',
    role: 'cashier',
    isDelegate: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    phone: '0928103274',
    name: 'علي حسن',
    role: 'supervisor',
    isDelegate: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5',
    phone: '0945519659',
    name: 'سارة إبراهيم',
    role: 'manager',
    isDelegate: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '6',
    phone: '0911934505',
    name: 'خالد محمد',
    role: 'supervisor',
    isDelegate: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// كلمات المرور (في الواقع ستكون مشفرة في قاعدة البيانات)
export const userPasswords: Record<string, string> = {
  '0920563695': 'password123',
  '0922453889': '12345678',
  '0934597442': '12345678',
  '0928103274': '12345678',
  '0945519659': '12345678',
  '0911934505': '12345678',
};
