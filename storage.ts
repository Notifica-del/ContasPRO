
import { Bill, User } from './types';

const BILLS_KEY = 'contaspro_bills';
const USERS_KEY = 'contaspro_users';
const CURRENT_USER_KEY = 'contaspro_current_user';
const SENT_NOTIFICATIONS_KEY = 'contaspro_sent_notifications';

export const storage = {
  getBills: (): Bill[] => {
    const data = localStorage.getItem(BILLS_KEY);
    return data ? JSON.parse(data) : [];
  },
  setBills: (bills: Bill[]) => {
    localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
  },
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },
  setUsers: (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  },
  getSentNotifications: (): string[] => {
    const data = localStorage.getItem(SENT_NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  },
  markNotificationAsSent: (billId: string) => {
    const sent = storage.getSentNotifications();
    if (!sent.includes(billId)) {
      localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify([...sent, billId]));
    }
  },
  // Retorna um objeto contendo todos os dados para backup
  exportFullBackup: () => {
    return {
      bills: storage.getBills(),
      users: storage.getUsers(),
      sentNotifications: storage.getSentNotifications(),
      version: '1.0',
      exportedAt: new Date().toISOString()
    };
  },
  // Restaura dados a partir de um objeto de backup
  importFullBackup: (data: any) => {
    if (data.bills) storage.setBills(data.bills);
    if (data.users) storage.setUsers(data.users);
    if (data.sentNotifications) localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify(data.sentNotifications));
  }
};
