import { createFileRoute } from '@tanstack/react-router'
import { getAllSessions } from '../../lib/parser'
import { extractTasks, getTaskStats } from '../../lib/tasks'

export const Route = createFileRoute('/api/tasks')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limit = parseInt(url.searchParams.get('limit') || '100');
          const offset = parseInt(url.searchParams.get('offset') || '0');
          const category = url.searchParams.get('category');

          const sessions = getAllSessions();
          let tasks = extractTasks(sessions);
          
          // Filter by category if specified
          if (category && category !== 'all') {
            tasks = tasks.filter(t => t.category === category);
          }
          
          const stats = getTaskStats(tasks);
          
          // Paginate
          const paginatedTasks = tasks.slice(offset, offset + limit);

          return new Response(JSON.stringify({
            tasks: paginatedTasks.map(t => ({
              ...t,
              startTime: t.startTime.toISOString(),
              endTime: t.endTime.toISOString()
            })),
            stats,
            total: tasks.length,
            limit,
            offset
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('Error fetching tasks:', error);
          return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
})
