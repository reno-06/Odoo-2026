import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ReportQueryDto } from './reports.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(workspaceId: string, query: ReportQueryDto) {
    const { from, to } = this.range(query);
    const [revenue, activeSubscriptions, newCustomers, overdueInvoices] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: { workspaceId, status: 'completed', paidAt: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        this.prisma.subscription.count({ where: { workspaceId, status: 'active' } }),
        this.prisma.customer.count({
          where: { workspaceId, createdAt: { gte: from, lte: to }, deletedAt: null },
        }),
        this.prisma.invoice.count({
          where: {
            workspaceId,
            status: { notIn: ['paid', 'cancelled'] },
            dueDate: { lt: to },
          },
        }),
      ]);
    return {
      data: {
        from: from.toISOString(),
        to: to.toISOString(),
        revenue: (revenue._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        activeSubscriptions,
        newCustomers,
        overdueInvoices,
      },
    };
  }

  async revenue(workspaceId: string, query: ReportQueryDto) {
    const { from, to } = this.range(query);
    const rows = await this.prisma.$queryRaw<
      Array<{ period: Date; revenue: Prisma.Decimal }>
    >`
      SELECT date_trunc(${query.groupBy ?? 'month'}, p.paid_at)::date AS period,
             COALESCE(SUM(p.amount), 0)::numeric AS revenue
      FROM payments p
      WHERE p.workspace_id = ${workspaceId}::uuid
        AND p.status = 'completed'
        AND p.paid_at >= ${from}
        AND p.paid_at <= ${to}
      GROUP BY 1
      ORDER BY 1
    `;
    return {
      data: rows.map((row) => ({
        period: row.period.toISOString().slice(0, 10),
        revenue: row.revenue.toFixed(2),
      })),
    };
  }

  async customerGrowth(workspaceId: string, query: ReportQueryDto) {
    const { from, to } = this.range(query);
    const rows = await this.prisma.$queryRaw<
      Array<{ period: Date; customers: bigint; paid: bigint }>
    >`
      SELECT date_trunc(${query.groupBy ?? 'month'}, c.created_at)::date AS period,
             COUNT(DISTINCT c.id)::bigint AS customers,
             COUNT(DISTINCT p.customer_id)::bigint AS paid
      FROM customers c
      LEFT JOIN payments p
        ON p.customer_id = c.id
       AND p.workspace_id = c.workspace_id
       AND p.status = 'completed'
       AND p.paid_at >= ${from}
       AND p.paid_at <= ${to}
      WHERE c.workspace_id = ${workspaceId}::uuid
        AND c.created_at >= ${from}
        AND c.created_at <= ${to}
        AND c.deleted_at IS NULL
      GROUP BY 1
      ORDER BY 1
    `;
    return {
      data: rows.map((row) => ({
        period: row.period.toISOString().slice(0, 10),
        customers: Number(row.customers),
        paid: Number(row.paid),
      })),
    };
  }

  async subscriptionReport(workspaceId: string, query: ReportQueryDto) {
    const { from, to } = this.range(query);
    const [statusCounts, planCounts] = await Promise.all([
      this.prisma.subscription.groupBy({
        by: ['status'],
        where: { workspaceId, createdAt: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        where: { workspaceId, status: 'active' },
        _count: { _all: true },
      }),
    ]);
    const planIds = planCounts.map((entry) => entry.planId);
    const plans = await this.prisma.plan.findMany({
      where: { workspaceId, id: { in: planIds } },
      select: { id: true, name: true },
    });
    const names = new Map(plans.map((plan) => [plan.id, plan.name]));
    return {
      data: {
        statusCounts: statusCounts.map((entry) => ({
          status: entry.status,
          count: entry._count._all,
        })),
        plans: planCounts.map((entry) => ({
          planId: entry.planId,
          name: names.get(entry.planId) ?? 'Deleted plan',
          count: entry._count._all,
        })),
      },
    };
  }

  async paymentReport(workspaceId: string, query: ReportQueryDto) {
    const { from, to } = this.range(query);
    const result = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: { workspaceId, issueDate: { gte: from, lte: to } },
      _count: { _all: true },
      _sum: { total: true },
    });
    const total = result.reduce((sum, item) => sum + item._count._all, 0);
    return {
      data: result.map((item) => ({
        status: item.status,
        count: item._count._all,
        amount: item._sum.total?.toFixed(2) ?? '0.00',
        percentage: total ? Number(((item._count._all / total) * 100).toFixed(1)) : 0,
      })),
    };
  }

  async overdueInvoices(
    workspaceId: string,
    page: number,
    pageSize: number,
  ) {
    const where = {
      workspaceId,
      status: { notIn: ['paid', 'cancelled'] },
      dueDate: { lt: new Date() },
    };
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { customer: true, payments: { where: { status: 'completed' } } },
        orderBy: { dueDate: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return {
      data,
      meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  }

  async exportCsv(workspaceId: string, query: ReportQueryDto): Promise<string> {
    const rows =
      query.dataset === 'overdue-invoices'
        ? await this.overdueCsvRows(workspaceId)
        : await this.revenueCsvRows(workspaceId, query);
    return rows
      .map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(','))
      .join('\r\n');
  }

  private async overdueCsvRows(workspaceId: string): Promise<string[][]> {
    const report = await this.overdueInvoices(workspaceId, 1, 1000);
    return [
      ['invoice', 'customer', 'dueDate', 'total', 'currency', 'status'],
      ...report.data.map((invoice) => [
        invoice.invoiceNumber,
        invoice.customer.name,
        invoice.dueDate.toISOString().slice(0, 10),
        invoice.total.toFixed(2),
        invoice.currency,
        invoice.status,
      ]),
    ];
  }

  private async revenueCsvRows(
    workspaceId: string,
    query: ReportQueryDto,
  ): Promise<string[][]> {
    const result = await this.revenue(workspaceId, query);
    const data = result.data as Array<{ period: string; revenue: string }>;
    return [['period', 'revenue'], ...data.map((row) => [row.period, row.revenue])];
  }

  private range(query: ReportQueryDto): { from: Date; to: Date } {
    const to = query.to ? this.parse(query.to) : new Date();
    const from = query.from
      ? this.parse(query.from)
      : new Date(to.getFullYear(), to.getMonth() - 5, 1);
    if (from > to) throw new BadRequestException('from must be earlier than to.');
    return { from, to };
  }

  private parse(value: string): Date {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      throw new BadRequestException('Report date range is invalid.');
    }
    return date;
  }
}
