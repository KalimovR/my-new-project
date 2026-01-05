import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Moon, Sun, User, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoImage from '@/assets/logo-pyramid.png';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PremiumChatsPanel } from '@/components/premium/PremiumChatsPanel';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navigation = [
  { name: 'Главная', href: '/' },
  { name: 'Новости', href: '/news' },
  { name: 'Аналитика', href: '/analytics' },
  { name: 'Мнения', href: '/opinions' },
  { name: 'Обсуждения', href: '/obsuzhdeniya' },
  { name: 'О нас', href: '/about' },
  { name: 'Контакты', href: '/contact' },
];

const getPageName = (pathname: string): string => {
  if (pathname === '/') return 'Главная';
  if (pathname.startsWith('/news')) return 'Новости';
  if (pathname.startsWith('/analytics')) return 'Аналитика';
  if (pathname.startsWith('/opinions')) return 'Мнения';
  if (pathname.startsWith('/obsuzhdeniya')) return 'Обсуждения';
  if (pathname.startsWith('/about')) return 'О нас';
  if (pathname.startsWith('/contact')) return 'Контакты';
  if (pathname.startsWith('/article')) return 'Статья';
  if (pathname.startsWith('/auth')) return 'Авторизация';
  if (pathname.startsWith('/admin')) return 'Админ-панель';
  if (pathname.startsWith('/profile')) return 'Личный кабинет';
  if (pathname.startsWith('/privacy')) return 'Конфиденциальность';
  return 'Страница';
};

export const Header = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, profile, isAdminOrEditor, signOut, isLoading } = useAuth();

  const currentPage = getPageName(location.pathname);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const toggleTheme = () => {
    const current =
      resolvedTheme ||
      theme ||
      (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light');

    setTheme(current === 'dark' ? 'light' : 'dark');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Block: Logo + Site Name + Current Section */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group">
              <img 
                src={logoImage} 
                alt="Контекст" 
                className="h-9 sm:h-12 w-auto transition-all duration-300 group-hover:scale-110 rounded-lg dark:mix-blend-screen mix-blend-multiply"
              />
              <span className="text-xl sm:text-2xl font-black tracking-tight">
                <span className="text-primary">К</span>онтекст
              </span>
            </Link>
            <span className="text-muted-foreground text-lg hidden md:inline">/</span>
            <span className="text-lg font-semibold text-foreground hidden md:inline">{currentPage}</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  isActive(item.href)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search, Theme Toggle & User Menu */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              {searchOpen ? (
                <form 
                  className="flex items-center gap-2 animate-fade-in"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }
                  }}
                >
                  <Input
                    type="search"
                    placeholder="Поиск статей..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 md:w-64 h-10 bg-secondary border-border rounded-xl"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </form>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* Theme Toggle - hidden on mobile, shown in burger */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl transition-all duration-200 hover:bg-primary/10 hover:text-primary hidden sm:flex"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 sm:h-5 sm:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 sm:h-5 sm:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* Notification Bell - only for logged in users */}
            {user && <NotificationBell />}

            {/* Premium Chats Panel */}
            {user && <PremiumChatsPanel />}

            {/* User Menu */}
            {!isLoading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary">
                        <User className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl">
                      <div className="px-3 py-2">
                        <p className="font-semibold">{profile?.display_name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-lg cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Личный кабинет
                      </DropdownMenuItem>
                      {isAdminOrEditor && (
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-lg cursor-pointer">
                          <Settings className="w-4 h-4 mr-2" />
                          Админ-панель
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="rounded-lg cursor-pointer text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Выйти
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    size="sm"
                    className="hidden sm:flex rounded-xl font-semibold bg-primary hover:bg-primary/90"
                    onClick={() => navigate('/auth')}
                  >
                    Войти
                  </Button>
                )}
              </>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex-shrink-0">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-80 bg-background border-border p-4 sm:p-6">
                {/* Mobile Search */}
                <form 
                  className="mt-2 mb-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.querySelector('input');
                    if (input?.value.trim()) {
                      navigate(`/search?q=${encodeURIComponent(input.value.trim())}`);
                    }
                  }}
                >
                  <Input
                    type="search"
                    placeholder="Поиск статей..."
                    className="bg-secondary border-border rounded-xl h-11"
                  />
                </form>

                {/* Theme Toggle in mobile menu */}
                <div className="flex items-center justify-between px-4 py-3 mb-4 bg-secondary/50 rounded-xl">
                  <span className="text-sm font-medium">Тема оформления</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-lg"
                    onClick={toggleTheme}
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                </div>
                
                <nav className="flex flex-col gap-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                        isActive(item.href)
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                  
                  {/* Mobile Auth */}
                  {!isLoading && !user && (
                    <Link
                      to="/auth"
                      className="px-4 py-3 text-base font-semibold rounded-xl bg-primary text-primary-foreground mt-4 text-center"
                    >
                      Войти
                    </Link>
                  )}
                  {!isLoading && user && (
                    <>
                      <div className="border-t border-border my-3" />
                      <Link
                        to="/profile"
                        className="px-4 py-3 text-base font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        Личный кабинет
                      </Link>
                      {isAdminOrEditor && (
                        <Link
                          to="/admin"
                          className="px-4 py-3 text-base font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          Админ-панель
                        </Link>
                      )}
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
