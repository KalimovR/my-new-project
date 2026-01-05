import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/seo/SEOHead';
import { useDiscussion, useDiscussionPosts, useDiscussionPoll } from '@/hooks/useDiscussions';
import { DiscussionPoll } from '@/components/discussions/DiscussionPoll';
import { DiscussionPostForm } from '@/components/discussions/DiscussionPostForm';
import { DiscussionPostCard } from '@/components/discussions/DiscussionPostCard';
import { HallOfFameSidebar } from '@/components/discussions/HallOfFameSidebar';
import { PremiumDiscussionLock } from '@/components/discussions/PremiumDiscussionLock';
import { AIRecommendations } from '@/components/premium/AIRecommendations';
import { ContentVotingSection } from '@/components/premium/ContentVotingCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, MessageCircle, Tag, Trophy, BookOpen, ChevronDown, ChevronRight, Eye, Lock, Crown, Sparkles } from 'lucide-react';
import { RoundTimer } from '@/components/discussions/RoundTimer';
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

const Discussion = () => {
  const { id } = useParams<{ id: string }>();
  const { data: discussion, isLoading: discussionLoading } = useDiscussion(id);
  const { data: posts, isLoading: postsLoading } = useDiscussionPosts(id);
  const { data: poll } = useDiscussionPoll(id);
  const [teaserExpanded, setTeaserExpanded] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const { profile } = useAuth();

  // Check if user is premium
  const isPremiumUser = profile?.is_premium === true;

  // Check for first-time premium welcome
  useEffect(() => {
    if (isPremiumUser) {
      const hasSeenWelcome = localStorage.getItem('premium_welcome_seen');
      if (!hasSeenWelcome) {
        setShowWelcomePopup(true);
        localStorage.setItem('premium_welcome_seen', 'true');
      }
    }
  }, [isPremiumUser]);

  // End date for round timer
  const endDate = discussion?.round_ends_at ? new Date(discussion.round_ends_at) : null;

  // Check if this is a premium discussion and user has no access
  const isPremiumLocked = discussion?.is_premium && !isPremiumUser;

  // Build nested structure - only top-level posts (no parent)
  const topLevelPosts = useMemo(() => {
    if (!posts) return [];
    return posts.filter(p => !p.parent_id);
  }, [posts]);

  // Top 5 posts by likes (any level)
  const topPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5);
  }, [posts]);

  // Get replies for a post
  const getReplies = (parentId: string) => {
    return posts?.filter(p => p.parent_id === parentId) || [];
  };

  // Truncate teaser - 4 lines on mobile (~60 words), 100 words on desktop
  const teaserWords = discussion?.teaser?.split(/\s+/) || [];
  const isTeaserLong = teaserWords.length > 60;
  const truncatedTeaser = isTeaserLong 
    ? teaserWords.slice(0, 60).join(' ') + '...'
    : discussion?.teaser;

  if (discussionLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-full max-w-2xl mb-8" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!discussion) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Обсуждение не найдено</h1>
          <Button asChild>
            <Link to="/obsuzhdeniya">Вернуться к обсуждениям</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title={`${discussion.title} — Обсуждения — Контекст`}
        description={discussion.teaser || 'Дискуссия на Контексте'}
      />

      {/* Premium Welcome Popup */}
      <Dialog open={showWelcomePopup} onOpenChange={setShowWelcomePopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shadow-md">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              Добро пожаловать в клуб Всевидящих!
            </DialogTitle>
            <DialogDescription className="text-center">
              Здесь споры без цензуры — заходи в премиум-темы и участвуй в эксклюзивных дискуссиях.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-primary" />
              <span>Безлимит реплик</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>Эксклюзивы</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Приоритет в топе</span>
            </div>
          </div>
          <Button 
            onClick={() => setShowWelcomePopup(false)}
            className="w-full mt-4 bg-gradient-to-r from-primary to-primary/80"
          >
            Понятно, спасибо!
          </Button>
        </DialogContent>
      </Dialog>

      {/* Main content with padding for sticky form on mobile */}
      <div className="container mx-auto px-4 py-6 sm:py-12 pb-48 md:pb-12">
        {/* Back link - smaller on mobile */}
        <Link
          to="/obsuzhdeniya"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-4 sm:mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Все обсуждения</span>
          <span className="sm:hidden">Назад</span>
        </Link>

        {/* Header - Mobile Optimized */}
        <div className="mb-4 sm:mb-6">
          {/* Premium indicator */}
          {discussion.is_premium && (
            <Badge className="mb-3 bg-gradient-to-r from-primary to-primary/80 text-white border-0 text-xs font-semibold px-2.5 py-1 gap-1.5">
              <div className="relative flex items-center">
                <Eye className="w-3.5 h-3.5" />
                <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" />
              </div>
              Премиум-дискуссия
            </Badge>
          )}

          {/* 1. QUESTION/TITLE - Large and prominent */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black mb-3 text-foreground leading-tight">
            {discussion.title}
          </h1>

          {/* 2. TIMER - Large progress bar with hint */}
          <div className="mb-4">
            <RoundTimer endDate={endDate} variant="large" />
          </div>

          {/* Replies count */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
            <MessageCircle className="w-4 h-4" />
            <span>{posts?.length || 0} реплик</span>
          </div>

          {/* Tags - compact on mobile */}
          {discussion.tags && discussion.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {discussion.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20 px-2 py-0.5">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* PREMIUM LOCK - Show lock for non-premium users */}
          {isPremiumLocked ? (
            <PremiumDiscussionLock teaser={discussion.teaser} title={discussion.title} />
          ) : (
            <>
              {/* 3. TEASER - Collapsed on mobile (4 lines max) */}
              {discussion.teaser && (
                <Collapsible open={teaserExpanded} onOpenChange={setTeaserExpanded}>
                  <div className="bg-card/50 border border-border/50 rounded-xl p-3 sm:p-4 mb-4">
                    <p className={`text-sm text-muted-foreground leading-relaxed ${!teaserExpanded && isTeaserLong ? 'line-clamp-4' : ''}`}>
                      {teaserExpanded || !isTeaserLong ? discussion.teaser : truncatedTeaser}
                    </p>
                    {isTeaserLong && (
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="mt-2 text-primary hover:text-primary/80 hover:bg-transparent p-0 h-auto text-sm font-medium">
                          {teaserExpanded ? 'Свернуть' : 'Читать далее'}
                          <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${teaserExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                </Collapsible>
              )}

              {/* 4. POLL - After teaser */}
              {poll && (
                <div className="mb-4">
                  <DiscussionPoll poll={poll} discussionId={discussion.id} />
                </div>
              )}

              {/* 5. TOP-5 on mobile - horizontal scroll */}
              {topPosts.length > 0 && (
                <div className="md:hidden mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm">Топ-5 реплик</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-yellow-500" />
                    <span>Попадите в топ-5 — получите месяц премиума бесплатно!</span>
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {topPosts.map((post, index) => (
                      <div 
                        key={post.id} 
                        className="flex-shrink-0 w-64 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : ''}
                            ${index === 1 ? 'bg-gray-400/20 text-gray-400' : ''}
                            ${index === 2 ? 'bg-amber-600/20 text-amber-600' : ''}
                            ${index > 2 ? 'bg-muted text-muted-foreground' : ''}
                          `}>
                            {index + 1}
                          </div>
                          <span className="text-xs font-medium text-foreground truncate">{post.author_name}</span>
                          <span className="text-xs text-green-500 ml-auto">👍 {post.likes}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3">{post.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Content area - only show for users with access */}
        {!isPremiumLocked && (
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Rules - Accordion */}
              <Accordion type="single" collapsible className="bg-card border border-border rounded-xl">
                <AccordionItem value="rules" className="border-none">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span className="font-semibold">Правила дискуссии</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        Максимум 300 слов (1000 для подписчиков)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        Аргументируйте фактами и логикой
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        Без оскорблений, спама и флуда
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        Топ-5 определяется лайками
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Desktop post form - hidden on mobile (sticky at bottom instead) */}
              <div className="hidden md:block">
                <DiscussionPostForm discussionId={discussion.id} />
              </div>

              {/* All posts with nesting */}
              {topLevelPosts.length > 0 && (
                <div>
                  <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    Реплики ({posts?.length || 0})
                  </h2>
                  <div className="space-y-3 sm:space-y-4">
                    {topLevelPosts.map((post) => (
                      <DiscussionPostCard 
                        key={post.id} 
                        post={post} 
                        discussionId={discussion.id}
                        replies={getReplies(post.id)}
                        allPosts={posts || []}
                        depth={0}
                      />
                    ))}
                  </div>
                </div>
              )}

              {postsLoading && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar - Fixed Top 5 - Hidden on mobile (shown above) */}
            <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start space-y-6">
              {/* Top 5 posts */}
              {topPosts.length > 0 && (
                <div className="bg-card border border-primary/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="font-bold">Топ-5 реплик</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-4 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-yellow-500" />
                    <span>Попадите в топ-5 — месяц премиума бесплатно!</span>
                  </p>
                  <div className="space-y-2.5">
                    {topPosts.map((post, index) => (
                      <div 
                        key={post.id} 
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                          ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : ''}
                          ${index === 1 ? 'bg-gray-400/20 text-gray-400' : ''}
                          ${index === 2 ? 'bg-amber-600/20 text-amber-600' : ''}
                          ${index > 2 ? 'bg-muted text-muted-foreground' : ''}
                        `}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{post.author_name}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{post.content}</p>
                          <span className="text-[10px] text-green-500">👍 {post.likes}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendations for premium users */}
              <AIRecommendations />

              {/* Content Voting for premium users */}
              <ContentVotingSection />

              {/* Hall of Fame */}
              <HallOfFameSidebar />
            </div>
          </div>
        )}
      </div>

      {/* STICKY POST FORM - Mobile only, hide for locked discussions */}
      {!isPremiumLocked && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border p-3 shadow-lg">
          <DiscussionPostForm discussionId={discussion.id} isMobile />
        </div>
      )}
    </Layout>
  );
};

export default Discussion;
