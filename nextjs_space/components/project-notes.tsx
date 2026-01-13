'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Edit2, Trash2, Calendar, User, X, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

interface Note {
  id: string;
  title: string;
  content: string;
  noteDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface ProjectNotesProps {
  ticketId: string;
  currentUserId: string;
}

export function ProjectNotes({ ticketId, currentUserId }: ProjectNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteDate, setNoteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);

  // Notizen laden
  const loadNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notes?ticketId=${ticketId}`);
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setNotes(data);
    } catch (error) {
      console.error('Fehler beim Laden der Notizen:', error);
      toast.error('Notizen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [ticketId]);

  // Neue Notiz erstellen
  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Titel und Inhalt sind erforderlich');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          title,
          content,
          noteDate: new Date(noteDate).toISOString()
        })
      });

      if (!res.ok) throw new Error('Fehler beim Erstellen');
      
      const newNote = await res.json();
      setNotes(prev => [newNote, ...prev]);
      
      // Reset form
      setTitle('');
      setContent('');
      setNoteDate(format(new Date(), 'yyyy-MM-dd'));
      setIsAddDialogOpen(false);
      
      toast.success('Notiz erfolgreich erstellt');
    } catch (error) {
      console.error('Fehler beim Erstellen:', error);
      toast.error('Notiz konnte nicht erstellt werden');
    } finally {
      setSubmitting(false);
    }
  };

  // Notiz bearbeiten
  const handleEdit = async () => {
    if (!editingNote || !title.trim() || !content.trim()) {
      toast.error('Titel und Inhalt sind erforderlich');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          noteDate: new Date(noteDate).toISOString()
        })
      });

      if (!res.ok) throw new Error('Fehler beim Aktualisieren');
      
      const updatedNote = await res.json();
      setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
      
      setEditingNote(null);
      setIsEditDialogOpen(false);
      
      toast.success('Notiz erfolgreich aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      toast.error('Notiz konnte nicht aktualisiert werden');
    } finally {
      setSubmitting(false);
    }
  };

  // Notiz löschen
  const handleDelete = async (noteId: string) => {
    if (!confirm('Möchten Sie diese Notiz wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Fehler beim Löschen');
      
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Notiz erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Notiz konnte nicht gelöscht werden');
    }
  };

  // Dialog öffnen zum Hinzufügen
  const openAddDialog = () => {
    setTitle('');
    setContent('');
    setNoteDate(format(new Date(), 'yyyy-MM-dd'));
    setIsAddDialogOpen(true);
  };

  // Dialog öffnen zum Bearbeiten
  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setNoteDate(format(new Date(note.noteDate), 'yyyy-MM-dd'));
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Sitzungsnotizen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Sitzungsnotizen
            </CardTitle>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Neue Notiz
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Noch keine Notizen
              </h3>
              <p className="text-sm text-gray-500 mb-4 max-w-md">
                Dokumentieren Sie Sitzungen und Besprechungen direkt in planbar.
              </p>
              <Button onClick={openAddDialog} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Erste Notiz erstellen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {notes.map((note, index) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {note.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(note.noteDate), 'dd. MMM yyyy', { locale: de })}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {note.author.name || note.author.email}
                          </div>
                        </div>
                      </div>
                      
                      {/* Aktionen */}
                      {note.author.id === currentUserId && (
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => openEditDialog(note)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(note.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {note.content}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                      Erstellt: {format(new Date(note.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                      {new Date(note.updatedAt).getTime() !== new Date(note.createdAt).getTime() && (
                        <> • Bearbeitet: {format(new Date(note.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}</>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neue Sitzungsnotiz</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Titel der Sitzung *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Projektkickoff, Wochenmeet ing, Review..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Datum der Sitzung *
              </label>
              <Input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Notizen *
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Notizen, Beschlüsse, To-Dos, Teilnehmer..."
                className="min-h-[200px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsAddDialogOpen(false)}
              variant="outline"
              disabled={submitting}
            >
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notiz bearbeiten</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Titel der Sitzung *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Projektkickoff, Wochenmeeting, Review..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Datum der Sitzung *
              </label>
              <Input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Notizen *
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Notizen, Beschlüsse, To-Dos, Teilnehmer..."
                className="min-h-[200px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
              disabled={submitting}
            >
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
