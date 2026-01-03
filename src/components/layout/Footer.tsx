import { Link, useNavigate } from 'react-router-dom';
import { Send, Twitter, Shield, Heart } from 'lucide-react';
import logoImage from '@/assets/logo-pyramid.png';

const footerLinks = [
  { name: 'О редакции', href: '/about' },
  { name: 'Контакты', href: '/contact' },
  { name: 'Реклама', href: '/contact' },
  { name: 'Политика конфиденциальности', href: '/privacy' },
];

const socialLinks = [
  { name: 'Telegram', icon: Send, href: 'https://t.me/TheContextRu' },
  { name: 'X (Twitter)', icon: Twitter, href: '#' },
];

export const Footer = () => {
  const navigate = useNavigate();

  const handleLinkClick = (href: string) => {
    navigate(href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="container mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 group">
              <img 
                src={logoImage} 
                alt="Контекст" 
                className="h-12 w-auto transition-all duration-300 group-hover:scale-110 rounded-lg dark:mix-blend-screen mix-blend-multiply"
              />
              <span className="text-2xl font-black">
                <span className="text-primary">К</span>онтекст
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Независимые новости и анализ. Мы даём контекст, который другие скрывают.
            </p>
            
            {/* Support CTA */}
            <button 
              onClick={() => handleLinkClick('/contact')}
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              <Heart className="w-4 h-4" />
              Поддержать редакцию
            </button>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-lg mb-4">Навигация</h4>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.name}>
                  <button
                    onClick={() => handleLinkClick(link.href)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-bold text-lg mb-4">Мы в соцсетях</h4>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
            
            {/* Privacy Notice */}
            <div className="mt-6 flex items-start gap-3 p-4 bg-secondary rounded-xl">
              <Shield className="w-5 h-5 flex-shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Мы защищаем вашу конфиденциальность и не передаём данные третьим лицам.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Контекст. Все права защищены.
            </p>
            <p className="text-xs text-muted-foreground">
              Мнения авторов могут не совпадать с позицией редакции.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
