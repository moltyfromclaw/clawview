import { createFileRoute } from '@tanstack/react-router'
import { getAllSessions, calculateDailySummaries } from '../../lib/parser'
import { extractTasks } from '../../lib/tasks'
import { generateInsights, calculateEfficiencyScore, getSpendingTrend } from '../../lib/insights'

export const Route = createFileRoute('/api/insights')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const sessions = getAllSessions();
          const tasks = extractTasks(sessions);
          const dailySummaries = calculateDailySummaries(sessions);
          
          const insights = generateInsights(tasks, dailySummaries);
          const efficiencyScore = calculateEfficiencyScore(tasks);
          const spendingTrend = getSpendingTrend(dailySummaries);

          return new Response(JSON.stringify({
            insights,
            efficiencyScore,
            spendingTrend,
            lastUpdated: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('Error generating insights:', error);
          return new Response(JSON.stringify({ error: 'Failed to generate insights' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
})
