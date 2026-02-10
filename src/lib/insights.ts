import { Task, TaskCategory } from './tasks';
import { DailySummary } from './parser';

export interface Insight {
  id: string;
  type: 'optimization' | 'anomaly' | 'achievement' | 'tip';
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  description: string;
  metric?: string;
  savings?: number;
  category?: TaskCategory;
}

export interface EfficiencyScore {
  overall: number;
  breakdown: {
    category: TaskCategory;
    score: number;
    avgCost: number;
    avgDuration: number;
    taskCount: number;
  }[];
}

export function generateInsights(tasks: Task[], dailySummaries: DailySummary[]): Insight[] {
  const insights: Insight[] = [];
  
  const monitoringTasks = tasks.filter(t => t.category === 'monitoring');
  const totalMonitoringCost = monitoringTasks.reduce((sum, t) => sum + t.cost, 0);
  const totalCost = tasks.reduce((sum, t) => sum + t.cost, 0);
  const monitoringPercent = totalCost > 0 ? (totalMonitoringCost / totalCost) * 100 : 0;
  
  if (monitoringPercent > 30) {
    insights.push({
      id: 'monitoring-cost-high',
      type: 'optimization',
      severity: 'warning',
      title: 'High Monitoring Costs',
      description: `${monitoringPercent.toFixed(1)}% of your spend is on monitoring/heartbeat tasks. Consider reducing heartbeat frequency or using a cheaper model for routine checks.`,
      metric: `$${totalMonitoringCost.toFixed(2)} on monitoring`,
      savings: totalMonitoringCost * 0.6,
      category: 'monitoring'
    });
  }
  
  const expensiveTasks = tasks.filter(t => t.cost > 2);
  if (expensiveTasks.length > 0) {
    const mostExpensive = expensiveTasks.sort((a, b) => b.cost - a.cost)[0];
    insights.push({
      id: 'expensive-task',
      type: 'anomaly',
      severity: 'info',
      title: 'Expensive Task Detected',
      description: `"${mostExpensive.summary}" cost $${mostExpensive.cost.toFixed(2)}. Long conversations or large context can drive up costs.`,
      metric: `$${mostExpensive.cost.toFixed(2)}`,
      category: mostExpensive.category as TaskCategory
    });
  }
  
  const recentTasks = tasks.slice(0, 50);
  const totalInputTokens = recentTasks.reduce((sum, t) => sum + t.inputTokens, 0);
  const totalOutputTokens = recentTasks.reduce((sum, t) => sum + t.outputTokens, 0);
  const outputRatio = totalInputTokens > 0 ? totalOutputTokens / totalInputTokens : 0;
  
  if (outputRatio < 0.1) {
    insights.push({
      id: 'low-output-ratio',
      type: 'tip',
      severity: 'info',
      title: 'High Context, Low Output',
      description: 'Your agent is processing a lot of context but producing relatively little output. This is normal for agents with large system prompts, but consider trimming unnecessary context.',
      metric: `${(outputRatio * 100).toFixed(1)}% output/input ratio`
    });
  }
  
  if (dailySummaries.length >= 2) {
    const avgDailyCost = dailySummaries.reduce((sum, d) => sum + d.totalCost, 0) / dailySummaries.length;
    const recentDay = dailySummaries[0];
    
    if (recentDay && recentDay.totalCost > avgDailyCost * 2) {
      insights.push({
        id: 'daily-spike',
        type: 'anomaly',
        severity: 'warning',
        title: 'Spending Spike Detected',
        description: `Yesterday's spend ($${recentDay.totalCost.toFixed(2)}) was ${(recentDay.totalCost / avgDailyCost).toFixed(1)}x higher than average ($${avgDailyCost.toFixed(2)}).`,
        metric: `+$${(recentDay.totalCost - avgDailyCost).toFixed(2)} above average`
      });
    }
  }
  
  if (totalCost > 0 && tasks.length > 50) {
    const avgCostPerTask = totalCost / tasks.length;
    if (avgCostPerTask < 0.5) {
      insights.push({
        id: 'efficient-agent',
        type: 'achievement',
        severity: 'success',
        title: 'Efficient Agent!',
        description: `Average cost per task is only $${avgCostPerTask.toFixed(2)}. Your agent is operating efficiently.`,
        metric: `$${avgCostPerTask.toFixed(2)}/task`
      });
    }
  }
  
  const browserTasks = tasks.filter(t => t.category === 'browser');
  if (browserTasks.length > 10) {
    const avgBrowserCost = browserTasks.reduce((sum, t) => sum + t.cost, 0) / browserTasks.length;
    insights.push({
      id: 'browser-tip',
      type: 'tip',
      severity: 'info',
      title: 'Heavy Browser Usage',
      description: `Your agent uses browser automation frequently (${browserTasks.length} tasks). Browser tasks tend to be slower. Consider using APIs directly when available.`,
      metric: `$${avgBrowserCost.toFixed(2)}/browser task avg`,
      category: 'browser'
    });
  }
  
  if (monitoringPercent > 20) {
    insights.push({
      id: 'model-suggestion',
      type: 'optimization',
      severity: 'info',
      title: 'Consider Model Routing',
      description: 'Route simple tasks (heartbeats, polling) to Haiku or Sonnet. Keep Opus for complex reasoning. This could reduce monitoring costs by 90%+.',
      savings: totalMonitoringCost * 0.9
    });
  }
  
  return insights;
}

