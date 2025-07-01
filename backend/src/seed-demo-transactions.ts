import { DataSource } from 'typeorm';
import { Transaction, TransactionStatus, PaymentPlan } from './modules/transactions/entities/transaction.entity';
import { User, UserRole } from './modules/users/entities/user.entity';
import { Merchant } from './modules/merchants/entities/merchant.entity';

export async function createDemoTransactions(dataSource: DataSource) {
  const transactionRepository = dataSource.getRepository(Transaction);
  const userRepository = dataSource.getRepository(User);
  const merchantRepository = dataSource.getRepository(Merchant);

  // Get existing demo users and merchants
  const customers = await userRepository.find({ where: { role: UserRole.CUSTOMER } });
  const merchants = await merchantRepository.find();

  if (customers.length === 0 || merchants.length === 0) {
    console.log('No customers or merchants found. Run user seeder first.');
    return;
  }

  const demoTransactions = [
    {
      amount: 299.99,
      status: TransactionStatus.PENDING,
      paymentPlan: PaymentPlan.PAY_IN_3,
      items: [
        { name: 'Wireless Headphones', price: 299.99, quantity: 1 }
      ],
      riskScore: 45,
      userId: customers[0].id,
      merchantId: merchants[0].id
    },
    {
      amount: 149.50,
      status: TransactionStatus.APPROVED,
      paymentPlan: PaymentPlan.PAY_IN_2,
      items: [
        { name: 'Bluetooth Speaker', price: 149.50, quantity: 1 }
      ],
      riskScore: 25,
      userId: customers[1] ? customers[1].id : customers[0].id,
      merchantId: merchants[0].id
    },
    {
      amount: 89.99,
      status: TransactionStatus.COMPLETED,
      paymentPlan: PaymentPlan.PAY_IN_3,
      items: [
        { name: 'Phone Case', price: 29.99, quantity: 1 },
        { name: 'Screen Protector', price: 15.00, quantity: 1 },
        { name: 'Charging Cable', price: 45.00, quantity: 1 }
      ],
      riskScore: 15,
      userId: customers[0].id,
      merchantId: merchants[1] ? merchants[1].id : merchants[0].id
    },
    {
      amount: 599.00,
      status: TransactionStatus.PENDING,
      paymentPlan: PaymentPlan.PAY_IN_4,
      items: [
        { name: 'Tablet', price: 599.00, quantity: 1 }
      ],
      riskScore: 65,
      userId: customers[1] ? customers[1].id : customers[0].id,
      merchantId: merchants[0].id
    },
    {
      amount: 199.99,
      status: TransactionStatus.REJECTED,
      paymentPlan: PaymentPlan.PAY_IN_3,
      items: [
        { name: 'Smart Watch', price: 199.99, quantity: 1 }
      ],
      riskScore: 85,
      userId: customers[2] ? customers[2].id : customers[0].id,
      merchantId: merchants[1] ? merchants[1].id : merchants[0].id
    }
  ];

  for (const transactionData of demoTransactions) {
    try {
      const existingTransaction = await transactionRepository.findOne({
        where: { 
          amount: transactionData.amount,
          userId: transactionData.userId,
          merchantId: transactionData.merchantId
        }
      });

      if (!existingTransaction) {
        const transaction = transactionRepository.create(transactionData);
        await transactionRepository.save(transaction);
        console.log(`Created demo transaction: ${transactionData.amount} - ${transactionData.status}`);
      }
    } catch (error) {
      console.error('Error creating demo transaction:', error);
    }
  }

  console.log('Demo transactions seeding completed');
}