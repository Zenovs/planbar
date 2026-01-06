'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Upload, Bell, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  imagePublic: boolean;
  role: string;
  emailNotifications: boolean;
}

export default function ProfileClient() {
  const { data: session, update } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/profile', {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setName(data.user.name || '');
        setEmail(data.user.email);
        setEmailNotifications(data.user.emailNotifications);
        setImagePreview(null);
        setImageFile(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Fehler beim Laden des Profils');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Datei zu groß. Maximale Größe: 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Nur Bilddateien sind erlaubt');
        return;
      }

      setImageFile(file);
      setHasChanges(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);

      // Get presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `profile-${Date.now()}-${file.name}`,
          contentType: file.type,
          isPublic: true,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error('Fehler beim Erstellen der Upload-URL');
      }

      const { uploadUrl, publicUrl } = await presignedRes.json();

      // Upload file to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Fehler beim Hochladen der Datei');
      }

      // Return the public URL directly (not cloud_storage_path)
      return publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Fehler beim Hochladen des Bildes');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    // Validate password fields
    if (newPassword) {
      if (!currentPassword) {
        toast.error('Bitte aktuelles Passwort eingeben');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('Neue Passwörter stimmen nicht überein');
        return;
      }
      if (newPassword.length < 6) {
        toast.error('Neues Passwort muss mindestens 6 Zeichen lang sein');
        return;
      }
    }

    setLoading(true);

    try {
      // Upload image if selected
      let imagePath = profile?.image || null;
      if (imageFile) {
        const uploadedPath = await uploadImage(imageFile);
        if (uploadedPath) {
          imagePath = uploadedPath;
        } else {
          throw new Error('Fehler beim Hochladen des Profilbildes');
        }
      }

      // Build update data
      const updateData: any = {
        name,
        email,
        emailNotifications,
      };

      // Always update image if a new file was uploaded
      if (imageFile && imagePath) {
        updateData.image = imagePath;
        updateData.imagePublic = true;
      }

      if (newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      // Update profile
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      // Success
      toast.success('Profil erfolgreich aktualisiert!');
      
      // Update session with new data
      if (update) {
        await update({
          ...session,
          user: {
            ...session?.user,
            name: data.user.name,
            email: data.user.email,
            image: data.user.image,
          }
        });
      }
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setImageFile(null);
      setImagePreview(null);
      setHasChanges(false);
      
      // Reload profile data
      await loadProfile();
      
      // Refresh the page to apply changes
      router.refresh();
    } catch (error: any) {
      console.error('Save profile error:', error);
      toast.error(error.message || 'Fehler beim Speichern des Profils');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Profil bearbeiten</CardTitle>
            <CardDescription>
              Verwalten Sie Ihre persönlichen Informationen und Einstellungen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture */}
            <div className="space-y-4">
              <Label>Profilbild</Label>
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage 
                    src={imagePreview || profile.image || undefined} 
                    alt={profile.name || 'User'}
                  />
                  <AvatarFallback className="text-lg">
                    {(profile.name || profile.email)?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={loading || uploadingImage}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={loading || uploadingImage}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingImage ? 'Hochladen...' : 'Bild hochladen'}
                  </Button>
                  <p className="text-sm text-gray-500 mt-1">Max. 5MB</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="w-4 h-4 inline mr-2" />
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="Ihr Name"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="w-4 h-4 inline mr-2" />
                E-Mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="ihre@email.de"
                disabled={loading}
              />
            </div>

            <Separator />

            {/* Password Change */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Passwort ändern
                </h3>
                {!showPasswordSection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordSection(true)}
                  >
                    Passwort ändern
                  </Button>
                )}
              </div>
              {showPasswordSection && (
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Neues Passwort</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notifications" className="cursor-pointer">
                  <Bell className="w-4 h-4 inline mr-2" />
                  E-Mail-Benachrichtigungen
                </Label>
                <p className="text-sm text-gray-500">
                  Erhalten Sie E-Mails bei Ticket-Updates
                </p>
              </div>
              <Switch
                id="notifications"
                checked={emailNotifications}
                onCheckedChange={(checked) => {
                  setEmailNotifications(checked);
                  setHasChanges(true);
                }}
                disabled={loading}
              />
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || uploadingImage}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Speichern...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Änderungen speichern
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
