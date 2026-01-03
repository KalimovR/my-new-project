import { Layout } from '@/components/layout/Layout';
import { Eye, Shield, Users, FileText } from 'lucide-react';

const values = [
  {
    icon: Eye,
    title: 'Прозрачность',
    description: 'Мы открыто говорим о своих источниках финансирования и редакционной политике.',
  },
  {
    icon: Shield,
    title: 'Независимость',
    description: 'Никакого корпоративного влияния. Редакция принимает решения самостоятельно.',
  },
  {
    icon: FileText,
    title: 'Факты',
    description: 'Каждый материал проходит проверку. Мы исправляем ошибки публично.',
  },
  {
    icon: Users,
    title: 'Для читателей',
    description: 'Мы работаем для вас, а не для рекламодателей или политических интересов.',
  },
];

const About = () => {
  return (
    <Layout>
      <div className="container mx-auto py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">О нас</h1>
            <p className="text-xl text-muted-foreground">
              Независимые новости и анализ без корпоративного влияния
            </p>
          </div>

          {/* Main Text */}
          <div className="prose prose-invert max-w-none mb-16">
            <p className="text-lg leading-relaxed text-foreground/90">
              <strong className="text-primary">«Контекст»</strong> — это независимое аналитическое издание, 
              созданное командой журналистов с опытом работы в ведущих российских и международных СМИ.
            </p>
            
            <p className="text-lg leading-relaxed text-foreground/90">
              Мы верим, что качественная журналистика — это не пересказ пресс-релизов и не погоня 
              за кликами. Это контекст, анализ и объяснение сложных событий простым языком.
            </p>

            <blockquote className="border-l-4 border-primary pl-6 py-4 my-8 bg-secondary/50 rounded-r-lg">
              <p className="text-xl italic text-foreground/90 mb-0">
                «Мы даём контекст, который другие скрывают»
              </p>
            </blockquote>

            <p className="text-lg leading-relaxed text-foreground/90">
              Наша редакция специализируется на экономике, технологиях, политике и расследованиях. 
              Мы не боимся задавать неудобные вопросы и публиковать материалы, которые другие 
              издания предпочитают замалчивать.
            </p>
          </div>

          {/* Values */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">Наши принципы</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="bg-card rounded-xl border border-border p-6 hover:border-primary/50 transition-colors"
                >
                  <value.icon className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Редакция</h2>
            <p className="text-muted-foreground mb-6">
              Команда «Контекст» — это журналисты, аналитики и исследователи с многолетним опытом. 
              Мы ценим профессионализм, точность и независимость суждений.
            </p>
            <p className="text-sm text-muted-foreground">
              По вопросам сотрудничества: <a href="mailto:kontekstnews@gmail.com" className="text-primary hover:underline">kontekstnews@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;
