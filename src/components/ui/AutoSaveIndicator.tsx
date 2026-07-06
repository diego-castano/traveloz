'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2, Circle, RotateCw } from 'lucide-react';
import type { AutoSaveStatus } from '@/hooks/useAutoSave';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  // Si se pasa, en estado 'error' se muestra un botón "Reintentar". Sin esto el
  // indicador quedaba en rojo hasta la próxima edición, sin forma de reintentar.
  onRetry?: () => void;
}

const statusConfig = {
  saved: {
    icon: Check,
    label: 'Guardado',
    dotColor: '#3BBFAD',
    textColor: '#2A9E8E',
  },
  saving: {
    icon: Loader2,
    label: 'Guardando...',
    dotColor: '#E8A838',
    textColor: '#B8860B',
  },
  unsaved: {
    icon: Circle,
    label: 'Sin guardar',
    dotColor: '#B0B4CD',
    textColor: '#8A8DB5',
  },
  error: {
    icon: Circle,
    label: 'Error al guardar',
    dotColor: '#E74C5F',
    textColor: '#CC2030',
  },
};

export function AutoSaveIndicator({ status, onRetry }: AutoSaveIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const showRetry = status === 'error' && !!onRetry;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.3)',
        }}
        initial={{ opacity: 0, scale: 0.9, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <motion.div
          animate={status === 'saving' ? { rotate: 360 } : status === 'saved' ? { scale: [1, 1.3, 1] } : {}}
          transition={status === 'saving' ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0.3 }}
        >
          <Icon className="w-3 h-3" style={{ color: config.dotColor }} />
        </motion.div>
        <span className="text-[11px] font-medium" style={{ color: config.textColor }}>
          {config.label}
        </span>
        {showRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-[#CC2030] hover:bg-[#E74C5F]/10 transition-colors"
            title="Reintentar el guardado"
          >
            <RotateCw className="w-3 h-3" />
            Reintentar
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