export function calculateEfficiencyScore(tasks: Task[]): EfficiencyScore {
  const categoryData: Record<TaskCategory, { costs: number[]; durations: number[]; count: number }> = {
    communication: { costs: [], durations: [], count: 0 },
    research: { costs: [], durations: [], count: 0 },
    coding: { costs: [], durations: [], count: 0 },
    file_management: { costs: [], durations: [], count: 0 },
    monitoring: { costs: [], durations: [], count: 0 },
    scheduling: { costs: [], durations: [], count: 0 },
    browser: { costs: [], durations: [], count: 0 },
    system: { costs: [], durations: [], count: 0 },
    other: { costs: [], durations: [], count: 0 }
  };
  
  for (const task of tasks) {
    const cat = task.category as TaskCategory;
    categoryData[cat].costs.push(task.cost);
    categoryData[cat].durations.push(task.durationMs);
    categoryData[cat].count++;
  }
  
  const benchmarks: Record<TaskCategory, { cost: number; duration: number }> = {
    communication: { cost: 0.5, duration: 60000 },
    research: { cost: 1.0, duration: 120000 },
    coding: { cost: 1.5, duration: 180000 },
    file_management: { cost: 0.3, duration: 30000 },
    monitoring: { cost: 0.1, duration: 15000 },
    scheduling: { cost: 0.2, duration: 30000 },
    browser: { cost: 1.0, duration: 120000 },
    system: { cost: 0.2, duration: 30000 },
    other: { cost: 0.5, duration: 60000 }
  };
  
  const breakdown = Object.entries(categoryData)
    .filter(([, data]) => data.count > 0)
    .map(([category, data]) => {
      const avgCost = data.costs.reduce((a, b) => a + b, 0) / data.count;
      const avgDuration = data.durations.reduce((a, b) => a + b, 0) / data.count;
      const bench = benchmarks[category as TaskCategory];
      
      const costScore = Math.min(100, (bench.cost / avgCost) * 100);
      const durationScore = Math.min(100, (bench.duration / avgDuration) * 100);
      const score = Math.round((costScore + durationScore) / 2);
      
      return {
        category: category as TaskCategory,
        score,
        avgCost,
        avgDuration,
        taskCount: data.count
      };
    })
    .sort((a, b) => b.taskCount - a.taskCount);
  
  const totalTasks = breakdown.reduce((sum, b) => sum + b.taskCount, 0);
  const overall = totalTasks > 0
    ? Math.round(breakdown.reduce((sum, b) => sum + b.score * b.taskCount, 0) / totalTasks)
    : 0;
  
  return { overall, breakdown };
}

export function getSpendingTrend(dailySummaries: DailySummary[]): {
  trend: 'increasing' | 'decreasing' | 'stable';
  percentChange: number;
} {
  if (dailySummaries.length < 3) {
    return { trend: 'stable', percentChange: 0 };
  }
  
  const recent = dailySummaries.slice(0, 3);
  const older = dailySummaries.slice(3, 6);
  
  if (older.length === 0) {
    return { trend: 'stable', percentChange: 0 };
  }
  
  const recentAvg = recent.reduce((sum, d) => sum + d.totalCost, 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + d.totalCost, 0) / older.length;
  
  const percentChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  
  if (percentChange > 20) return { trend: 'increasing', percentChange };
  if (percentChange < -20) return { trend: 'decreasing', percentChange };
  return { trend: 'stable', percentChange };
}
