'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Palette, Save, RotateCcw, Upload, X, Sparkles, Layout, Circle } from 'lucide-react';
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
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);

  useEffect(() => {
    loadDesignSettings();
  }, []);

  const loadDesignSettings = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          primaryColor: data.user.primaryColor || DEFAULT_SETTINGS.primaryColor,
          secondaryColor: data.user.secondaryColor || DEFAULT_SETTINGS.secondaryColor,
          accentColor: data.user.accentColor || DEFAULT_SETTINGS.accentColor,
          borderRadius: data.user.borderRadius || DEFAULT_SETTINGS.borderRadius,
          backgroundImage: data.user.backgroundImage || null,
          backgroundImagePublic: data.user.backgroundImagePublic ?? true,
          layout: data.user.layout || DEFAULT_SETTINGS.layout,
          designTemplate: data.user.designTemplate || DEFAULT_SETTINGS.designTemplate,
        });

        // Load background image preview if exists
        if (data.user.backgroundImage) {
          const imageUrl = await getImageUrl(data.user.backgroundImage, data.user.backgroundImagePublic);
          setBgImagePreview(imageUrl);
        }
      }
    } catch (error) {
      console.error('Error loading design settings:', error);
    }
  };

  const getImageUrl = async (path: string, isPublic: boolean) => {
    if (isPublic) {
      return `${process.env.NEXT_PUBLIC_S3_URL || ''}/${path}`;
    }
    // For private images, we would need a signed URL endpoint
    return path;
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
          fileName: file.name,
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
    setLoading(true);
    setUploadingBg(true);
    try {
      let backgroundImagePath = settings.backgroundImage;

      // Upload background image if selected
      if (bgImageFile) {
        const uploadedPath = await uploadBackgroundImage(bgImageFile);
        if (uploadedPath) {
          backgroundImagePath = uploadedPath;
        } else {
          throw new Error('Fehler beim Hochladen des Hintergrundbildes');
        }
      }

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          backgroundImage: backgroundImagePath,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      toast.success('Design erfolgreich gespeichert!');
      await update();
      router.refresh();
      
      // Force page reload to apply new design
      setTimeout(() => window.location.reload(), 500);
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Speichern');
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Design-Studio
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gestalten Sie planbar nach Ihrem Geschmack
              </p>
            </div>
          </div>

          {/* Templates Section */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Vordefinierte Templates
              </CardTitle>
              <CardDescription>
                Wählen Sie ein komplettes Design-Paket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {DESIGN_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className={`group relative overflow-hidden rounded-lg border-2 transition-all hover:scale-105 ${
                      settings.designTemplate === template.id
                        ? 'border-purple-500 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-purple-400'
                    }`}
                  >
                    <div className="aspect-square p-3 space-y-2" style={{ background: `linear-gradient(135deg, ${template.colors.primaryColor}, ${template.colors.secondaryColor})` }}>
                      <div className="text-4xl text-center">{template.preview}</div>
                    </div>
                    <div className="bg-white p-2 text-center">
                      <div className="font-semibold text-sm">{template.name}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Colors */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Farbpalette
                </CardTitle>
                <CardDescription>
                  Passen Sie die Hauptfarben an
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primärfarbe</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="primaryColor"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="h-12 w-12 rounded cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Sekundärfarbe</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="secondaryColor"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="h-12 w-12 rounded cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Akzentfarbe</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="accentColor"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="h-12 w-12 rounded cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Border Radius */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Circle className="w-5 h-5" />
                  Formen & Abrundungen
                </CardTitle>
                <CardDescription>
                  Eckig, abgerundet oder dazwischen?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {BORDER_RADIUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSettings({ ...settings, borderRadius: option.value })}
                      className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        settings.borderRadius === option.value
                          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{option.preview}</div>
                      <div className="text-sm font-semibold">{option.label}</div>
                    </button>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Layout */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    Layout-Dichte
                  </Label>
                  {LAYOUT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSettings({ ...settings, layout: option.value })}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all hover:scale-105 ${
                        settings.layout === option.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Background Image */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Hintergrundbild
              </CardTitle>
              <CardDescription>
                Laden Sie ein eigenes Hintergrundbild hoch (optional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bgImagePreview ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={bgImagePreview}
                      alt="Background preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={handleRemoveBackground}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Klicken Sie, um ein Bild hochzuladen</span>
                    <span className="text-xs text-gray-400 mt-1">Max. 5MB, JPEG/PNG</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBgImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle>Vorschau</CardTitle>
              <CardDescription>
                So wird Ihr Design aussehen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Buttons Preview */}
                <div className="flex gap-3 flex-wrap">
                  <div
                    className="px-6 py-3 font-semibold text-white"
                    style={{
                      background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`,
                      borderRadius: getBorderRadiusValue(settings.borderRadius),
                    }}
                  >
                    Primär-Button
                  </div>
                  <div
                    className="px-6 py-3 font-semibold text-white"
                    style={{
                      backgroundColor: settings.accentColor,
                      borderRadius: getBorderRadiusValue(settings.borderRadius),
                    }}
                  >
                    Akzent-Button
                  </div>
                </div>

                {/* Card Preview */}
                <div
                  className="p-6 text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                    borderRadius: getBorderRadiusValue(settings.borderRadius),
                  }}
                >
                  <h3 className="text-xl font-bold mb-2">Beispiel-Karte</h3>
                  <p className="opacity-90">Layout: {LAYOUT_OPTIONS.find(l => l.value === settings.layout)?.label}</p>
                  <p className="opacity-90">Abrundung: {BORDER_RADIUS_OPTIONS.find(b => b.value === settings.borderRadius)?.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
              style={{
                background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`,
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? (uploadingBg ? 'Wird hochgeladen...' : 'Speichern...') : 'Design speichern'}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={loading}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Zurücksetzen
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
