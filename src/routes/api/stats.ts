import { createFileRoute } from '@tanstack/react-router'
import { getAllSessions, getOverallStats, calculateDailySummaries } from '../../lib/parser'

export const Route = createFileRoute('/api/stats')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const sessions = getAllSessions();
          const stats = getOverallStats(sessions);
          const dailySummaries = calculateDailySummaries(sessions);

          return new Response(JSON.stringify({
            stats,
            dailySummaries,
            lastUpdated: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('Error fetching stats:', error);
          return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
})
