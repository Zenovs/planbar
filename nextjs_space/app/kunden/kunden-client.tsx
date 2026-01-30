'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  Mail,
  Phone,
  MapPin,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ChevronRight,
  Layers,
  FolderOpen,
  UserCircle,
  X,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  contactPerson: string | null;
  color: string;
  isActive: boolean;
  organization: { id: string; name: string };
  _count: { levels: number; projects: number };
}

interface Organization {
  id: string;
  name: string;
}

export default function KundenClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrg, setFilterOrg] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [processing, setProcessing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    contactPerson: '',
    color: '#3b82f6',
    organizationId: '',
  });

  const userRole = session?.user?.role?.toLowerCase() || '';
  const isAdmin = ['admin', 'administrator'].includes(userRole);

  useEffect(() => {
    loadCustomers();
    loadOrganizations();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations');
      const data = await res.json();
      if (res.ok) {
        const orgs: Organization[] = [];
        if (data.userOrganizations) {
          data.userOrganizations.forEach((org: Organization) => {
            orgs.push({ id: org.id, name: org.name });
          });
        } else if (data.organization) {
          orgs.push({ id: data.organization.id, name: data.organization.name });
        }
        setOrganizations(orgs);
        if (orgs.length === 1) {
          setFormData(prev => ({ ...prev, organizationId: orgs[0].id }));
        }
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Name ist erforderlich');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Kunde erfolgreich erstellt');
        setShowCreateModal(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          address: '',
          description: '',
          contactPerson: '',
          color: '#3b82f6',
          organizationId: organizations.length === 1 ? organizations[0].id : '',
        });
        loadCustomers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCustomer || !formData.name) {
      toast.error('Name ist erforderlich');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Kunde aktualisiert');
        setShowEditModal(false);
        setSelectedCustomer(null);
        loadCustomers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Aktualisieren');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Kunde "${customer.name}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Kunde gelöscht');
        loadCustomers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      description: customer.description || '',
      contactPerson: customer.contactPerson || '',
      color: customer.color,
      organizationId: customer.organization.id,
    });
    setShowEditModal(true);
  };

  // Gefilterte Kunden
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOrg = !filterOrg || customer.organization.id === filterOrg;
    const matchesActive = filterActive === 'all' || 
      (filterActive === 'active' && customer.isActive) ||
      (filterActive === 'inactive' && !customer.isActive);

    return matchesSearch && matchesOrg && matchesActive;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-7 h-7 text-blue-600" />
              Kunden
            </h1>
            <p className="text-gray-600 mt-1">Verwalten Sie Ihre Kunden und deren Projekte</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neuer Kunde
          </Button>
        </div>

        {/* Filter & Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Suchen nach Name, E-Mail, Ansprechpartner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {organizations.length > 1 && (
              <Select value={filterOrg} onValueChange={setFilterOrg}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Alle Unternehmen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle Unternehmen</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.length}</p>
                <p className="text-xs text-gray-500">Kunden</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.filter(c => c.isActive).length}</p>
                <p className="text-xs text-gray-500">Aktiv</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.reduce((sum, c) => sum + c._count.levels, 0)}</p>
                <p className="text-xs text-gray-500">Levels</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FolderOpen className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.reduce((sum, c) => sum + c._count.projects, 0)}</p>
                <p className="text-xs text-gray-500">Projekte</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kunden-Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Keine Kunden gefunden</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="outline"
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ersten Kunden anlegen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((customer) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/kunden/${customer.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: customer.color }}
                        >
                          {customer.name[0].toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{customer.name}</CardTitle>
                          <p className="text-xs text-gray-500">{customer.organization.name}</p>
                        </div>
                      </div>
                      <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                        {customer.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      {customer.contactPerson && (
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4" />
                          <span>{customer.contactPerson}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex gap-4 text-sm">
                        <span className="flex items-center gap-1 text-purple-600">
                          <Layers className="w-4 h-4" />
                          {customer._count.levels} Levels
                        </span>
                        <span className="flex items-center gap-1 text-blue-600">
                          <FolderOpen className="w-4 h-4" />
                          {customer._count.projects} Projekte
                        </span>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(customer)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(customer)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Kunden erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {organizations.length > 1 && (
              <div>
                <Label>Unternehmen</Label>
                <Select 
                  value={formData.organizationId} 
                  onValueChange={(v) => setFormData({ ...formData, organizationId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unternehmen auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Kundenname"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ansprechpartner</Label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <Label>Farbe</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-Mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="kunde@email.de"
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+49 123 456789"
                />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Straße, PLZ, Ort"
              />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optionale Beschreibung"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kunde bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ansprechpartner</Label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>
              <div>
                <Label>Farbe</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-Mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Abbrechen</Button>
            <Button onClick={handleUpdate} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
