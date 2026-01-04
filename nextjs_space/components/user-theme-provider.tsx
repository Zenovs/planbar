'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

interface UserThemeProviderProps {
  children: React.ReactNode;
}

const getBorderRadiusValue = (radius: string) => {
  switch (radius) {
    case 'none': return '0px';
    case 'small': return '4px';
    case 'medium': return '8px';
    case 'large': return '16px';
    default: return '8px';
  }
};

const getLayoutSpacing = (layout: string) => {
  switch (layout) {
    case 'compact': return { padding: '0.75rem', gap: '0.75rem' };
    case 'standard': return { padding: '1.5rem', gap: '1.5rem' };
    case 'spacious': return { padding: '2.5rem', gap: '2.5rem' };
    default: return { padding: '1.5rem', gap: '1.5rem' };
  }
};

export function UserThemeProvider({ children }: UserThemeProviderProps) {
  const { data: session } = useSession() || {};

  useEffect(() => {
    const loadTheme = async () => {
      if (session?.user) {
        try {
          // Load user's personal design settings with cache bypass
          const res = await fetch('/api/profile', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!res.ok) {
            throw new Error('Failed to load profile');
          }
          
          const data = await res.json();
          
          if (data.user) {
            const { 
              primaryColor, 
              secondaryColor, 
              accentColor,
              borderRadius,
              backgroundImage,
              backgroundImagePublic,
              layout 
            } = data.user;
            
            // Apply colors as CSS custom properties
            if (primaryColor) {
              document.documentElement.style.setProperty('--user-primary', primaryColor);
            }
            if (secondaryColor) {
              document.documentElement.style.setProperty('--user-secondary', secondaryColor);
            }
            if (accentColor) {
              document.documentElement.style.setProperty('--user-accent', accentColor);
            }

            // Apply border radius
            if (borderRadius) {
              const radiusValue = getBorderRadiusValue(borderRadius);
              document.documentElement.style.setProperty('--user-border-radius', radiusValue);
            }

            // Apply layout spacing
            if (layout) {
              const spacing = getLayoutSpacing(layout);
              document.documentElement.style.setProperty('--user-padding', spacing.padding);
              document.documentElement.style.setProperty('--user-gap', spacing.gap);
            }

            // Apply background image
            if (backgroundImage) {
              // Use the S3 URL directly
              const imageUrl = backgroundImage;
              
              document.body.style.backgroundImage = `linear-gradient(rgba(255,255,255,0.95), rgba(255,255,255,0.95)), url(${imageUrl})`;
              document.body.style.backgroundSize = 'cover';
              document.body.style.backgroundPosition = 'center';
              document.body.style.backgroundAttachment = 'fixed';
            } else {
              // Reset background
              document.body.style.backgroundImage = '';
            }
          }
        } catch (error) {
          console.error('Error loading user theme:', error);
          // Apply defaults on error
          applyDefaultTheme();
        }
      } else {
        // Reset to default design when logged out
        applyDefaultTheme();
      }
    };
    
    loadTheme();
  }, [session]);

  const applyDefaultTheme = () => {
    document.documentElement.style.setProperty('--user-primary', '#3b82f6');
    document.documentElement.style.setProperty('--user-secondary', '#8b5cf6');
    document.documentElement.style.setProperty('--user-accent', '#ec4899');
    document.documentElement.style.setProperty('--user-border-radius', '8px');
    document.documentElement.style.setProperty('--user-padding', '1.5rem');
    document.documentElement.style.setProperty('--user-gap', '1.5rem');
    document.body.style.backgroundImage = '';
  };

  return <>{children}</>;
}
