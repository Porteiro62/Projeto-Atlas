import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['income', 'expense', 'credit_card', 'financing'] }).notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  value: real('value').notNull(),
  date: text('date').notNull(), // ISO format
  recurrence: text('recurrence', { enum: ['none', 'monthly', 'yearly'] }).default('none'),
  status: text('status', { enum: ['pending', 'paid', 'cancelled'] }).default('pending'),
  observations: text('observations'),
  
  // Specific for Credit Card/Financing linking
  cardId: text('card_id'),
  financingId: text('financing_id'),
  installmentNumber: integer('installment_number'),
  totalInstallments: integer('total_installments'),
});

export const creditCards = sqliteTable('credit_cards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  limitAmount: real('limit_amount').notNull(),
  closingDay: integer('closing_day').notNull(),
  dueDay: integer('due_day').notNull(),
});

export const financings = sqliteTable('financings', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  totalValue: real('total_value').notNull(),
  annualInterestRate: real('annual_interest_rate').notNull(),
  totalInstallments: integer('total_installments').notNull(),
  startDate: text('start_date').notNull(),
  monthlyPayment: real('monthly_payment').notNull(),
});
