import 'dotenv/config';
import { randomBytes, scryptSync } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    productNumber: 'PRD-1042',
    name: 'Cloud workspace',
    type: 'digital_service',
    salesPrice: '24.00',
    costPrice: '8.00',
    variants: ['Starter', 'Business', 'Enterprise'],
  },
  {
    productNumber: 'PRD-1041',
    name: 'Priority support',
    type: 'service',
    salesPrice: '12.00',
    costPrice: '4.00',
    variants: ['Standard', 'Premium'],
  },
  {
    productNumber: 'PRD-1040',
    name: 'Analytics add-on',
    type: 'digital_service',
    salesPrice: '8.00',
    costPrice: '2.00',
    variants: ['Monthly'],
  },
  {
    productNumber: 'PRD-1039',
    name: 'Onboarding session',
    type: 'service',
    salesPrice: '99.00',
    costPrice: '35.00',
    variants: ['One-time'],
  },
] as const;

const customers = [
  {
    customerNumber: 'CUS-3018',
    name: 'Olivia Rhye',
    email: 'olivia@acme.io',
    companyName: 'Acme Studio',
    phone: '+1 (415) 555-0132',
    location: 'San Francisco, US',
    status: 'active',
  },
  {
    customerNumber: 'CUS-3017',
    name: 'Phoenix Baker',
    email: 'phoenix@circl.es',
    companyName: 'Circle Labs',
    phone: '+1 (212) 555-0184',
    location: 'New York, US',
    status: 'active',
  },
  {
    customerNumber: 'CUS-3016',
    name: 'Lana Steiner',
    email: 'lana@catalog.app',
    companyName: 'Catalog',
    phone: '+44 20 7946 0821',
    location: 'London, UK',
    status: 'active',
  },
  {
    customerNumber: 'CUS-3015',
    name: 'Demi Wilkinson',
    email: 'demi@layers.design',
    companyName: 'Layers',
    phone: '+61 2 5550 0188',
    location: 'Sydney, AU',
    status: 'inactive',
  },
] as const;

function hashDevelopmentPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

