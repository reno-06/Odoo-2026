import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(workspaceId: string, query: string) {
    const term = query.trim();
    if (term.length < 1) throw new BadRequestException('Search query is required.');
    const contains = { contains: term, mode: 'insensitive' as const };
    const [products, plans, customers, quotations, subscriptions, invoices, discounts, payments] =
      await Promise.all([
        this.prisma.product.findMany({
          where: { workspaceId, deletedAt: null, OR: [{ name: contains }, { productNumber: contains }] },
          select: { id: true, productNumber: true, name: true, status: true },
          take: 5,
        }),
        this.prisma.plan.findMany({
          where: { workspaceId, deletedAt: null, OR: [{ name: contains }, { planNumber: contains }] },
          select: { id: true, planNumber: true, name: true, status: true },
          take: 5,
        }),
        this.prisma.customer.findMany({
          where: {
            workspaceId,
            deletedAt: null,
            OR: [{ name: contains }, { email: contains }, { companyName: contains }, { customerNumber: contains }],
          },
          select: { id: true, customerNumber: true, name: true, email: true, status: true },
          take: 5,
        }),
        this.prisma.quotation.findMany({
          where: { workspaceId, OR: [{ quoteNumber: contains }, { customer: { name: contains } }] },
          select: { id: true, quoteNumber: true, status: true, customer: { select: { name: true } } },
          take: 5,
        }),
        this.prisma.subscription.findMany({
          where: {
            workspaceId,
            OR: [
              { subscriptionNumber: contains },
              { customer: { name: contains } },
              { plan: { name: contains } },
            ],
          },
          select: {
            id: true,
            subscriptionNumber: true,
            status: true,
            customer: { select: { name: true } },
            plan: { select: { name: true } },
          },
          take: 5,
        }),
        this.prisma.invoice.findMany({
          where: {
            workspaceId,
            OR: [{ invoiceNumber: contains }, { customer: { name: contains } }],
          },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            customer: { select: { name: true } },
          },
          take: 5,
        }),
        this.prisma.discount.findMany({
          where: { workspaceId, OR: [{ name: contains }, { discountNumber: contains }, { code: contains }] },
          select: { id: true, discountNumber: true, name: true, status: true },
          take: 5,
        }),
        this.prisma.payment.findMany({
          where: {
            workspaceId,
            OR: [
              { paymentNumber: contains },
              { externalReference: contains },
              { customer: { name: contains } },
            ],
          },
          select: {
            id: true,
            paymentNumber: true,
            status: true,
            customer: { select: { name: true } },
          },
          take: 5,
        }),
      ]);
    return {
      data: {
        products,
        plans,
        customers,
        quotations,
        subscriptions,
        invoices,
        discounts,
        payments,
      },
    };
  }
}
