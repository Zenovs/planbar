import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Health check endpoint to verify database connection
export async function GET(req: NextRequest) {
  try {
    // Test basic database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if all required tables exist
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tableNames = tables.map((t: { table_name: string }) => t.table_name);
    
    const requiredTables = ['users', 'tickets', 'sub_tasks', 'categories', 'teams', 'notes'];
    const missingTables = requiredTables.filter((t: string) => !tableNames.includes(t));
    
    return NextResponse.json({
      status: 'ok',
      connected: true,
      tables: tableNames,
      missingTables,
      message: missingTables.length > 0 
        ? `Missing tables: ${missingTables.join(', ')}. Please run 'npx prisma db push' to sync.`
        : 'All required tables exist'
    });
  } catch (error: any) {
    console.error('Database health check failed:', error);
    return NextResponse.json({
      status: 'error',
      connected: false,
      error: error.message || 'Database connection failed',
      hint: 'Check DATABASE_URL environment variable and ensure database is accessible'
    }, { status: 500 });
  }
}