async function seed(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 16) {
    throw new Error(
      'Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 16 characters before seeding.',
    );
  }

  const result = await prisma.$transaction(async (transaction) => {
    const workspace = await transaction.workspace.upsert({
      where: { slug: 'brightloop-demo' },
      update: {
        name: 'Brightloop Studio',
        companyName: 'Brightloop Studio',
        billingEmail: 'billing@brightloop.io',
        defaultCurrency: 'USD',
      },
      create: {
        slug: 'brightloop-demo',
        name: 'Brightloop Studio',
        companyName: 'Brightloop Studio',
        billingEmail: 'billing@brightloop.io',
        phone: '+1 (415) 555-0100',
        address: '548 Market Street, San Francisco, CA 94104',
        defaultCurrency: 'USD',
      },
    });

    const user = await transaction.user.upsert({
      where: { email },
      update: {
        fullName: 'Brightloop Admin',
        passwordHash: hashDevelopmentPassword(password),
        status: 'active',
      },
      create: {
        email,
        fullName: 'Brightloop Admin',
        passwordHash: hashDevelopmentPassword(password),
        status: 'active',
      },
    });

    await transaction.workspaceMembership.upsert({
      where: {
        workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
      },
      update: { role: 'owner', status: 'active' },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'owner',
        status: 'active',
      },
    });

    await transaction.userPreferences.upsert({
      where: { userId: user.id },
      update: { currency: 'USD', timezone: 'America/Los_Angeles' },
      create: {
        userId: user.id,
        currency: 'USD',
        timezone: 'America/Los_Angeles',
      },
    });

    const productIds = new Map<string, string>();
    for (const product of products) {
      const saved = await transaction.product.upsert({
        where: {
          workspaceId_productNumber: {
            workspaceId: workspace.id,
            productNumber: product.productNumber,
          },
        },
        update: {
          name: product.name,
          type: product.type,
          salesPrice: new Prisma.Decimal(product.salesPrice),
          costPrice: new Prisma.Decimal(product.costPrice),
          currency: 'USD',
          status: product.productNumber === 'PRD-1039' ? 'archived' : 'active',
          deletedAt: null,
          variants: {
            deleteMany: {},
            create: product.variants.map((name) => ({
              name,
              additionalPrice: new Prisma.Decimal(0),
            })),
          },
        },
        create: {
          workspaceId: workspace.id,
          productNumber: product.productNumber,
          name: product.name,
          type: product.type,
          salesPrice: new Prisma.Decimal(product.salesPrice),
          costPrice: new Prisma.Decimal(product.costPrice),
          currency: 'USD',
          status: product.productNumber === 'PRD-1039' ? 'archived' : 'active',
          variants: {
            create: product.variants.map((name) => ({
              name,
              additionalPrice: new Prisma.Decimal(0),
            })),
          },
        },
      });
      productIds.set(product.name, saved.id);
    }

    const plans = [
      {
        planNumber: 'PLN-2048',
        name: 'Growth annual',
        productName: 'Cloud workspace',
        intervalUnit: 'year',
        price: '240.00',
        status: 'active',
      },
      {
        planNumber: 'PLN-2047',
        name: 'Starter monthly',
        productName: 'Cloud workspace',
        intervalUnit: 'month',
        price: '24.00',
        status: 'active',
      },
      {
        planNumber: 'PLN-2046',
        name: 'Support monthly',
        productName: 'Priority support',
        intervalUnit: 'month',
        price: '12.00',
        status: 'active',
      },
      {
        planNumber: 'PLN-2045',
        name: 'Analytics monthly',
        productName: 'Analytics add-on',
        intervalUnit: 'month',
        price: '8.00',
        status: 'inactive',
      },
    ] as const;

    for (const plan of plans) {
      const productId = productIds.get(plan.productName);
      if (!productId) {
        throw new Error(`Seed product is missing: ${plan.productName}`);
      }

      await transaction.plan.upsert({
        where: {
          workspaceId_planNumber: {
            workspaceId: workspace.id,
            planNumber: plan.planNumber,
          },
        },
        update: {
          name: plan.name,
          productId,
          intervalUnit: plan.intervalUnit,
          intervalCount: 1,
          price: new Prisma.Decimal(plan.price),
          currency: 'USD',
          minimumQuantity: 1,
          allowRenewal: plan.planNumber !== 'PLN-2045',
          status: plan.status,
          deletedAt: null,
        },
        create: {
          workspaceId: workspace.id,
          planNumber: plan.planNumber,
          name: plan.name,
          productId,
          intervalUnit: plan.intervalUnit,
          intervalCount: 1,
          price: new Prisma.Decimal(plan.price),
          currency: 'USD',
          minimumQuantity: 1,
          allowRenewal: plan.planNumber !== 'PLN-2045',
          status: plan.status,
        },
      });
    }

    for (const customer of customers) {
      await transaction.customer.upsert({
        where: {
          workspaceId_customerNumber: {
            workspaceId: workspace.id,
            customerNumber: customer.customerNumber,
          },
        },
        update: {
          name: customer.name,
          email: customer.email,
          companyName: customer.companyName,
          phone: customer.phone,
          location: customer.location,
          status: customer.status,
          deletedAt: null,
        },
        create: {
          workspaceId: workspace.id,
          ...customer,
        },
      });
    }

    await transaction.workspaceTaxSettings.upsert({
      where: { workspaceId: workspace.id },
      update: { taxName: 'Sales tax', taxRate: new Prisma.Decimal('8.25') },
      create: {
        workspaceId: workspace.id,
        taxName: 'Sales tax',
        taxRate: new Prisma.Decimal('8.25'),
      },
    });

    return {
      workspace: workspace.slug,
      email: user.email,
      products: products.length,
      plans: plans.length,
      customers: customers.length,
    };
  });

  console.info('Development database seeded:', result);
}

seed()
  .catch((error: unknown) => {
    console.error('Development database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
