'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Package, Plane, Hotel, Bus, ShieldCheck, Map, X } from 'lucide-react';
import { cn } from '@/components/lib/cn';
import { glassMaterials } from '@/components/lib/glass';
import { springs } from '@/components/lib/animations';
import { usePaquetes } from '@/components/providers/PackageProvider';
import { useAereos, useAlojamientos, useTraslados, useSeguros, useCircuitos } from '@/components/providers/ServiceProvider';

interface SearchResult {
  id: string;
  type: 'paquete' | 'aereo' | 'alojamiento' | 'traslado' | 'seguro' | 'circuito';
  title: string;
  subtitle: string;
  href: string;
}

const typeConfig = {
  paquete: { icon: Package, label: 'Paquetes', color: '#8B5CF6' },
  aereo: { icon: Plane, label: 'Aereos', color: '#3BBFAD' },
  alojamiento: { icon: Hotel, label: 'Alojamientos', color: '#E74C5F' },
  traslado: { icon: Bus, label: 'Traslados', color: '#6B8BAE' },
  seguro: { icon: ShieldCheck, label: 'Seguros', color: '#C69C6D' },
  circuito: { icon: Map, label: 'Circuitos', color: '#7C3AED' },
};

export function SearchModal() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [recents, setRecents] = React.useState<SearchResult[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Get all data from providers
  const paquetes = usePaquetes();
  const aereos = useAereos();
  const alojamientos = useAlojamientos();
  const traslados = useTraslados();
  const seguros = useSeguros();
  const circuitos = useCircuitos();

  // Cmd+K listener
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Build search results
  const results = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const matches: SearchResult[] = [];

    // Search paquetes
    paquetes.forEach(p => {
      if (
        p.titulo.toLowerCase().includes(q) ||
        p.destino.toLowerCase().includes(q)
      ) {
        matches.push({
          id: p.id,
          type: 'paquete',
          title: p.titulo,
          subtitle: `${p.destino} · ${p.estado}`,
          href: `/paquetes/${p.id}`,
        });
      }
    });

    // Search aereos
    aereos.forEach(a => {
      if (
        a.ruta.toLowerCase().includes(q) ||
        a.destino.toLowerCase().includes(q) ||
        (a.aerolinea ?? '').toLowerCase().includes(q)
      ) {
        matches.push({
          id: a.id,
          type: 'aereo',
          title: a.ruta,
          subtitle: `${a.aerolinea ?? ''} · ${a.destino}`,
          href: `/aereos/${a.id}`,
        });
      }
    });

    // Search alojamientos
    alojamientos.forEach(a => {
      if (a.nombre.toLowerCase().includes(q)) {
        matches.push({
          id: a.id,
          type: 'alojamiento',
          title: a.nombre,
          subtitle: `${a.categoria}\u2605`,
          href: `/alojamientos/${a.id}`,
        });
      }
    });

    // Search traslados
    traslados.forEach(t => {
      if (t.nombre.toLowerCase().includes(q)) {
        matches.push({
          id: t.id,
          type: 'traslado',
          title: t.nombre,
          subtitle: t.tipo,
          href: '/traslados',
        });
      }
    });

    // Search seguros
    seguros.forEach(s => {
      if (s.plan.toLowerCase().includes(q)) {
        matches.push({
          id: s.id,
          type: 'seguro',
          title: s.plan,
          subtitle: s.cobertura,
          href: '/seguros',
        });
      }
    });

    // Search circuitos
    circuitos.forEach(c => {
      if (c.nombre.toLowerCase().includes(q)) {
        matches.push({
          id: c.id,
          type: 'circuito',
          title: c.nombre,
          subtitle: `${c.noches} noches`,
          href: `/circuitos/${c.id}`,
        });
      }
    });

    return matches.slice(0, 12);
  }, [query, paquetes, aereos, alojamientos, traslados, seguros, circuitos]);

  // Reset selection when results change
  React.useEffect(() => setSelectedIndex(0), [results]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = results.length > 0 ? results : recents;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, items.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && items[selectedIndex]) {
      navigate(items[selectedIndex]);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  const navigate = (result: SearchResult) => {
    setRecents(prev => [result, ...prev.filter(r => r.id !== result.id)].slice(0, 5));
    setOpen(false);
    setQuery('');
    router.push(result.href);
  };

  const displayItems = results.length > 0 ? results : (query === '' ? recents : []);
  const grouped = displayItems.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-[300]"
                style={{ background: 'rgba(10,10,30,0.6)', backdropFilter: 'blur(10px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            {/* Centering wrapper — flex-based so Motion's transform animation
                doesn't conflict with Tailwind's translate classes. */}
            <div className="fixed inset-0 z-[310] flex items-start justify-center px-4 pt-[15vh] pointer-events-none">
            <Dialog.Content forceMount asChild>
              <motion.div
                className="pointer-events-auto w-full max-w-[580px] rounded-glass-lg overflow-hidden"
                style={{
                  ...glassMaterials.liquidModal,
                  border: '1px solid rgba(139,92,246,0.2)',
                }}
                initial={{ opacity: 0, scale: 0.92, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.95, y: -10, filter: 'blur(4px)' }}
                transition={springs.gentle}
                onKeyDown={handleKeyDown}
              >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                  <Search className="w-5 h-5 text-brand-teal-400 shrink-0" />
                  <Dialog.Title className="sr-only">Buscar</Dialog.Title>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar paquetes, aereos, hoteles..."
                    className="flex-1 bg-transparent text-white text-[15px] placeholder:text-neutral-400 outline-none"
                    autoFocus
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className="text-neutral-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-neutral-500 border border-neutral-700">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[360px] overflow-y-auto py-2">
                  {query && results.length === 0 && (
                    <div className="px-4 py-8 text-center text-neutral-400 text-sm">
                      Sin resultados para &ldquo;{query}&rdquo;
                    </div>
                  )}

                  {!query && recents.length > 0 && (
                    <div className="px-3 pb-1">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium px-1">
                        Recientes
                      </span>
                    </div>
                  )}

                  {Object.entries(grouped).map(([type, items]) => {
                    const config = typeConfig[type as keyof typeof typeConfig];
                    return (
                      <div key={type}>
                        {query && (
                          <div className="px-3 pt-2 pb-1">
                            <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium px-1">
                              {config.label}
                            </span>
                          </div>
                        )}
                        {items.map((item) => {
                          const globalIdx = displayItems.indexOf(item);
                          const isSelected = globalIdx === selectedIndex;
                          const Icon = config.icon;
                          return (
                            <motion.button
                              key={item.id}
                              onClick={() => navigate(item)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                                isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                              )}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: globalIdx * 0.03 }}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: `${config.color}20` }}
                              >
                                <Icon className="w-4 h-4" style={{ color: config.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white font-medium truncate">{item.title}</div>
                                <div className="text-xs text-neutral-400 truncate">{item.subtitle}</div>
                              </div>
                              {isSelected && (
                                <kbd className="text-[10px] text-neutral-500 border border-neutral-700 px-1 rounded">
                                  ↵
                                </kbd>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-white/10 text-[10px] text-neutral-500">
                  <span>↑↓ Navegar</span>
                  <span>↵ Abrir</span>
                  <span>ESC Cerrar</span>
                </div>
              </motion.div>
            </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
