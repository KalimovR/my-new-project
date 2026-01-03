import { Layout } from '@/components/layout/Layout';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

const Privacy = () => {
  return (
    <Layout>
      <div className="container mx-auto py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Политика конфиденциальности</h1>
            <p className="text-muted-foreground">
              Последнее обновление: 2 января 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert dark:prose-invert max-w-none space-y-8">
            <section className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-start gap-4">
                <Lock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-bold mb-3">Сбор данных</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Мы собираем минимум данных, необходимых для работы сайта. 
                    Мы не продаём и не передаём ваши персональные данные третьим лицам 
                    без вашего явного согласия.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-start gap-4">
                <Eye className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-bold mb-3">Аналитика</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Мы используем аналитические инструменты для понимания того, 
                    как пользователи взаимодействуют с сайтом. Эти данные анонимизированы 
                    и используются исключительно для улучшения качества контента.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-start gap-4">
                <FileText className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-bold mb-3">Cookies</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Сайт использует файлы cookie для сохранения ваших настроек 
                    (например, выбор темы оформления) и обеспечения корректной работы. 
                    Вы можете отключить cookies в настройках браузера.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-bold mb-3">Защита источников</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Мы гарантируем полную конфиденциальность всех источников информации. 
                    Данные, отправленные через форму обратной связи, защищены и доступны 
                    только редакции.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Contact */}
          <div className="mt-12 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              По вопросам конфиденциальности: <a href="mailto:kontekstru@gmail.com" className="text-primary hover:underline">kontekstru@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;
