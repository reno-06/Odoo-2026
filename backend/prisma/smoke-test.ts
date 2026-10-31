import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runDatabaseSmokeTest(): Promise<void> {
  await prisma.$connect();

  const suffix = randomUUID();
  let workspaceId: string | undefined;
  let productId: string | undefined;
  let customerId: string | undefined;

  try {
    const workspace = await prisma.workspace.create({
      data: {
        slug: `db-smoke-${suffix}`,
        name: 'Database smoke test',
        companyName: 'Database smoke test',
        billingEmail: `db-smoke-${suffix}@example.test`,
        defaultCurrency: 'USD',
      },
    });
    workspaceId = workspace.id;

    const product = await prisma.product.create({
      data: {
        workspaceId,
        productNumber: `TEST-${suffix}`,
        name: 'CRUD smoke product',
        type: 'service',
        salesPrice: new Prisma.Decimal('12.50'),
        costPrice: new Prisma.Decimal('4.25'),
        currency: 'USD',
      },
    });
    productId = product.id;

    const customer = await prisma.customer.create({
      data: {
        workspaceId,
        customerNumber: `TEST-${suffix}`,
        name: 'CRUD smoke customer',
        email: `customer-${suffix}@example.test`,
      },
    });
    customerId = customer.id;

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { companyName: 'Updated smoke customer' },
    });
    assert.equal(updated.companyName, 'Updated smoke customer');

    const [storedProduct, storedCustomer] = await Promise.all([
      prisma.product.findUnique({ where: { id: product.id } }),
      prisma.customer.findUnique({ where: { id: customer.id } }),
    ]);
    assert.equal(storedProduct?.salesPrice.toFixed(2), '12.50');
    assert.equal(storedCustomer?.name, 'CRUD smoke customer');

    await prisma.customer.delete({ where: { id: customer.id } });
    customerId = undefined;
    await prisma.product.delete({ where: { id: product.id } });
    productId = undefined;
    await prisma.workspace.delete({ where: { id: workspace.id } });
    workspaceId = undefined;

    console.info('Database connectivity and create/read/update/delete checks passed.');
  } finally {
    if (customerId) {
      await prisma.customer.deleteMany({ where: { id: customerId } });
    }
    if (productId) {
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    if (workspaceId) {
      await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    }
    await prisma.$disconnect();
  }
}

runDatabaseSmokeTest().catch((error: unknown) => {
  console.error('Database smoke test failed:', error);
  process.exitCode = 1;
});
