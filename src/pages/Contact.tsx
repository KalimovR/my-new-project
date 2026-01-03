import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Shield, CheckCircle, Upload, X, Lock, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const contactSchema = z.object({
  email: z.string().email('Некорректный email').max(255).optional().or(z.literal('')),
  message: z.string()
    .trim()
    .min(10, 'Сообщение должно быть минимум 10 символов')
    .max(5000, 'Сообщение слишком длинное (максимум 5000 символов)'),
});

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    message: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        file => file.size <= 5 * 1024 * 1024
      );
      setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = contactSchema.safeParse({
      email: anonymous ? '' : formData.email,
      message: formData.message,
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      // Upload files to storage
      const attachmentUrls: string[] = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('submission-attachments')
          .upload(fileName, file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('submission-attachments')
          .getPublicUrl(fileName);
        
        attachmentUrls.push(publicUrl);
      }

      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          email: anonymous ? null : formData.email || null,
          message: formData.message.trim(),
          is_anonymous: anonymous,
          attachments: attachmentUrls,
        });

      if (error) throw error;
      setSubmitted(true);
      setFiles([]);
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Ошибка при отправке. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="container mx-auto py-16 md:py-24">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-4">Спасибо!</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Мы получили вашу информацию и обязательно её проверим. 
              Если вы оставили email, мы свяжемся с вами при необходимости.
            </p>
            <Button onClick={() => setSubmitted(false)} size="lg" variant="outline" className="rounded-xl font-semibold">
              Отправить ещё
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">Сообщите важную информацию</h1>
            <p className="text-xl text-muted-foreground">
              Расскажите нам о коррупции, нарушениях или важных событиях
            </p>
          </div>

          {/* Security Notice - Orange themed */}
          <div className="bg-gradient-hero rounded-2xl p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white mb-1">Полная анонимность</h3>
                <p className="text-white/90">
                  Мы гарантируем защиту всех источников информации. Ваши данные 
                  не будут переданы третьим лицам без вашего явного согласия.
                </p>
              </div>
            </div>
          </div>

          {/* Form - Orange accent */}
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-6">
            {/* Anonymous Toggle */}
            <div className="flex items-center space-x-3 p-4 bg-secondary rounded-xl">
              <Checkbox
                id="anonymous"
                checked={anonymous}
                onCheckedChange={(checked) => setAnonymous(checked as boolean)}
                className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="anonymous" className="text-sm cursor-pointer font-medium">
                <Shield className="w-4 h-4 inline mr-2 text-primary" />
                Отправить анонимно
              </Label>
            </div>

            {/* Email (optional) */}
            {!anonymous && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="email">Email (необязательно)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-secondary border-border rounded-xl h-12"
                />
                <p className="text-xs text-muted-foreground">
                  Укажите, если хотите получить обратную связь
                </p>
              </div>
            )}

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Ваше сообщение *</Label>
              <Textarea
                id="message"
                placeholder="Опишите информацию, которой хотите поделиться. Чем больше деталей, тем лучше..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="bg-secondary border-border min-h-[200px] rounded-xl"
                required
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Прикрепить файлы (до 5 МБ каждый)</Label>
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/60 hover:bg-primary/5 transition-all duration-300 cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <span className="text-sm font-medium">
                    Нажмите для загрузки или перетащите файлы
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, DOC, TXT, JPG, PNG
                  </span>
                </label>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3"
                    >
                      <span className="text-sm truncate font-medium">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* reCAPTCHA placeholder */}
            <div className="bg-secondary rounded-xl p-4 text-center text-sm text-muted-foreground">
              [reCAPTCHA будет здесь]
            </div>

            {/* Submit - Orange button */}
            <Button type="submit" size="lg" disabled={submitting} className="w-full gap-2 h-14 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {submitting ? 'Отправка...' : 'Отправить информацию'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
            </p>
          </form>

          {/* Alternative Contact */}
          <div className="mt-12 pt-8 border-t border-border text-center">
            <h3 className="font-bold text-lg mb-3">Другие способы связи</h3>
            <p className="text-muted-foreground mb-2">
              Email редакции: <a href="mailto:kontekstru@gmail.com" className="text-primary hover:underline font-medium">kontekstru@gmail.com</a>
            </p>
            <p className="text-sm text-muted-foreground">
              Для защищённой связи используйте PGP или Signal
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
