'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Palette, Save, RotateCcw, Upload, X, Sparkles, Layout as LayoutIcon, Circle, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Image from 'next/image';
import { DESIGN_TEMPLATES, BORDER_RADIUS_OPTIONS, LAYOUT_OPTIONS, DesignTemplate } from './design-templates';

interface DesignSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borderRadius: string;
  backgroundImage: string | null;
  backgroundImagePublic: boolean;
  layout: string;
  designTemplate: string;
}

const DEFAULT_SETTINGS: DesignSettings = {
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  accentColor: '#ec4899',
  borderRadius: 'medium',
  backgroundImage: null,
  backgroundImagePublic: true,
  layout: 'standard',
  designTemplate: 'default',
};

export default function DesignClient() {
  const { data: session, update } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadDesignSettings();
  }, []);

  useEffect(() => {
    // Check if settings have changed
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings) || bgImageFile !== null;
    setHasChanges(changed);
  }, [settings, originalSettings, bgImageFile]);

  const loadDesignSettings = async () => {
    try {
      const res = await fetch('/api/profile', {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const loadedSettings = {
          primaryColor: data.user.primaryColor || DEFAULT_SETTINGS.primaryColor,
          secondaryColor: data.user.secondaryColor || DEFAULT_SETTINGS.secondaryColor,
          accentColor: data.user.accentColor || DEFAULT_SETTINGS.accentColor,
          borderRadius: data.user.borderRadius || DEFAULT_SETTINGS.borderRadius,
          backgroundImage: data.user.backgroundImage || null,
          backgroundImagePublic: data.user.backgroundImagePublic ?? true,
          layout: data.user.layout || DEFAULT_SETTINGS.layout,
          designTemplate: data.user.designTemplate || DEFAULT_SETTINGS.designTemplate,
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);

        // Load background image preview if exists
        if (data.user.backgroundImage) {
          // For S3 images, construct the URL based on public/private setting
          if (data.user.backgroundImagePublic) {
            setBgImagePreview(data.user.backgroundImage);
          } else {
            setBgImagePreview(data.user.backgroundImage);
          }
        }
      }
    } catch (error) {
      console.error('Error loading design settings:', error);
      toast.error('Fehler beim Laden der Design-Einstellungen');
    }
  };

  const handleBgImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bild ist zu groß (max. 5MB)');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Nur Bilddateien erlaubt');
      return;
    }

    setBgImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setBgImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadBackgroundImage = async (file: File) => {
    try {
      // Get presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `bg-${Date.now()}-${file.name}`,
          contentType: file.type,
          isPublic: settings.backgroundImagePublic,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error('Fehler beim Erstellen der Upload-URL');
      }

      const { uploadUrl, cloud_storage_path } = await presignedRes.json();

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Fehler beim Hochladen des Bildes');
      }

      return cloud_storage_path;
    } catch (error) {
      console.error('Background image upload error:', error);
      return null;
    }
  };

  const handleRemoveBackground = () => {
    setBgImageFile(null);
    setBgImagePreview(null);
    setSettings({ ...settings, backgroundImage: null });
  };

  const applyTemplate = (template: DesignTemplate) => {
    setSettings({
      ...settings,
      primaryColor: template.colors.primaryColor,
      secondaryColor: template.colors.secondaryColor,
      accentColor: template.colors.accentColor,
      borderRadius: template.borderRadius,
      layout: template.layout,
      designTemplate: template.id,
    });
    toast.success(`Template "${template.name}" angewendet`);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info('Keine Änderungen zum Speichern');
      return;
    }

    setLoading(true);
    try {
      let backgroundImagePath = settings.backgroundImage;

      // Upload background image if selected
      if (bgImageFile) {
        setUploadingBg(true);
        const uploadedPath = await uploadBackgroundImage(bgImageFile);
        if (uploadedPath) {
          backgroundImagePath = uploadedPath;
        } else {
          throw new Error('Fehler beim Hochladen des Hintergrundbildes');
        }
        setUploadingBg(false);
      }

      // Build update data
      const updateData = {
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        borderRadius: settings.borderRadius,
        backgroundImage: backgroundImagePath,
        backgroundImagePublic: settings.backgroundImagePublic,
        layout: settings.layout,
        designTemplate: settings.designTemplate,
      };

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
      toast.success('Design erfolgreich gespeichert!');
      
      // Update session
      if (update) {
        await update();
      }
      
      // Clear file state
      setBgImageFile(null);
      
      // Update original settings to match saved settings
      const newSettings = {
        ...settings,
        backgroundImage: backgroundImagePath,
      };
      setSettings(newSettings);
      setOriginalSettings(newSettings);
      setHasChanges(false);
      
      // Show reload message
      toast.info('Seite wird neu geladen, um Design anzuwenden...');
      
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Save design error:', error);
      toast.error(error.message || 'Fehler beim Speichern des Designs');
    } finally {
      setLoading(false);
      setUploadingBg(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setBgImageFile(null);
    setBgImagePreview(null);
    toast.info('Auf Standard-Design zurückgesetzt');
  };

  const getBorderRadiusValue = (radius: string) => {
    switch (radius) {
      case 'none': return '0px';
      case 'small': return '4px';
      case 'medium': return '8px';
      case 'large': return '16px';
      default: return '8px';
    }
  };

  return (
    <div 
      className="min-h-screen p-6"
      style={{
        background: bgImagePreview 
          ? `linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${bgImagePreview})`
          : 'linear-gradient(to br, rgb(249 250 251), rgb(255 255 255), rgb(243 244 246))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-6xl mx-auto">
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
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Design Studio</h1>
              <p className="text-gray-600">Personalisieren Sie Ihr Dashboard</p>
            </div>
          </div>

          {/* Template Gallery */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Design-Vorlagen
              </CardTitle>
              <CardDescription>
                Wählen Sie ein vorgefertigtes Design oder passen Sie es individuell an
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {DESIGN_TEMPLATES.map((template) => (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => applyTemplate(template)}
                    className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                      settings.designTemplate === template.id
                        ? 'border-blue-500 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${template.colors.primaryColor}, ${template.colors.secondaryColor})`,
                    }}
                  >
                    <div className="text-white">
                      <h3 className="font-semibold mb-1">{template.name}</h3>
                      <p className="text-xs text-white/80">{template.description}</p>
                    </div>
                    {settings.designTemplate === template.id && (
                      <div className="mt-2 flex items-center text-white text-sm">
                        <Check className="w-4 h-4 mr-1" />
                        Aktiv
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Colors */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Circle className="w-5 h-5" />
                Eigene Farben
              </CardTitle>
              <CardDescription>
                Definieren Sie Ihre individuellen Farben
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primärfarbe</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="flex-1"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Sekundärfarbe</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="flex-1"
                      placeholder="#8b5cf6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Akzentfarbe</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="w-20 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="flex-1"
                      placeholder="#ec4899"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
                <p className="text-sm font-medium mb-3">Vorschau:</p>
                <div className="flex gap-2">
                  <div
                    className="w-16 h-16 rounded-lg shadow-md"
                    style={{ backgroundColor: settings.primaryColor }}
                  />
                  <div
                    className="w-16 h-16 rounded-lg shadow-md"
                    style={{ backgroundColor: settings.secondaryColor }}
                  />
                  <div
                    className="w-16 h-16 rounded-lg shadow-md"
                    style={{ backgroundColor: settings.accentColor }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Layout & Style */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutIcon className="w-5 h-5" />
                Layout & Stil
              </CardTitle>
              <CardDescription>
                Passen Sie die Darstellung an
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Border Radius */}
              <div className="space-y-3">
                <Label>Ecken-Rundung</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {BORDER_RADIUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSettings({ ...settings, borderRadius: option.value })}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        settings.borderRadius === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{
                        borderRadius: getBorderRadiusValue(option.value),
                      }}
                    >
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.value}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Density */}
              <div className="space-y-3">
                <Label>Layout-Dichte</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {LAYOUT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSettings({ ...settings, layout: option.value })}
                      className={`p-4 border-2 rounded-lg transition-all text-left ${
                        settings.layout === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Background Image */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Hintergrundbild
              </CardTitle>
              <CardDescription>
                Laden Sie ein eigenes Hintergrundbild hoch (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bgImagePreview ? (
                <div className="relative">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden">
                    <Image
                      src={bgImagePreview}
                      alt="Background preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveBackground}
                    className="mt-2"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Entfernen
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-3">
                    Laden Sie ein Hintergrundbild hoch (max. 5MB)
                  </p>
                  <Input
                    id="bg-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBgImageSelect}
                    disabled={loading || uploadingBg}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('bg-upload')?.click()}
                    disabled={loading || uploadingBg}
                  >
                    {uploadingBg ? 'Hochladen...' : 'Bild auswählen'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Zurücksetzen
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || uploadingBg || !hasChanges}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              {loading || uploadingBg ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {uploadingBg ? 'Bild wird hochgeladen...' : 'Speichern...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Design speichern
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
