import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Temporärer Endpoint zum Setzen von Test-Rollen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    // Einfacher Schutz
    if (secret !== 'planbar2024setup') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const results: any[] = [];
    
    // Admin setzen
    const admin = await prisma.user.updateMany({
      where: { email: 'admin@test.de' },
      data: { role: 'admin' }
    });
    results.push({ email: 'admin@test.de', role: 'admin', updated: admin.count });
    
    // Projektleiter setzen
    const pl = await prisma.user.updateMany({
      where: { email: 'projektleiter@test.de' },
      data: { role: 'projektleiter' }
    });
    results.push({ email: 'projektleiter@test.de', role: 'projektleiter', updated: pl.count });
    
    // Koordinator setzen
    const coord = await prisma.user.updateMany({
      where: { email: 'koordinator@test.de' },
      data: { role: 'koordinator' }
    });
    results.push({ email: 'koordinator@test.de', role: 'koordinator', updated: coord.count });
    
    // Mitglied setzen
    const member = await prisma.user.updateMany({
      where: { email: 'mitglied@test.de' },
      data: { role: 'member' }
    });
    results.push({ email: 'mitglied@test.de', role: 'member', updated: member.count });
    
    // Liste aller Benutzer
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });
    
    return NextResponse.json({ 
      message: 'Test users updated',
      results,
      allUsers
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 });
  }
}
