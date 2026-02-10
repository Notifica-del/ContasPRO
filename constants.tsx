
import React from 'react';
import { User, Company, UserRole } from './types';
import { LayoutDashboard, ReceiptText, ShieldCheck, Camera, Sparkles } from 'lucide-react';

export const COMPANIES: Company[] = [
  { id: 'schroder', name: 'Schroder', color: 'bg-blue-500' },
  { id: 'corupa', name: 'Corupá', color: 'bg-emerald-500' },
  { id: 'jaragua', name: 'Jaraguá', color: 'bg-amber-500' },
  { id: 'mr-dist', name: 'MR Distribuidora', color: 'bg-purple-500' },
];

export const INITIAL_USERS: User[] = [
  {
    id: '1',
    name: 'Maurício',
    role: UserRole.ADMIN,
    email: 'mauricio@contaspro.com',
    avatar: 'https://picsum.photos/seed/mauricio/100',
    accessibleUnits: COMPANIES.map(c => c.id)
  },
  {
    id: '2',
    name: 'Caroline',
    role: UserRole.USER,
    email: 'caroline@contaspro.com',
    avatar: 'https://picsum.photos/seed/caroline/100',
    accessibleUnits: ['schroder', 'corupa']
  },
  {
    id: '3',
    name: 'Johnnii',
    role: UserRole.USER,
    email: 'johnnii@contaspro.com',
    avatar: 'https://picsum.photos/seed/johnnii/100',
    accessibleUnits: ['jaragua', 'mr-dist']
  }
];

export const CATEGORIES = [
  'Energia', 'Água', 'Internet', 'Aluguel', 'Fornecedores', 'Impostos', 'Salários', 'Manutenção', 'Outros'
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Início', icon: <LayoutDashboard className="w-6 h-6" /> },
  { id: 'bills', label: 'Contas', icon: <ReceiptText className="w-6 h-6" /> },
  { id: 'scanner', label: 'Escanear', icon: <Camera className="w-6 h-6" /> },
  { id: 'assistant', label: 'IA Assistente', icon: <Sparkles className="w-6 h-6" /> },
  { id: 'admin', label: 'Admin', icon: <ShieldCheck className="w-6 h-6" />, adminOnly: true },
];
