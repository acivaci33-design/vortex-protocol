/**
 * VORTEX Protocol - Tailwind Configuration
 * Deep Void Theme with Glass Morphism and Neon Accents
 */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette - using CSS variables for theme switching
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        
        // Brand colors
        vortex: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        
        // Semantic colors
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          active: '#1d4ed8',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          active: '#4338ca',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#22c55e',
          hover: '#16a34a',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f59e0b',
          hover: '#d97706',
          foreground: '#000000',
        },
        danger: {
          DEFAULT: '#ef4444',
          hover: '#dc2626',
          foreground: '#ffffff',
        },
        
        // Surface colors - using CSS variables
        surface: {
          0: 'var(--bg-primary)',
          1: 'var(--bg-secondary)',
          2: 'var(--bg-tertiary)',
          3: 'var(--surface-3, #1f1f23)',
          4: 'var(--surface-4, #27272a)',
          5: 'var(--surface-5, #3f3f46)',
        },
        
        // Border colors - using CSS variables
        border: {
          DEFAULT: 'var(--border-color)',
          subtle: 'var(--border-subtle, #1f1f23)',
          strong: 'var(--border-strong, #3f3f46)',
          accent: '#3b82f6',
        },
        
        // Text colors - using CSS variables
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary, #71717a)',
          muted: 'var(--text-muted, #52525b)',
          inverse: 'var(--text-inverse, #09090b)',
        },
        
        // Status colors
        online: '#22c55e',
        away: '#f59e0b',
        busy: '#ef4444',
        offline: '#71717a',
      },
      
      boxShadow: {
        glow: '0 0 20px rgba(59, 130, 246, 0.4)',
        'glow-sm': '0 0 10px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.5)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(59, 130, 246, 0.1)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.5)',
        float: '0 4px 20px rgba(0, 0, 0, 0.3)',
      },
      
      backdropBlur: {
        xs: '2px',
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'mesh-gradient': 'linear-gradient(to bottom right, #0f0f12 0%, #09090b 50%, #0f0f12 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',
        'typing': 'typing 1s ease-in-out infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        typing: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.5)' },
        },
      },
      
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      borderRadius: {
        '4xl': '2rem',
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [],
};
