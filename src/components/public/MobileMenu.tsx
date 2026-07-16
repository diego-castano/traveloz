"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type SubItem = { href: string; label: string };
type Item = { href: string; label: string; submenu?: SubItem[] };

type Props = { items: Item[] };

/**
 * Mobile hamburger + nav drawer. Renders both the #menu-toggle and the
 * <nav id="menu"> so on desktop the nav stays visible (CSS shows it >991px),
 * and on mobile the toggle controls drawer + body lock.
 *
 * Class behaviour 1:1 with html_inicial main.js mobile menu code:
 *   - #menu-toggle.active           → hamburger morphs into X
 *   - nav#menu.active               → drawer slides in from right
 *   - body.active                   → overflow:hidden
 *   - .header-area.active           → header-side cosmetic state
 *   - li.has-submenu > a.active     → arrow rotates
 *   - li.has-submenu > ul.sub-menu.active → submenu visible
 */
export function MobileMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  // --- Destaca el item CORPORATIVO cuando estamos en esa sección (header
  // oscuro). Acotado a esa ruta puntual: el resto de las páginas no tienen
  // hoy un indicador de "activo" y no queremos sumarles uno de paso.
  const pathname = usePathname();
  const isCorporativoSection = pathname?.startsWith("/corporativo") ?? false;

  useEffect(() => {
    const body = document.body;
    const header = document.querySelector(".header-area");
    body.classList.toggle("active", open);
    header?.classList.toggle("active", open);
    return () => {
      body.classList.remove("active");
      header?.classList.remove("active");
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const closeAll = () => {
    setOpen(false);
    setOpenSubmenu(null);
  };

  return (
    <>
      <div className="mainmenu">
        <nav id="menu" className={open ? "active" : ""}>
          <ul>
            {items.map((item) => {
              const hasSub = !!item.submenu?.length;
              const subOpen = openSubmenu === item.label;
              const isCurrent =
                item.href === "/corporativo" && isCorporativoSection;
              return (
                <li
                  key={item.label}
                  className={hasSub ? "has-submenu small-submenu" : ""}
                >
                  {hasSub && (
                    <span
                      role="button"
                      aria-label={`Abrir submenú ${item.label}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setOpenSubmenu(subOpen ? null : item.label);
                      }}
                    />
                  )}
                  <a
                    href={item.href}
                    className={[
                      hasSub && subOpen ? "active" : "",
                      isCurrent ? "nav-current" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => closeAll()}
                  >
                    {item.label}
                  </a>
                  {hasSub && (
                    <ul className={`sub-menu ${subOpen ? "active" : ""}`}>
                      {item.submenu!.map((s) => (
                        <li key={s.href}>
                          <a href={s.href} onClick={() => closeAll()}>
                            {s.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <div
        id="menu-toggle"
        className={open ? "active" : ""}
        role="button"
        aria-label="Menú"
        aria-expanded={open}
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>
    </>
  );
}
