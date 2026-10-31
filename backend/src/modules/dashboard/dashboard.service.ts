import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(workspaceId: string, from?: string, to?: string) {
    const end = to ? this.parseDate(to) : new Date();
    const start = from
      ? this.parseDate(from)
      : new Date(end.getFullYear(), end.getMonth() - 5, 1);
    if (start > end) throw new BadRequestException('from must be earlier than to.');
    const monthStart = new Date(end.getFullYear(), end.getMonth(), 1);
    const previousMonthStart = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    const nextWeek = new Date(end);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [
      activeSubscriptions,
      customers,
      invoices,
      activeSubscriptionRows,
      revenue,
      currentMonthRevenue,
      previousMonthRevenue,
      recentSubscriptions,
      recentInvoices,
      upcomingRenewals,
      overdueInvoices,
      revenueSeries,
      subscriptionSeries,
    ] = await Promise.all([
      this.prisma.subscription.count({ where: { workspaceId, status: 'active' } }),
      this.prisma.customer.count({ where: { workspaceId, deletedAt: null } }),
      this.prisma.invoice.findMany({
        where: { workspaceId, status: { notIn: ['paid', 'cancelled'] } },
        include: { payments: { where: { status: 'completed' }, select: { amount: true } } },
      }),
      this.prisma.subscription.findMany({
        where: { workspaceId, status: 'active' },
        select: { amount: true, intervalUnit: true, intervalCount: true },
      }),
      this.prisma.payment.aggregate({
        where: { workspaceId, status: 'completed', paidAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { workspaceId, status: 'completed', paidAt: { gte: monthStart, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          workspaceId,
          status: 'completed',
          paidAt: { gte: previousMonthStart, lt: monthStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.subscription.findMany({
        where: { workspaceId },
        include: { customer: true, plan: true },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      this.prisma.invoice.findMany({
        where: { workspaceId },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      this.prisma.subscription.findMany({
        where: {
          workspaceId,
          status: 'active',
          nextBillingOn: { gte: end, lte: nextWeek },
        },
        include: { customer: true, plan: true },
        orderBy: { nextBillingOn: 'asc' },
      }),
      this.prisma.invoice.findMany({
        where: {
          workspaceId,
          status: { notIn: ['paid', 'cancelled'] },
          dueDate: { lt: end },
        },
        include: { customer: true },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      this.prisma.$queryRaw<Array<{ period: Date; revenue: Prisma.Decimal }>>`
        SELECT date_trunc('month', p.paid_at)::date AS period,
               COALESCE(SUM(p.amount), 0)::numeric AS revenue
        FROM payments p
        WHERE p.workspace_id = ${workspaceId}::uuid
          AND p.status = 'completed'
          AND p.paid_at >= ${start}
          AND p.paid_at <= ${end}
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<Array<{ period: Date; count: bigint }>>`
        SELECT date_trunc('month', s.created_at)::date AS period,
               COUNT(*)::bigint AS count
        FROM subscriptions s
        WHERE s.workspace_id = ${workspaceId}::uuid
          AND s.status = 'active'
          AND s.created_at >= ${start}
          AND s.created_at <= ${end}
        GROUP BY 1
        ORDER BY 1
      `,
    ]);

    const outstanding = invoices.reduce((sum, invoice) => {
      const paid = invoice.payments.reduce(
        (paidTotal, payment) => paidTotal.add(payment.amount),
        new Prisma.Decimal(0),
      );
      return sum.add(Prisma.Decimal.max(invoice.total.sub(paid), 0));
    }, new Prisma.Decimal(0));
    const mrr = activeSubscriptionRows.reduce((sum, subscription) => {
      const months =
        subscription.intervalUnit === 'year'
          ? 12 * subscription.intervalCount
          : subscription.intervalUnit === 'month'
            ? subscription.intervalCount
            : subscription.intervalUnit === 'week'
              ? subscription.intervalCount / 4.345
              : subscription.intervalCount / 30;
      return sum.add(subscription.amount.div(months));
    }, new Prisma.Decimal(0));
    const totalRevenue = revenue._sum.amount ?? new Prisma.Decimal(0);
    const currentRevenue = currentMonthRevenue._sum.amount ?? new Prisma.Decimal(0);
    const previousRevenue = previousMonthRevenue._sum.amount ?? new Prisma.Decimal(0);
    const revenueChange = previousRevenue.isZero()
      ? null
      : currentRevenue.sub(previousRevenue).div(previousRevenue).mul(100).toDecimalPlaces(1);

    return {
      data: {
        metrics: {
          revenue: totalRevenue.toFixed(2),
          mrr: mrr.toFixed(2),
          activeSubscriptions,
          customers,
          outstandingPayments: outstanding.toFixed(2),
          overdueInvoices: overdueInvoices.length,
          revenueChangePercent: revenueChange?.toFixed(1) ?? null,
        },
        revenueSeries: revenueSeries.map((row) => ({
          period: row.period.toISOString().slice(0, 7),
          revenue: row.revenue.toFixed(2),
        })),
        subscriptionSeries: subscriptionSeries.map((row) => ({
          period: row.period.toISOString().slice(0, 7),
          count: Number(row.count),
        })),
        recentSubscriptions,
        recentInvoices,
        upcomingRenewals,
        overdueAlerts: overdueInvoices,
      },
    };
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new BadRequestException('Date range is invalid.');
    return date;
  }
}
