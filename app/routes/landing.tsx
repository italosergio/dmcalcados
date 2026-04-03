import { Link } from 'react-router';
import { ArrowRight, ChevronDown, LayoutDashboard, ShoppingBag, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '~/contexts/AuthContext';
import { logout } from '~/services/auth.service';
import { useNavigate } from 'react-router';
import { useState, useRef, useEffect } from 'react';

export function meta() {
  return [
    { title: 'DM Calçados — Sandálias de Excelência para o seu Negócio' },
    { name: 'description', content: 'Fornecimento de sandálias em pacotes fechados para pequenos e médios comércios. Qualidade, preço justo e entrega confiável.' },
  ];
}

function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    window.location.href = '/';
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-content-secondary hover:text-content transition-colors"
      >
        Olá, {user?.nome?.split(' ')[0]}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border-subtle bg-surface py-1 shadow-lg z-[60]">
          <Link to="/vendas" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-content-secondary hover:bg-surface-hover hover:text-content transition-colors">
            <ShoppingBag size={15} />
            Vendas
          </Link>
          <Link to="/vendas/nova" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-content-secondary hover:bg-surface-hover hover:text-content transition-colors">
            <ShoppingBag size={15} />
            Nova Venda
          </Link>
          <Link to="/conta" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-content-secondary hover:bg-surface-hover hover:text-content transition-colors">
            <UserCircle size={15} />
            Conta
          </Link>
          <hr className="my-1 border-border-subtle" />
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-content-secondary hover:bg-red-600/10 hover:text-red-400 transition-colors">
            <LogOut size={15} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function HeaderAuth() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return user ? <UserMenu /> : null;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const logoClicks = useRef(0);
  const logoTimer = useRef<ReturnType<typeof setTimeout>>();
  const [logoShake, setLogoShake] = useState(false);

  // Konami: ↑↑↓↓
  const konamiSeq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown'];
  const konamiIndex = useRef(0);
  const konamiTimer = useRef<ReturnType<typeof setTimeout>>();

  // Swipe: detecta direção no touch
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeSeq = useRef<string[]>([]);
  const swipeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      clearTimeout(konamiTimer.current);
      if (e.key === konamiSeq[konamiIndex.current]) {
        konamiIndex.current++;
        if (konamiIndex.current >= konamiSeq.length) {
          konamiIndex.current = 0;
          navigate('/login');
        } else {
          konamiTimer.current = setTimeout(() => { konamiIndex.current = 0; }, 2000);
        }
      } else {
        konamiIndex.current = 0;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30) {
        clearTimeout(swipeTimer.current);
        swipeSeq.current.push(dy < 0 ? 'up' : 'down');
        if (swipeSeq.current.length >= 4) {
          const s = swipeSeq.current.slice(-4);
          if (s[0] === 'up' && s[1] === 'up' && s[2] === 'down' && s[3] === 'down') {
            swipeSeq.current = [];
            navigate('/login');
            return;
          }
        }
        swipeTimer.current = setTimeout(() => { swipeSeq.current = []; }, 2000);
      }
      touchStart.current = null;
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate]);

  const handleLogoClick = () => {
    if (user) {
      navigate('/vendas');
      return;
    }
    logoClicks.current++;
    setLogoShake(true);
    setTimeout(() => setLogoShake(false), 300);
    clearTimeout(logoTimer.current);
    if (logoClicks.current >= 3) {
      logoClicks.current = 0;
      navigate('/login');
    } else {
      logoTimer.current = setTimeout(() => { logoClicks.current = 0; }, 800);
    }
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/home-background.png)' }}>
      <div className="absolute inset-0 bg-black/60" />

      {/* Header */}
      <header className="relative z-20 px-6 sm:px-10 py-3">
        <div className="flex justify-end">
          <HeaderAuth />
        </div>
        <div className="flex flex-col items-center w-full">
          <img
            src="/logo-dmcalcados.png"
            alt="DM Calçados"
            className={`h-28 sm:h-40 w-auto object-contain cursor-pointer select-none transition-transform ${logoShake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}
            onClick={handleLogoClick}
          />
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-gold mt-1 text-center">Distribuidora Maranhense de Calçados</span>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-10 sm:-mt-16">
        <div className="max-w-2xl text-center">
          <h1 className="text-[2.5rem] sm:text-4xl lg:text-5xl font-bold leading-none mb-4">
            Sandálias que vendem fácil{' '}
            <br className="hidden sm:block" />
            <span className="text-content-secondary">no seu comércio</span>
          </h1>
          <p className="text-lg sm:text-base text-content-secondary leading-relaxed mb-8 max-w-lg mx-auto">
            As melhores marcas para o seu negócio.
            Preço justo, entrega confiável e parceria de verdade.
          </p>
          <a
            href="https://wa.me/5588981144905"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button group relative inline-flex items-center gap-3 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-[#1a1a1e] overflow-hidden"
          >
            <span className="cta-bg absolute inset-0" />
            <span className="cta-shine absolute inset-0" />
            <span className="relative z-10">Fale com a gente</span>
            <ArrowRight size={16} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </main>

      {/* Marcas */}
      <div className="relative z-10 flex items-center justify-center gap-6 px-6 -mt-4 opacity-50">
        <img src="/logo-rios-removebg-preview.png" alt="Rios" className="h-12 sm:h-16 w-auto invert brightness-75 transition-transform duration-300 hover:scale-125" />
        <img src="/logo-guaranhas-removebg-preview.png" alt="Guaranhas" className="h-12 sm:h-16 w-auto invert brightness-75 transition-transform duration-300 hover:scale-125" />
        <img src="/logo-jangada-removebg-preview.png" alt="Jangada" className="h-12 sm:h-16 w-auto invert brightness-75 transition-transform duration-300 hover:scale-125" />
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-6 sm:px-10 py-3 text-center">
        <p className="text-[10px] text-content-muted">
          CNPJ: 14.271.980/0001-71 · © {new Date().getFullYear()} DM Calçados - Distribuidora Maranhense de Calçados. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
